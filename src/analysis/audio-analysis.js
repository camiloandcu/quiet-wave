function toMonoSamples(audioBuffer) {
  const { length, numberOfChannels } = audioBuffer;

  if (numberOfChannels <= 1) {
    return Float32Array.from(audioBuffer.getChannelData(0));
  }

  const mono = new Float32Array(length);
  for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      mono[sampleIndex] += channelData[sampleIndex] / numberOfChannels;
    }
  }

  return mono;
}

function applyCancellationLevel(samples, cancellationLevel) {
  const gain = Math.max(0, 1 - cancellationLevel);
  const output = new Float32Array(samples.length);

  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    output[sampleIndex] = samples[sampleIndex] * gain;
  }

  return output;
}

function computeSpectrumMagnitudes(samples, sampleRate, binCount = 96) {
  if (!samples.length) {
    return new Float32Array(binCount);
  }

  const windowSize = Math.max(32, Math.min(1024, samples.length));
  const workingSamples = samples.subarray(0, windowSize);
  const magnitudes = new Float32Array(binCount);

  for (let binIndex = 0; binIndex < binCount; binIndex += 1) {
    const frequencyRatio = binCount === 1 ? 0 : binIndex / (binCount - 1);
    const targetFrequency = frequencyRatio * (sampleRate / 2);
    const angularStep = (2 * Math.PI * targetFrequency) / sampleRate;
    let real = 0;
    let imaginary = 0;

    for (let sampleIndex = 0; sampleIndex < workingSamples.length; sampleIndex += 1) {
      const windowRatio = workingSamples.length > 1 ? sampleIndex / (workingSamples.length - 1) : 0;
      const window = 0.5 - (0.5 * Math.cos(2 * Math.PI * windowRatio));
      const sample = workingSamples[sampleIndex] * window;
      const phase = angularStep * sampleIndex;
      real += sample * Math.cos(phase);
      imaginary -= sample * Math.sin(phase);
    }

    magnitudes[binIndex] = Math.sqrt((real * real) + (imaginary * imaginary)) / workingSamples.length;
  }

  return magnitudes;
}

function computeAverageSpectrumMagnitudes(samples, sampleRate, binCount = 48, maxFrames = 96) {
  if (!samples.length) {
    return new Float32Array(binCount);
  }

  const frameSize = Math.min(2048, samples.length);
  const frameCount = Math.min(maxFrames, Math.max(1, Math.ceil(samples.length / frameSize)));
  const accumulatedMagnitudes = new Float32Array(binCount);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const start = frameCount === 1
      ? 0
      : Math.round((samples.length - frameSize) * (frameIndex / (frameCount - 1)));
    const frame = samples.subarray(start, start + frameSize);
    const frameMagnitudes = computeSpectrumMagnitudes(frame, sampleRate, binCount);

    for (let binIndex = 0; binIndex < binCount; binIndex += 1) {
      accumulatedMagnitudes[binIndex] += frameMagnitudes[binIndex];
    }
  }

  for (let binIndex = 0; binIndex < accumulatedMagnitudes.length; binIndex += 1) {
    accumulatedMagnitudes[binIndex] /= frameCount;
  }

  return accumulatedMagnitudes;
}

function summarizeSpectrum(samples, sampleRate) {
  const magnitudes = computeAverageSpectrumMagnitudes(samples, sampleRate, 48);
  const nyquist = sampleRate / 2;
  let weightedSum = 0;
  let magnitudeSum = 0;
  let peakMagnitude = 0;
  let peakFrequency = 0;

  for (let index = 0; index < magnitudes.length; index += 1) {
    const ratio = magnitudes.length === 1 ? 0 : index / (magnitudes.length - 1);
    const frequency = ratio * nyquist;
    const magnitude = magnitudes[index];
    weightedSum += frequency * magnitude;
    magnitudeSum += magnitude;
    if (magnitude > peakMagnitude) {
      peakMagnitude = magnitude;
      peakFrequency = frequency;
    }
  }

  return {
    averageIntensity: magnitudes.length ? magnitudeSum / magnitudes.length : 0,
    spectralCentroid: magnitudeSum > 0 ? weightedSum / magnitudeSum : 0,
    peakFrequency,
    peakMagnitude,
    magnitudes
  };
}

