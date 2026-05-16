export function createAudioController({ audioContextFactory = () => new (window.AudioContext || window.webkitAudioContext)(), navigatorObj = navigator, setStatus = () => {} } = {}) {
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let mediaStream = null;
  const state = {
    isRunning: false,
    hasPermission: false,
    audioLevel: 0,
    deviceStatus: 'ready'
  };

  function ensureAudioContext() {
    if (!audioCtx) audioCtx = audioContextFactory();
    return audioCtx;
  }

  async function startMonitoring() {
    if (!navigatorObj.mediaDevices || !navigatorObj.mediaDevices.getUserMedia) {
      setStatus('Unsupported');
      return;
    }

    setStatus('Starting...');
    try {
      mediaStream = await navigatorObj.mediaDevices.getUserMedia({ audio: true });
      state.hasPermission = true;
    } catch (err) {
      state.isRunning = false;
      if (err && err.name === 'NotAllowedError') {
        setStatus('Permission denied');
      } else if (err && err.name === 'NotFoundError') {
        setStatus('No microphone');
      } else {
        setStatus('Start failed');
      }
      return;
    }

    try {
      const ctx = ensureAudioContext();
      if (ctx.resume) await ctx.resume();
      sourceNode = ctx.createMediaStreamSource(mediaStream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      // Minimal processing: direct playback and tap analyser
      if (sourceNode && ctx.destination) {
        try { sourceNode.connect(ctx.destination); } catch(e){}
      }
      try { sourceNode.connect(analyser); } catch(e){}

      state.isRunning = true;
      setStatus('Running');
      return;
    } catch (err) {
      setStatus('Audio start failed');
      return;
    }
  }

  function stopMonitoring() {
    state.isRunning = false;
    setStatus('Ready');

    if (sourceNode) {
      try { sourceNode.disconnect(); } catch(e){}
      sourceNode = null;
    }

    if (analyser) {
      try { analyser.disconnect(); } catch(e){}
      analyser = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop && t.stop());
      mediaStream = null;
    }

    if (audioCtx && audioCtx.suspend) {
      audioCtx.suspend().catch(()=>{});
    }
  }

  return { startMonitoring, stopMonitoring, state, _internal: { get audioCtx(){ return audioCtx }, get analyser(){ return analyser } } };
}
