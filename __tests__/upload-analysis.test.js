import { describe, expect, jest, test } from '@jest/globals';
import { createUploadAnalysis } from '../src/analysis/upload-analysis.js';

function createElementMock() {
  const listeners = {};

  return {
    hidden: false,
    disabled: false,
    value: '',
    textContent: '',
    files: [],
    src: '',
    innerHTML: '',
    addEventListener: jest.fn((eventName, callback) => {
      listeners[eventName] = callback;
    }),
    click: jest.fn(),
    append: jest.fn(),
    _listeners: listeners
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

function createAudioBufferMock() {
  const samples = Float32Array.from([0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5]);

  return {
    sampleRate: 48000,
    length: samples.length,
    numberOfChannels: 1,
    getChannelData: () => samples
  };
}

describe('upload analysis controller', () => {
  test('shows loading before the result overlay and renders the comparison graph', async () => {
    const triggerButton = createElementMock();
    const fileInput = createElementMock();
    const overlay = createElementMock();
    const loadingState = createElementMock();
    const resultState = createElementMock();
    const loadingMessage = createElementMock();
    const overlayTitle = createElementMock();
    const overlaySubtitle = createElementMock();
    const closeButton = createElementMock();
    const downloadButton = createElementMock();
    const comparisonImage = createElementMock();
    const metricContainer = createElementMock();
    const detailContainer = createElementMock();
    const documentObj = {
      createElement: jest.fn((tagName) => ({
        tagName,
        className: '',
        textContent: '',
        append: jest.fn(),
        children: [],
        src: '',
        remove: jest.fn()
      }))
    };

    const decodeDeferred = createDeferred();
    const audioContext = {
      resume: jest.fn().mockResolvedValue(undefined),
      decodeAudioData: jest.fn(() => decodeDeferred.promise)
    };

    const renderer = { draw: jest.fn(() => ({ dataUrl: 'data:image/png;base64,abc123' })) };

    const controller = createUploadAnalysis({
      audioContextFactory: () => audioContext,
      triggerButton,
      fileInput,
      overlay,
      loadingState,
      resultState,
      loadingMessage,
      overlayTitle,
      overlaySubtitle,
      closeButton,
      downloadButton,
      comparisonImage,
      metricContainer,
      detailContainer,
      comparisonRendererFactory: () => renderer,
      documentObj
    });

    const file = {
      name: 'sample.wav',
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(16))
    };
    fileInput.files = [file];

    const processing = controller.processFile(file);

    expect(overlay.hidden).toBe(false);
    expect(loadingState.hidden).toBe(false);
    expect(resultState.hidden).toBe(true);
    expect(loadingMessage.textContent).toContain('Decoding');

    decodeDeferred.resolve(createAudioBufferMock());
    await processing;

    expect(audioContext.resume).toHaveBeenCalled();
    expect(renderer.draw).toHaveBeenCalled();
    expect(resultState.hidden).toBe(false);
    expect(loadingState.hidden).toBe(true);
    expect(overlayTitle.textContent).toContain('sample.wav');
    expect(overlaySubtitle.textContent).toContain('Processed locally in memory');
    expect(metricContainer.append).toHaveBeenCalled();
    expect(comparisonImage.src).toContain('data:image/png');

    controller.handleClose();
    expect(overlay.hidden).toBe(true);
    expect(fileInput.value).toBe('');
  });

  test('reports unsupported audio files clearly', async () => {
    const triggerButton = createElementMock();
    const fileInput = createElementMock();
    const overlay = createElementMock();
    const loadingState = createElementMock();
    const resultState = createElementMock();
    const loadingMessage = createElementMock();
    const closeButton = createElementMock();
    const downloadButton = createElementMock();
    const comparisonImage = createElementMock();

    const audioContext = {
      resume: jest.fn().mockResolvedValue(undefined),
      decodeAudioData: jest.fn().mockRejectedValue(Object.assign(new Error('Cannot decode'), { name: 'NotSupportedError' }))
    };

    const controller = createUploadAnalysis({
      audioContextFactory: () => audioContext,
      triggerButton,
      fileInput,
      overlay,
      loadingState,
      resultState,
      loadingMessage,
      closeButton,
      downloadButton,
      comparisonImage,
      metricContainer: createElementMock(),
      detailContainer: createElementMock(),
      comparisonRendererFactory: () => ({ draw: jest.fn() }),
      documentObj: { createElement: jest.fn() }
    });

    const file = {
      name: 'broken.bin',
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    };

    await controller.processFile(file);

    expect(overlay.hidden).toBe(false);
    expect(resultState.hidden).toBe(true);
    expect(loadingState.hidden).toBe(false);
    expect(loadingMessage.textContent).toBe('Unsupported audio file');
  });
});