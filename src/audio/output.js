// Audio output and routing module with phase inversion and mixing
// Diagram:
// sourceNode -> origBranch -> origAnalyser \
//            -> inverter -> invBranch -> invAnalyser  -> normalizationGain -> destination + masterAnalyser
//
// The two branches (original and inverted) are both connected to the same destination node.
// Web Audio API automatically mixes them at the destination.

export function createAudioOutput(audioContext, mediaStream) {
  let sourceNode = null;

  // Original branch
  const origBranch = audioContext.createGain();
  origBranch.gain.value = 0.5; // Start at 0.5 to leave room for inversion mix

  // Inversion branch: gain(-1) inverter node
  const inverter = audioContext.createGain();
  inverter.gain.value = -1; // Phase inversion

  const invBranch = audioContext.createGain();
  invBranch.gain.value = 0; // Start at 0 (no inversion until user enables)

  // Separate analysers to show original and inverted signals
  const origAnalyser = audioContext.createAnalyser();
  origAnalyser.fftSize = 2048;
  origAnalyser.smoothingTimeConstant = 0.8;

  const invAnalyser = audioContext.createAnalyser();
  invAnalyser.fftSize = 2048;
  invAnalyser.smoothingTimeConstant = 0.8;

  // Master analyser (final mixed output)
  const masterAnalyser = audioContext.createAnalyser();
  masterAnalyser.fftSize = 2048;
  masterAnalyser.smoothingTimeConstant = 0.8;

  // Final output normalization and safety (0.8 to prevent clipping)
  const normalizationGain = audioContext.createGain();
  normalizationGain.gain.value = 0.8;

  let connected = false;

  async function connect(newMediaStream) {
    if (connected) return;

    try {
      // Recreate sourceNode with the provided (or original) stream
      if (!newMediaStream) newMediaStream = mediaStream;
      sourceNode = audioContext.createMediaStreamSource(newMediaStream);

      // Initialize gains to correct state (no inversion active initially)
      origBranch.gain.value = 1.0;  // Full original signal
      invBranch.gain.value = 0;      // No inversion initially

      // Original signal path: source -> origBranch -> origAnalyser -> normalizationGain
      sourceNode.connect(origBranch);
      origBranch.connect(origAnalyser);
      origAnalyser.connect(normalizationGain);

      // Inversion signal path: source -> inverter -> invBranch -> invAnalyser -> normalizationGain
      sourceNode.connect(inverter);
      inverter.connect(invBranch);
      invBranch.connect(invAnalyser);
      invAnalyser.connect(normalizationGain);

      // Final output: normalizationGain -> destination (playback) + masterAnalyser (visualization)
      normalizationGain.connect(masterAnalyser);
      normalizationGain.connect(audioContext.destination);

      connected = true;
    } catch (e) {
      console.warn('connect error', e);
    }
  }

  function disconnect() {
    try { if (sourceNode) sourceNode.disconnect(); } catch(e) {}
    try { origBranch.disconnect(); } catch(e) {}
    try { inverter.disconnect(); } catch(e) {}
    try { invBranch.disconnect(); } catch(e) {}
    try { normalizationGain.disconnect(); } catch(e) {}
    try { origAnalyser.disconnect(); } catch(e) {}
    try { invAnalyser.disconnect(); } catch(e) {}
    try { masterAnalyser.disconnect(); } catch(e) {}
    sourceNode = null;
    connected = false;
  }

  // setMixRatio: 0 = all original, 1 = full inversion mix
  // We scale the two branches such that orig + inv stays roughly constant amplitude
  function setMixRatio(value, smoothTime = 0.05) {
    const now = audioContext.currentTime;
    const clamped = Math.max(0, Math.min(1, value));

    // When clamped = 0: origBranch=1.0, invBranch=0
    // When clamped = 1: origBranch=0.5, invBranch=0.5 (equal mix, max cancellation)
    // This way we avoid clipping and smoothly transition to inversion
    const origGain = 1.0 - clamped * 0.5;  // 1.0 -> 0.5
    const invGain = clamped * 0.5;          // 0 -> 0.5

    try {
      origBranch.gain.cancelScheduledValues(now);
      invBranch.gain.cancelScheduledValues(now);
      origBranch.gain.setValueAtTime(origBranch.gain.value, now);
      invBranch.gain.setValueAtTime(invBranch.gain.value, now);
      origBranch.gain.linearRampToValueAtTime(origGain, now + smoothTime);
      invBranch.gain.linearRampToValueAtTime(invGain, now + smoothTime);
    } catch (e) {
      origBranch.gain.value = origGain;
      invBranch.gain.value = invGain;
    }
  }

  function setEffectEnabled(enabled) {
    // If disabled: origBranch=1, invBranch=0
    // If enabled: keep current mix ratio
    if (!enabled) {
      setMixRatio(0);
    }
  }

  function getNodes() {
    return { sourceNode, origBranch, inverter, invBranch, normalizationGain };
  }

  function getAnalysers() {
    return { origAnalyser, invAnalyser, masterAnalyser };
  }

  return {
    connect,
    disconnect,
    setMixRatio,
    setEffectEnabled,
    getNodes,
    getAnalysers,
    get source() { return sourceNode; }
  };
}
