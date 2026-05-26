// Spectrum visualization module

export function getSpectrumLayout(width, height) {
  const compact = width < 420 || height < 180;
  const left = compact ? 56 : 76;
  const right = compact ? 18 : 26;
  const top = compact ? 20 : 28;
  const bottom = compact ? 42 : 56;

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

function drawCanvasText(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.fillStyle = options.color ?? '#d6e4f1';
  ctx.font = options.font ?? `${Math.round(12 * devicePixelRatio)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = options.baseline ?? 'alphabetic';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function formatFrequency(value) {
  if (value >= 1000) {
    const khz = value / 1000;
    return `${khz >= 10 ? khz.toFixed(0) : khz.toFixed(1)}`;
  }

  return `${Math.round(value)}`;
}

function drawAxes(ctx, layout, width, height, xTicks, yTicks, titleX, titleY) {
  const { plotLeft, plotTop, plotWidth, plotHeight } = layout;
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;
  const axisColor = '#6f84a0';
  const gridColor = 'rgba(159, 179, 200, 0.12)';

  ctx.save();
  ctx.strokeStyle = axisColor;
  ctx.fillStyle = '#d6e4f1';
  ctx.lineWidth = Math.max(1, 1.25 * devicePixelRatio);

  ctx.beginPath();
  ctx.moveTo(plotLeft, plotTop);
  ctx.lineTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = Math.max(1, devicePixelRatio);
  yTicks.forEach(({ ratio, label }) => {
    const y = plotBottom - (ratio * plotHeight);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.strokeStyle = axisColor;
    ctx.beginPath();
    ctx.moveTo(plotLeft - 4 * devicePixelRatio, y);
    ctx.lineTo(plotLeft, y);
    ctx.stroke();
    drawCanvasText(ctx, label, plotLeft - 8 * devicePixelRatio, y + 4 * devicePixelRatio, {
      align: 'right',
      baseline: 'middle'
    });
    ctx.strokeStyle = gridColor;
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
    ctx.strokeStyle = gridColor;
  });

  drawCanvasText(ctx, titleX, plotLeft + plotWidth / 2, height - 6 * devicePixelRatio, {
    align: 'center',
    baseline: 'bottom'
  });
  drawCanvasText(ctx, titleY, Math.max(12 * devicePixelRatio, 12), plotTop - 4 * devicePixelRatio, {
    align: 'left',
    baseline: 'bottom'
  });

  ctx.restore();
}

export function mapSpectrumValueToHeight(value, layout) {
  const clamped = Math.max(0, Math.min(255, value));
  const scaled = Math.pow(clamped / 255, 0.5) * 1.15;
  return Math.max(1, scaled * layout.plotHeight);
}

export function createSpectrumRenderer(canvasElement) {
  const ctx = canvasElement.getContext('2d');
  const options = arguments[1] ?? {};
  const sampleRate = options.sampleRate || 48000;

  function draw(freqData) {
    const cw = canvasElement.width = canvasElement.clientWidth * devicePixelRatio;
    const ch = canvasElement.height = canvasElement.clientHeight * devicePixelRatio;
    const layout = getSpectrumLayout(cw, ch);
    const plotBottom = layout.plotTop + layout.plotHeight;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#051018';
    ctx.fillRect(0, 0, cw, ch);
    const nyquist = sampleRate / 2;
    const xTicks = [
      { ratio: 0, label: formatFrequency(0) },
      { ratio: 0.5, label: formatFrequency(nyquist / 2) },
      { ratio: 1, label: formatFrequency(nyquist) }
    ];
    const yTicks = [
      { ratio: 0, label: '0.0' },
      { ratio: 0.5, label: '0.5' },
      { ratio: 1, label: '1.0' }
    ];

    drawAxes(ctx, layout, cw, ch, xTicks, yTicks, 'Frequency (Hz)', 'Magnitude (a.u.)');

    const barWidth = Math.max(1, Math.floor(layout.plotWidth / freqData.length));
    for (let i = 0; i < freqData.length; i++) {
      const h = mapSpectrumValueToHeight(freqData[i], layout);
      const x = layout.plotLeft + (i * barWidth);
      ctx.fillStyle = `hsl(${i / freqData.length * 240}, 90%, 50%)`;
      ctx.fillRect(x, plotBottom - h, Math.max(1, barWidth - 1), h);
    }
  }

  return { draw };
}
