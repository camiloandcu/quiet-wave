// Waveform visualization module

export const DEFAULT_WAVEFORM_ZOOM = 1.9;

const COLORS = {
  background: '#051018',
  axis: '#6f84a0',
  grid: 'rgba(159, 179, 200, 0.12)',
  text: '#d6e4f1',
  cyan: '#08f1c4',
  purple: '#b65cff'
};

export function getWaveformLayout(width, height) {
  const compact = width < 420 || height < 180;
  const left = compact ? 56 : 76;
  const right = compact ? 20 : 28;
  const top = compact ? 18 : 26;
  const bottom = compact ? 42 : 58;

  return {
    left,
    right,
    top,
    bottom,
    plotLeft: left,
    plotTop: top,
    plotWidth: Math.max(1, width - left - right),
    plotHeight: Math.max(1, height - top - bottom)
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDuration(ms) {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)} s`;
  }

  return `${Math.round(ms)} ms`;
}

function formatDurationTick(ms) {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}`;
  }

  return `${Math.round(ms)}`;
}

function drawCanvasText(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.fillStyle = options.color ?? COLORS.text;
  ctx.font = options.font ?? `${Math.round(12 * devicePixelRatio)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = options.baseline ?? 'alphabetic';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawAxes(ctx, layout, width, height, titleX, titleY, xTicks, yTicks) {
  const { plotLeft, plotTop, plotWidth, plotHeight } = layout;
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;

  ctx.save();
  ctx.strokeStyle = COLORS.axis;
  ctx.fillStyle = COLORS.text;
  ctx.lineWidth = Math.max(1, 1.25 * devicePixelRatio);
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(plotLeft, plotTop);
  ctx.lineTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = Math.max(1, devicePixelRatio);

  yTicks.forEach(({ ratio, label }) => {
    const y = plotBottom - (ratio * plotHeight);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.strokeStyle = COLORS.axis;
    ctx.beginPath();
    ctx.moveTo(plotLeft - 4 * devicePixelRatio, y);
    ctx.lineTo(plotLeft, y);
    ctx.stroke();
    drawCanvasText(ctx, label, plotLeft - 8 * devicePixelRatio, y + 4 * devicePixelRatio, {
      align: 'right',
      baseline: 'middle'
    });
    ctx.strokeStyle = COLORS.grid;
  });

  xTicks.forEach(({ ratio, label }) => {
    const x = plotLeft + (ratio * plotWidth);
    ctx.beginPath();
    ctx.moveTo(x, plotBottom);
    ctx.lineTo(x, plotBottom + 4 * devicePixelRatio);
    ctx.stroke();
    drawCanvasText(ctx, label, x, plotBottom + 14 * devicePixelRatio, {
      align: 'center',
      baseline: 'top'
    });
    ctx.strokeStyle = COLORS.grid;
  });

  drawCanvasText(ctx, titleY, Math.max(12 * devicePixelRatio, 12), plotTop - 4 * devicePixelRatio, {
    align: 'left',
    baseline: 'bottom'
  });
  drawCanvasText(ctx, titleX, plotLeft + plotWidth / 2, height - 6 * devicePixelRatio, {
    align: 'center',
    baseline: 'bottom'
  });

  ctx.restore();
}

export function mapWaveformSampleToY(sample, layout, zoom = DEFAULT_WAVEFORM_ZOOM) {
  const scaled = clamp(sample * zoom, -1, 1);
  const normalized = (scaled + 1) / 2;
  return layout.plotTop + ((1 - normalized) * layout.plotHeight);
}

function drawWaveformTrace(ctx, timeData, layout, zoom, strokeStyle, alpha = 1) {
  const { plotLeft, plotWidth } = layout;
  const step = Math.max(1, Math.floor(timeData.length / Math.max(1, plotWidth)));
  const xStep = plotWidth / Math.max(1, ((timeData.length - 1) / step));

  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(1.5, 2 * devicePixelRatio);
  ctx.beginPath();

  let drawn = 0;
  for (let i = 0; i < timeData.length; i += step) {
    const x = plotLeft + (drawn * xStep);
    const y = mapWaveformSampleToY(timeData[i], layout, zoom);
    if (drawn === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    drawn += 1;
  }

  ctx.stroke();
  ctx.restore();
}

export function createWaveformRenderer(canvasElement, options = {}) {
  const ctx = canvasElement.getContext('2d');
  const waveformZoom = options.waveformZoom ?? DEFAULT_WAVEFORM_ZOOM;
  const sampleRate = options.sampleRate || 48000;

  function prepareCanvas() {
    const cw = canvasElement.width = canvasElement.clientWidth * devicePixelRatio;
    const ch = canvasElement.height = canvasElement.clientHeight * devicePixelRatio;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, cw, ch);
    return { cw, ch, layout: getWaveformLayout(cw, ch) };
  }

  function draw(timeData) {
    const { cw, ch, layout } = prepareCanvas();
    const durationMs = (timeData.length / sampleRate) * 1000;
    const xTicks = [
      { ratio: 0, label: '0' },
      { ratio: 0.5, label: formatDurationTick(durationMs / 2) },
      { ratio: 1, label: formatDurationTick(durationMs) }
    ];
    const yTicks = [
      { ratio: 0, label: '-1.0' },
      { ratio: 0.5, label: '0.0' },
      { ratio: 1, label: '+1.0' }
    ];

    drawAxes(ctx, layout, cw, ch, 'Time (ms)', 'Amplitude (a.u.)', xTicks, yTicks);
    drawWaveformTrace(ctx, timeData, layout, waveformZoom, COLORS.cyan, 1);
  }

  // Draw original and inverted waveforms overlaid
  function drawDual(origTimeData, invTimeData) {
    const { cw, ch, layout } = prepareCanvas();
    const durationMs = (origTimeData.length / sampleRate) * 1000;
    const xTicks = [
      { ratio: 0, label: '0' },
      { ratio: 0.5, label: formatDurationTick(durationMs / 2) },
      { ratio: 1, label: formatDurationTick(durationMs) }
    ];
    const yTicks = [
      { ratio: 0, label: '-1.0' },
      { ratio: 0.5, label: '0.0' },
      { ratio: 1, label: '+1.0' }
    ];

    drawAxes(ctx, layout, cw, ch, 'Time (ms)', 'Amplitude (a.u.)', xTicks, yTicks);
    drawWaveformTrace(ctx, origTimeData, layout, waveformZoom, COLORS.cyan, 1);
    drawWaveformTrace(ctx, invTimeData, layout, waveformZoom, COLORS.purple, 0.7);
  }

  return { draw, drawDual };
}
