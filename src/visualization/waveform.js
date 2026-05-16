// Waveform visualization module

export function createWaveformRenderer(canvasElement) {
  const ctx = canvasElement.getContext('2d');

  function draw(timeData) {
    const cw = canvasElement.width = canvasElement.clientWidth * devicePixelRatio;
    const ch = canvasElement.height = canvasElement.clientHeight * devicePixelRatio;
    ctx.clearRect(0, 0, cw, ch);
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.strokeStyle = '#08f1c4';
    ctx.beginPath();

    const step = Math.max(1, Math.floor(timeData.length / cw));
    let x = 0;
    for (let i = 0; i < timeData.length; i += step) {
      const v = timeData[i] * 0.8;
      const y = (1 + v) * ch / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += 1;
    }
    ctx.stroke();
  }

  return { draw };
}
