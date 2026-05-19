// Audio output and routing module with phase inversion and mixing

export function createAudioOutput(audioContext, mediaStream) {
  const sourceNode = audioContext.createMediaStreamSource(mediaStream);

  // Branch gains
  const origMixGain = audioContext.createGain();
  const inverter = audioContext.createGain(); inverter.gain.value = -1;
  const invMixGain = audioContext.createGain();

  // Final output gain (safety)
  const destinationGain = audioContext.createGain(); destinationGain.gain.value = 1;

  // Connect graph lazily in connect()

  let connected = false;

  async function connect(analyser) {
    if (connected) return;

    try {
      // Source -> original branch
      sourceNode.connect(origMixGain);
      origMixGain.connect(destinationGain);

      // Source -> inverter -> inverted branch
      sourceNode.connect(inverter);
      inverter.connect(invMixGain);
      invMixGain.connect(destinationGain);

      // Destination -> audio output
      destinationGain.connect(audioContext.destination);

      // Tap analyser on final mixed output if provided
      if (analyser) {
        destinationGain.connect(analyser);
      }

      connected = true;
    } catch (e) {
      console.warn('connect error', e);
    }
  }

  function disconnect() {
    try { sourceNode.disconnect(); } catch(e) {}
    try { origMixGain.disconnect(); } catch(e) {}
    try { inverter.disconnect(); } catch(e) {}
    try { invMixGain.disconnect(); } catch(e) {}
    try { destinationGain.disconnect(); } catch(e) {}
    connected = false;
  }

  // Smoothly set mix ratio: value 0..1. orig = 1 - v, inv = v
  function setMixRatio(value, smoothTime = 0.02) {
    const now = audioContext.currentTime;
    const clamped = Math.max(0, Math.min(1, value));
    try {
      origMixGain.gain.cancelScheduledValues(now);
      invMixGain.gain.cancelScheduledValues(now);
      origMixGain.gain.setValueAtTime(origMixGain.gain.value || 1, now);
      invMixGain.gain.setValueAtTime(invMixGain.gain.value || 0, now);
      origMixGain.gain.linearRampToValueAtTime(1 - clamped, now + smoothTime);
      invMixGain.gain.linearRampToValueAtTime(clamped, now + smoothTime);
    } catch (e) {
      // Fallback
      origMixGain.gain.value = 1 - clamped;
      invMixGain.gain.value = clamped;
    }
  }

  function setEffectEnabled(enabled) {
    // If disabled, ramp inv gain to 0 and orig to 1
    setMixRatio(enabled ? (invMixGain.gain.value || 0.5) : 0);
  }

  function getNodes() {
    return { sourceNode, origMixGain, inverter, invMixGain, destinationGain };
  }

  return { connect, disconnect, setMixRatio, setEffectEnabled, getNodes, get source() { return sourceNode; } };
}
