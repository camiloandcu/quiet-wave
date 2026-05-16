// Microphone input capture module

export function createAudioInput(navigatorObj = navigator) {
  let mediaStream = null;

  async function requestPermission() {
    if (!navigatorObj.mediaDevices || !navigatorObj.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }
    mediaStream = await navigatorObj.mediaDevices.getUserMedia({ audio: true });
    return mediaStream;
  }

  function getStream() {
    return mediaStream;
  }

  function stop() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop && t.stop());
      mediaStream = null;
    }
  }

  return { requestPermission, getStream, stop };
}
