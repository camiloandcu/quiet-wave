// Audio analysis and processing module

export function createAudioProcessor(audioContext) {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  function getAnalyser() {
    return analyser;
  }

  function getFrequencyData() {
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    return freqData;
  }

  function getTimeDomainData() {
    const timeData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeData);
    return timeData;
  }

  return { getAnalyser, getFrequencyData, getTimeDomainData };
}
