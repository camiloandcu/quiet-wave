import { describe, expect, test } from '@jest/globals';
import { analyzeAudioBuffer, computeAudioMetrics, createCancellationComparisonSeries, createSpectrumSeries, createWaveformSeries } from '../src/analysis/audio-analysis.js';

function createMockAudioBuffer(samples, sampleRate = 8000) {
  return {
    length: samples.length,
    numberOfChannels: 1,
    sampleRate,
    getChannelData: () => Float32Array.from(samples)
  };
}

describe('audio analysis helpers', () => {
  test('computes waveform, spectrum, frequency intensity comparison, and metrics from decoded audio', () => {
    const samples = [0, 1, 0, -1, 0, 1, 0, -1];
    const audioBuffer = createMockAudioBuffer(samples);

    const waveform = createWaveformSeries(Float32Array.from(samples), 4);
    const spectrum = createSpectrumSeries(Float32Array.from(samples), audioBuffer.sampleRate, 8);
    const comparison = createCancellationComparisonSeries(Float32Array.from(samples), audioBuffer.sampleRate, [0, 0.4, 0.8], 4);
    const metrics = computeAudioMetrics(Float32Array.from(samples), audioBuffer.sampleRate);
    const analysis = analyzeAudioBuffer(audioBuffer);

    expect(waveform).toHaveLength(4);
    expect(spectrum).toHaveLength(8);
    expect(comparison.frequencies).toHaveLength(4);
    expect(comparison.levels).toHaveLength(3);
    expect(comparison.levels.map((level) => level.level)).toEqual([0, 0.4, 0.8]);
    expect(comparison.levels[0].averageIntensitySeries).toHaveLength(4);
    expect(comparison.levels[1].averageIntensitySeries[1]).toBeCloseTo(comparison.levels[0].averageIntensitySeries[1] * 0.6, 5);
    expect(comparison.levels[2].averageIntensitySeries[1]).toBeCloseTo(comparison.levels[0].averageIntensitySeries[1] * 0.2, 5);
    expect(Math.max(...comparison.levels[0].intensitySeries)).toBeCloseTo(1, 5);
    expect(Math.max(...comparison.levels[1].intensitySeries)).toBeCloseTo(0.6, 5);
    expect(Math.max(...comparison.levels[2].intensitySeries)).toBeCloseTo(0.2, 5);
    expect(metrics.peak).toBeCloseTo(1, 5);
    expect(metrics.rms).toBeGreaterThan(0);
    expect(analysis.cancellationComparison.frequencies).toHaveLength(48);
    expect(analysis.cancellationComparison.levels).toHaveLength(3);
    expect(analysis.metrics.sampleCount).toBe(samples.length);
    expect(analysis.metrics.durationSeconds).toBeCloseTo(samples.length / audioBuffer.sampleRate, 5);
    expect(analysis.metrics.spectralCentroid).toBeGreaterThanOrEqual(0);
  });
});
