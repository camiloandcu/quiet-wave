import { createAudioController } from './app.js';

const startBtn = document.getElementById('startStop');
const statusBadge = document.getElementById('status');
const waveformCanvas = document.getElementById('waveform');
const spectrumCanvas = document.getElementById('spectrum');

const wfCtx = waveformCanvas.getContext('2d');
const spCtx = spectrumCanvas.getContext('2d');

function setStatus(text) {
  statusBadge.textContent = text;
}

const controller = createAudioController({ setStatus });

startBtn.addEventListener('click', async () => {
  if (!controller.state.isRunning) {
    await controller.startMonitoring();
    startBtn.textContent = 'Stop';
    startDrawLoop();
  } else {
    controller.stopMonitoring();
    startBtn.textContent = 'Start';
  }
});

function startDrawLoop() {
  const analyser = controller._internal.analyser;
  if (!analyser) return;
  const bufferLen = analyser.fftSize || 2048;
  const timeData = new Float32Array(bufferLen);
  const freqLen = analyser.frequencyBinCount || (bufferLen/2);
  const freqData = new Uint8Array(freqLen);

  function draw() {
    if (!controller.state.isRunning || !controller._internal.analyser) return;
    analyser.getFloatTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);
    drawWaveform(timeData);
    drawSpectrum(freqData);
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

function drawWaveform(timeData) {
  const cw = waveformCanvas.width = waveformCanvas.clientWidth * devicePixelRatio;
  const ch = waveformCanvas.height = waveformCanvas.clientHeight * devicePixelRatio;
  wfCtx.clearRect(0,0,cw,ch);
  wfCtx.lineWidth = 2 * devicePixelRatio;
  wfCtx.strokeStyle = '#08f1c4';
  wfCtx.beginPath();
  const step = Math.max(1, Math.floor(timeData.length / cw));
  let x = 0;
  for (let i=0;i<timeData.length;i+=step) {
    const v = timeData[i] * 0.8;
    const y = (1 + v) * ch/2;
    if (i===0) wfCtx.moveTo(x,y); else wfCtx.lineTo(x,y);
    x += 1;
  }
  wfCtx.stroke();
}

function drawSpectrum(freqData) {
  const cw = spectrumCanvas.width = spectrumCanvas.clientWidth * devicePixelRatio;
  const ch = spectrumCanvas.height = spectrumCanvas.clientHeight * devicePixelRatio;
  spCtx.clearRect(0,0,cw,ch);
  const barWidth = Math.max(1, Math.floor(cw / freqData.length));
  for (let i=0;i<freqData.length;i++) {
    const v = freqData[i] / 255;
    const h = v * ch;
    const x = i * barWidth;
    spCtx.fillStyle = `hsl(${i/freqData.length*240},90%,60%)`;
    spCtx.fillRect(x, ch - h, barWidth-1, h);
  }
}

window.addEventListener('beforeunload', ()=>{
  controller.stopMonitoring();
});
