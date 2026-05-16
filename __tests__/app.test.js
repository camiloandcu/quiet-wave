import { describe, test, expect, jest } from '@jest/globals';
import { createAudioController } from '../src/core/app.js';

describe('Audio controller', ()=>{
  test('starts and stops with a valid stream', async ()=>{
    // Mock media stream
    const mockTrack = { stop: jest.fn() };
    const mockStream = { getTracks: () => [mockTrack] };

    const mockNavigator = { mediaDevices: { getUserMedia: jest.fn().mockResolvedValue(mockStream) } };

    // Mock AudioContext and nodes
    class MockSource { connect(){}; disconnect(){} }
    class MockAnalyser { constructor(){ this.fftSize=2048; this.frequencyBinCount=1024 } getFloatTimeDomainData(arr){ for(let i=0;i<arr.length;i++) arr[i]=0 } getByteFrequencyData(arr){ for(let i=0;i<arr.length;i++) arr[i]=128 } }
    class MockAudioContext { constructor(){ this.state='suspended'; this.destination={}; } async resume(){ this.state='running' } async suspend(){ this.state='suspended' } createMediaStreamSource(){ return new MockSource() } createAnalyser(){ return new MockAnalyser() } }

    const statuses = [];
    const controller = createAudioController({ audioContextFactory: ()=> new MockAudioContext(), navigatorObj: mockNavigator, setStatus: (s)=>statuses.push(s) });

    await controller.startMonitoring();
    expect(controller.state.isRunning).toBe(true);
    expect(statuses).toContain('Running');

    controller.stopMonitoring();
    expect(controller.state.isRunning).toBe(false);
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  test('handles permission denied', async ()=>{
    const mockNavigator = { mediaDevices: { getUserMedia: jest.fn().mockRejectedValue(Object.assign(new Error('Denied'), { name: 'NotAllowedError' })) } };
    const statuses = [];
    const controller = createAudioController({ audioContextFactory: ()=> { throw new Error('should not be called') }, navigatorObj: mockNavigator, setStatus: (s)=>statuses.push(s) });

    await controller.startMonitoring();
    expect(controller.state.hasPermission).toBe(false);
    expect(statuses).toContain('Permission denied');
    expect(controller.state.isRunning).toBe(false);
  });
});
