import { analyzeAudioBuffer } from './audio-analysis.js';
import { createComparisonFigureRenderer } from '../visualization/comparison.js';

function decodeAudioData(audioContext, arrayBuffer) {
  if (typeof audioContext.decodeAudioData !== 'function') {
    return Promise.reject(new Error('Audio decoding unavailable'));
  }

  if (audioContext.decodeAudioData.length >= 2) {
    return new Promise((resolve, reject) => {
      audioContext.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  const decoded = audioContext.decodeAudioData(arrayBuffer);
  if (decoded && typeof decoded.then === 'function') {
    return decoded;
  }

  return Promise.resolve(decoded);
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) {
    return '0 s';
  }

  if (seconds >= 10) {
    return `${seconds.toFixed(1)} s`;
  }

  return `${seconds.toFixed(2)} s`;
}

function formatHertz(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} kHz`;
  }

  return `${Math.round(value)} Hz`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(0)}%`;
}

function formatIntensity(value) {
  if (!Number.isFinite(value) || value === 0) {
    return '0';
  }

  if (Math.abs(value) < 0.001) {
    return value.toExponential(2);
  }

  if (Math.abs(value) < 0.01) {
    return value.toFixed(4);
  }

  return value.toFixed(3);
}

function friendlyErrorMessage(error) {
  if (!error) {
    return 'Analysis failed';
  }

  if (error.name === 'NotSupportedError' || error.name === 'EncodingError') {
    return 'Unsupported audio file';
  }

  if (typeof error.message === 'string' && error.message.toLowerCase().includes('decode')) {
    return 'Unsupported or corrupted audio file';
  }

  return 'Analysis failed';
}

function createDetailCard(documentObj, label, value) {
  if (!documentObj || typeof documentObj.createElement !== 'function') {
    return null;
  }

  const card = documentObj.createElement('div');
  card.className = 'analysis-detail-card';

  const labelNode = documentObj.createElement('span');
  labelNode.className = 'analysis-detail-label';
  labelNode.textContent = label;

  const valueNode = documentObj.createElement('strong');
  valueNode.className = 'analysis-detail-value';
  valueNode.textContent = value;

  card.append(labelNode, valueNode);
  return card;
}

export function createUploadAnalysis(options = {}) {
  const audioContextFactory = options.audioContextFactory ?? (() => new (window.AudioContext || window.webkitAudioContext)());
  const triggerButton = options.triggerButton ?? null;
  const fileInput = options.fileInput ?? null;
  const overlay = options.overlay ?? null;
  const loadingState = options.loadingState ?? null;
  const resultState = options.resultState ?? null;
  const loadingMessage = options.loadingMessage ?? null;
  const overlayTitle = options.overlayTitle ?? null;
  const overlaySubtitle = options.overlaySubtitle ?? null;
  const closeButton = options.closeButton ?? null;
  const downloadButton = options.downloadButton ?? null;
  const comparisonImage = options.comparisonImage ?? null;
  const detailContainer = options.detailContainer ?? null;
  const metricContainer = options.metricContainer ?? null;
  const comparisonRendererFactory = options.comparisonRendererFactory ?? createComparisonFigureRenderer;
  const documentObj = options.documentObj ?? (typeof document !== 'undefined' ? document : null);

  let audioContext = null;
  let currentFileName = 'audio-analysis';
  let currentImageDataUrl = '';

  const state = {
    loading: false,
    error: null,
    analysis: null,
    overlayVisible: false
  };

  function ensureAudioContext() {
    if (!audioContext) {
      audioContext = audioContextFactory();
    }

    return audioContext;
  }

  function setOverlayVisible(visible) {
    state.overlayVisible = visible;
    if (overlay) {
      overlay.hidden = !visible;
    }
  }

  function setLoadingState(visible, message) {
    state.loading = visible;
    setOverlayVisible(true);

    if (loadingState) {
      loadingState.hidden = !visible;
    }

    if (resultState) {
      resultState.hidden = visible;
    }

    if (loadingMessage) {
      loadingMessage.textContent = message;
    }

    if (closeButton) {
      closeButton.disabled = false;
    }

    if (triggerButton) {
      triggerButton.disabled = visible;
    }
  }

  function setResultState(visible) {
    if (resultState) {
      resultState.hidden = !visible;
    }
    if (loadingState) {
      loadingState.hidden = visible;
    }
  }

  function clearDetails() {
    if (metricContainer) {
      metricContainer.innerHTML = '';
    }
    if (detailContainer) {
      detailContainer.innerHTML = '';
    }
  }

  function setDownloadEnabled(enabled) {
    if (downloadButton) {
      downloadButton.disabled = !enabled;
    }
  }

  function setDownloadLoading(isLoading) {
    if (downloadButton) {
      if (downloadButton.classList && typeof downloadButton.classList.toggle === 'function') {
        downloadButton.classList.toggle('is-loading', isLoading);
      }
      downloadButton.disabled = isLoading;
    }
  }

  function createDownloadName(fileName) {
    const baseName = typeof fileName === 'string' && fileName.trim()
      ? fileName.replace(/\.[^.]+$/, '')
      : 'audio-analysis';

    return `${baseName.replace(/[^a-z0-9_-]+/gi, '_') || 'audio-analysis'}_comparison.png`;
  }

  function downloadFigure(fileName) {
    if (!comparisonImage) {
      return;
    }

    const downloadName = createDownloadName(fileName);
    setDownloadLoading(true);

    const dataUrl = comparisonImage.src || currentImageDataUrl || '';
    if (!dataUrl) {
      setDownloadLoading(false);
      return;
    }

    if (documentObj && typeof documentObj.createElement === 'function') {
      const anchor = documentObj.createElement('a');
      anchor.href = dataUrl;
      anchor.download = downloadName;
      anchor.rel = 'noopener';
      if (documentObj.body) {
        documentObj.body.appendChild(anchor);
      }
      anchor.click();
      anchor.remove();
    }
    setDownloadLoading(false);
  }

  function renderDetails(file, analysis) {
    if (overlayTitle) {
      overlayTitle.textContent = file?.name ? `Analysis: ${file.name}` : 'Audio analysis';
    }

    if (overlaySubtitle) {
      overlaySubtitle.textContent = `Processed locally in memory - ${formatSeconds(analysis.metrics.durationSeconds)} - ${analysis.metrics.sampleCount.toLocaleString()} samples`;
    }

    clearDetails();

    const cards = [
      createDetailCard(documentObj, 'Duration', formatSeconds(analysis.metrics.durationSeconds)),
      createDetailCard(documentObj, 'Peak', analysis.metrics.peak.toFixed(3)),
      createDetailCard(documentObj, 'RMS', analysis.metrics.rms.toFixed(3)),
      createDetailCard(documentObj, 'Avg amplitude', analysis.metrics.averageAbsolute.toFixed(3)),
      createDetailCard(documentObj, 'Sample rate', formatHertz(analysis.metrics.sampleRate)),
      createDetailCard(documentObj, 'Spectral centroid', formatHertz(analysis.metrics.spectralCentroid)),
      createDetailCard(documentObj, 'Frequency bins', analysis.cancellationComparison.frequencies.length.toLocaleString())
    ].filter(Boolean);

    if (metricContainer && cards.length > 0) {
      metricContainer.append(...cards.slice(0, 4));
    }

    if (detailContainer) {
      const supportingNotes = analysis.cancellationComparison.levels.map((levelSeries) => {
        const summary = levelSeries.summary;
        return `${levelSeries.label}: avg frequency intensity ${formatIntensity(summary.averageIntensity)} - peak ${formatHertz(summary.peakFrequency)}`;
      });

      supportingNotes.forEach((note) => {
        if (!documentObj || typeof documentObj.createElement !== 'function') {
          return;
        }
        const noteNode = documentObj.createElement('div');
        noteNode.className = 'analysis-note';
        noteNode.textContent = note;
        detailContainer.append(noteNode);
      });
    }

    if (comparisonImage) {
      const renderer = comparisonRendererFactory(comparisonImage, { sampleRate: analysis.sampleRate, documentObj });
      const renderResult = renderer.draw(analysis.cancellationComparison);
      if (renderResult?.dataUrl && comparisonImage) {
        currentImageDataUrl = renderResult.dataUrl;
        comparisonImage.src = renderResult.dataUrl;
      }
    }

    currentFileName = file?.name ?? 'audio-analysis';
    setDownloadEnabled(true);
  }

  function hideOverlay() {
    setOverlayVisible(false);
    state.analysis = null;
    state.error = null;
    clearDetails();
    setDownloadEnabled(false);
    setDownloadLoading(false);
    currentImageDataUrl = '';
    if (fileInput) {
      fileInput.value = '';
    }
    if (triggerButton) {
      triggerButton.disabled = false;
    }
  }

  async function processFile(file) {
    if (!file) {
      return;
    }

    setLoadingState(true, `Decoding ${file.name}...`);
    state.error = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = ensureAudioContext();
      if (ctx.resume) {
        await ctx.resume();
      }

      const audioBuffer = await decodeAudioData(ctx, arrayBuffer);
      const analysis = analyzeAudioBuffer(audioBuffer);
      state.analysis = analysis;

      renderDetails(file, analysis);
      setResultState(true);
      setOverlayVisible(true);
      if (loadingMessage) {
        loadingMessage.textContent = `Analysis ready for ${file.name}`;
      }
    } catch (error) {
      state.analysis = null;
      state.error = friendlyErrorMessage(error);
      setLoadingState(true, state.error);
      setResultState(false);
    } finally {
      state.loading = false;
      if (triggerButton) {
        triggerButton.disabled = false;
      }
    }
  }

  async function handleFileChange() {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      return;
    }

    const selectedFile = fileInput.files[0];
    fileInput.value = '';
    await processFile(selectedFile);
  }

  function handleUploadClick() {
    if (fileInput) {
      fileInput.click();
    }
  }

  function handleClose() {
    hideOverlay();
  }

  function handleDownload() {
    if (state.analysis) {
      downloadFigure(currentFileName);
    }
  }

  if (triggerButton) {
    triggerButton.addEventListener('click', handleUploadClick);
  }

  if (fileInput) {
    fileInput.addEventListener('change', handleFileChange);
  }

  if (closeButton) {
    closeButton.addEventListener('click', handleClose);
  }

  if (downloadButton) {
    downloadButton.addEventListener('click', handleDownload);
  }

  setOverlayVisible(false);
  if (loadingState) {
    loadingState.hidden = true;
  }
  if (resultState) {
    resultState.hidden = true;
  }
  setDownloadEnabled(false);
  setDownloadLoading(false);

  return {
    state,
    processFile,
    hideOverlay,
    handleFileChange,
    handleUploadClick,
    handleClose,
    handleDownload
  };
}
