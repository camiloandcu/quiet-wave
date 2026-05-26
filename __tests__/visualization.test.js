import { describe, expect, test } from '@jest/globals';
import { DEFAULT_WAVEFORM_ZOOM, getWaveformLayout, mapWaveformSampleToY } from '../src/visualization/waveform.js';
import { getSpectrumLayout, mapSpectrumValueToHeight } from '../src/visualization/spectrum.js';

describe('visualization layout helpers', () => {
  test('waveform layout reserves readable label space on compact screens', () => {
    const layout = getWaveformLayout(360, 180);

    expect(layout.left).toBeGreaterThanOrEqual(44);
    expect(layout.bottom).toBeGreaterThanOrEqual(34);
    expect(layout.plotWidth).toBeGreaterThan(0);
    expect(layout.plotHeight).toBeGreaterThan(0);
  });

  test('waveform zoom magnifies the plotted signal', () => {
    const layout = getWaveformLayout(800, 150);
    const centered = mapWaveformSampleToY(0, layout, DEFAULT_WAVEFORM_ZOOM);
    const positive = mapWaveformSampleToY(0.5, layout, DEFAULT_WAVEFORM_ZOOM);

    expect(positive).toBeLessThan(centered);
  });

  test('spectrum layout reserves axis spacing and scales bars', () => {
    const layout = getSpectrumLayout(360, 180);
    const barHeight = mapSpectrumValueToHeight(255, layout);

    expect(layout.left).toBeGreaterThanOrEqual(44);
    expect(layout.bottom).toBeGreaterThanOrEqual(34);
    expect(barHeight).toBeGreaterThan(layout.plotHeight * 0.9);
  });
});
