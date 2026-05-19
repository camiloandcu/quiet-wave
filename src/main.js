import { createControls } from './ui/controls.js';
import { createAudioInput } from './audio/input.js';
import { createAudioProcessor } from './audio/processor.js';
import { createAudioOutput } from './audio/output.js';
import { createWaveformRenderer } from './visualization/waveform.js';
import { createSpectrumRenderer } from './visualization/spectrum.js';

const controls = createControls('startStop', 'status');
const audioInput = createAudioInput();

let audioContext = null;
let processor = null;
let audioOutput = null;
let waveformRenderer = null;
let spectrumRenderer = null;
let isRunning = false;
let rafId = null;
let currentMix = 0;

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

async function startMonitoring() {
  try {
    controls.setStatus('Starting...');
    const stream = await audioInput.requestPermission();

    const ctx = ensureAudioContext();
    if (ctx.resume) await ctx.resume();

    processor = createAudioProcessor(ctx);
    audioOutput = createAudioOutput(ctx, stream);
    await audioOutput.connect(processor.getAnalyser());

    // Initialize mix and UI
    audioOutput.setMixRatio(0);
    controls.setMixValue(0);

    controls.onEffectToggle((enabled) => {
      audioOutput.setEffectEnabled(enabled);
      controls.setModeLabel(enabled ? Math.round(currentMix * 100) + '%' : 'Bypass');
    });

    controls.onMixChange((v) => {
      currentMix = v;
      audioOutput.setMixRatio(v);
      controls.setMixValue(v);
    });

    waveformRenderer = createWaveformRenderer(document.getElementById('waveform'));
    spectrumRenderer = createSpectrumRenderer(document.getElementById('spectrum'));

    isRunning = true;
    controls.setStatus('Running');
    startVisualization();
  } catch (err) {
    isRunning = false;
    if (err && err.name === 'NotAllowedError') {
      controls.setStatus('Permission denied');
    } else if (err && err.name === 'NotFoundError') {
      controls.setStatus('No microphone');
    } else if (err.message.includes('getUserMedia')) {
      controls.setStatus('Unsupported');
    } else {
      controls.setStatus('Start failed');
    }
  }
}

function stopMonitoring() {
  isRunning = false;
  controls.setStatus('Ready');

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (audioOutput) {
    audioOutput.disconnect();
    audioOutput = null;
  }

  if (processor) {
    processor = null;
  }

  audioInput.stop();

  if (audioContext && audioContext.suspend) {
    audioContext.suspend().catch(() => {});
  }
}

function startVisualization() {
  function draw() {
    if (!isRunning || !processor) return;

    const timeData = processor.getTimeDomainData();
    const freqData = processor.getFrequencyData();

    waveformRenderer.draw(timeData);
    spectrumRenderer.draw(freqData);

    rafId = requestAnimationFrame(draw);
  }

  rafId = requestAnimationFrame(draw);
}

controls.onStartClick(async () => {
  if (!isRunning) {
    await startMonitoring();
    controls.setButtonText('Stop');
  } else {
    stopMonitoring();
    controls.setButtonText('Start');
  }
});

window.addEventListener('beforeunload', () => {
  stopMonitoring();
});
