import { describe, test, expect } from '@jest/globals';
import { computeGains, computeMixedSample } from '../src/audio/output.js';

describe('Phase inversion gain math', ()=>{
  test('gains at mixRatio=0 (original only)', ()=>{
    const g = computeGains(0);
    expect(g.clamped).toBe(0);
    expect(g.origGain).toBeCloseTo(1.0);
    expect(g.invGain).toBeCloseTo(0.0);
    expect(computeMixedSample(0.5, 0)).toBeCloseTo(0.5);
  });

  test('gains at mixRatio=1 (full inversion mix)', ()=>{
    const g = computeGains(1);
    expect(g.clamped).toBe(1);
    expect(g.origGain).toBeCloseTo(0.5);
    expect(g.invGain).toBeCloseTo(0.5);
    // full cancellation for perfectly matched signals
    expect(computeMixedSample(0.5, 1)).toBeCloseTo(0.0);
  });

  test('mid mixRatio produces partial cancellation', ()=>{
    const g = computeGains(0.5);
    expect(g.clamped).toBeCloseTo(0.5);
    expect(g.origGain).toBeCloseTo(0.75);
    expect(g.invGain).toBeCloseTo(0.25);
    // orig - inv = 0.5 -> mixed sample scales by 0.5
    expect(computeMixedSample(0.6, 0.5)).toBeCloseTo(0.6 * 0.5);
  });

  test('mixRatio clamping handles out-of-range inputs', ()=>{
    const low = computeGains(-1);
    expect(low.clamped).toBe(0);
    const high = computeGains(2);
    expect(high.clamped).toBe(1);
  });
});