export function createWaveformSeries(samples, pointCount = 512) {
  if (!samples.length) {
    return new Float32Array();
  }

  const actualPointCount = Math.min(pointCount, samples.length);
  const output = new Float32Array(actualPointCount);
  const step = samples.length / actualPointCount;

  for (let pointIndex = 0; pointIndex < actualPointCount; pointIndex += 1) {
    const sourceIndex = Math.min(samples.length - 1, Math.floor(pointIndex * step));
    output[pointIndex] = samples[sourceIndex];
  }

  return output;
}

export function createSpectrumSeries(samples, sampleRate, binCount = 96) {
  return computeSpectrumMagnitudes(samples, sampleRate, binCount);
}

export function createCancellationComparisonSeries(samples, sampleRate, cancellationLevels = [0, 0.4, 0.8], binCount = 48) {
  const frequencies = Array.from({ length: binCount }, (_, index) => {
    const ratio = binCount === 1 ? 0 : index / (binCount - 1);
    return ratio * (sampleRate / 2);
  });

  const rawSpectra = cancellationLevels.map((level) => {
    const canceledSamples = applyCancellationLevel(samples, level);
    const spectrum = computeAverageSpectrumMagnitudes(canceledSamples, sampleRate, binCount);
    const summary = summarizeSpectrum(canceledSamples, sampleRate);

    return {
      level,
      label: `${Math.round(level * 100)}% cancellation`,
      spectrum,
      summary
    };
  });

  const globalMaximum = Math.max(
    0,
    ...rawSpectra.flatMap(({ spectrum }) => Array.from(spectrum))
  ) || 1;

  return {
    frequencies,
    levels: rawSpectra.map(({ level, label, spectrum, summary }) => ({
      level,
      label,
      averageIntensitySeries: Array.from(spectrum),
      intensitySeries: Array.from(spectrum, (value) => value / globalMaximum),
      summary
    }))
  };
}

export function computeSpectralCentroid(spectrumData, sampleRate) {
  if (!spectrumData.length) {
    return 0;
  }

  const nyquist = sampleRate / 2;
  let weightedSum = 0;
  let magnitudeSum = 0;

  for (let index = 0; index < spectrumData.length; index += 1) {
    const ratio = spectrumData.length === 1 ? 0 : index / (spectrumData.length - 1);
    const frequency = ratio * nyquist;
    const magnitude = spectrumData[index];
    weightedSum += frequency * magnitude;
    magnitudeSum += magnitude;
  }

  if (magnitudeSum === 0) {
    return 0;
  }

  return weightedSum / magnitudeSum;
}

export function computeAudioMetrics(samples, sampleRate) {
  let peak = 0;
  let sumSquares = 0;
  let sumAbsolute = 0;

  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    const value = samples[sampleIndex];
    const absolute = Math.abs(value);
    if (absolute > peak) {
      peak = absolute;
    }
    sumSquares += value * value;
    sumAbsolute += absolute;
  }

  const sampleCount = samples.length || 1;

  return {
    sampleCount,
    durationSeconds: samples.length / sampleRate,
    peak,
    rms: Math.sqrt(sumSquares / sampleCount),
    averageAbsolute: sumAbsolute / sampleCount,
    sampleRate
  };
}

export function analyzeAudioBuffer(audioBuffer) {
  const monoSamples = toMonoSamples(audioBuffer);
  const waveformData = createWaveformSeries(monoSamples);
  const spectrumData = createSpectrumSeries(monoSamples, audioBuffer.sampleRate);
  const cancellationComparison = createCancellationComparisonSeries(monoSamples, audioBuffer.sampleRate);
  const metrics = computeAudioMetrics(monoSamples, audioBuffer.sampleRate);

  return {
    sampleRate: audioBuffer.sampleRate,
    waveformData,
    spectrumData,
    cancellationComparison,
    metrics: {
      ...metrics,
      spectralCentroid: computeSpectralCentroid(spectrumData, audioBuffer.sampleRate)
    }
  };
}
