// Spectrum visualization module

export function createSpectrumRenderer(canvasElement) {
  const ctx = canvasElement.getContext('2d');

  function draw(freqData) {
    const cw = canvasElement.width = canvasElement.clientWidth * devicePixelRatio;
    const ch = canvasElement.height = canvasElement.clientHeight * devicePixelRatio;
    ctx.clearRect(0, 0, cw, ch);

    const barWidth = Math.max(1, Math.floor(cw / freqData.length));
    for (let i = 0; i < freqData.length; i++) {
      // Amplify and add logarithmic scaling for better visibility
      const v = Math.pow(freqData[i] / 255, 0.5) * 1.2;
      const h = Math.max(1, v * ch); // Ensure minimum visible height
      const x = i * barWidth;
      ctx.fillStyle = `hsl(${i / freqData.length * 240}, 90%, 50%)`;
      ctx.fillRect(x, ch - h, Math.max(1, barWidth - 1), h);
    }
  }

  return { draw };
}
