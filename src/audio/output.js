// Audio output and routing module

export function createAudioOutput(audioContext, mediaStream) {
  const sourceNode = audioContext.createMediaStreamSource(mediaStream);

  async function connect(analyser) {
    // Route to destination (playback)
    try {
      if (sourceNode && audioContext.destination) {
        sourceNode.connect(audioContext.destination);
      }
    } catch(e) {}
    
    // Tap analyser for visualization
    try {
      sourceNode.connect(analyser);
    } catch(e) {}
  }

  function disconnect() {
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch(e) {}
    }
  }

  return { connect, disconnect, get source() { return sourceNode; } };
}
