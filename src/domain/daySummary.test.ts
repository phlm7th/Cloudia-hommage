import { describe, it, expect } from 'vitest';
import type { HourPoint } from '../data/types';
import { skySegments, extremes, compareSentence } from './daySummary';

const h = (hour: number, code: number | null, temp: number | null = 10): HourPoint => ({
  hour,
  temp,
  code,
  cloud: 0,
  wind: 0,
  pop: 0,
});

describe('skySegments', () => {
  it('merges consecutive hours with the same sky state', () => {
    const hours = [...Array(24)].map((_, i) => h(i, i < 9 ? 0 : i < 15 ? 3 : 61));
    expect(skySegments(hours)).toEqual([
      { state: 'clear', start: 0, end: 9 },
      { state: 'cloud', start: 9, end: 15 },
      { state: 'precip', start: 15, end: 24 },
    ]);
  });

  it('skips hours with null code', () => {
    const hours = [...Array(24)].map((_, i) => h(i, i === 5 ? null : 3));
    expect(skySegments(hours)).toEqual([
      { state: 'cloud', start: 0, end: 5 },
      { state: 'cloud', start: 6, end: 24 },
    ]);
  });
});

describe('extremes', () => {
  it('finds max and min with their hours, ignoring nulls', () => {
    const temps = [19, 18, null, 17, 20, 28, 25];
    expect(extremes(temps.map((t, i) => h(i, 0, t)))).toEqual({
      max: { hour: 5, temp: 28 },
      min: { hour: 3, temp: 17 },
    });
  });

  it('returns null when every value is missing', () => {
    expect(extremes([h(0, 0, null), h(1, 0, null)])).toBeNull();
  });
});

describe('compareSentence', () => {
  it.each([
    [20, 19.4, '어제와 비슷해요'],
    [21, 20, '어제와 비슷해요'],
    [23, 20, '어제보다 3° 따뜻해요'],
    [15, 20, '어제보다 5° 쌀쌀해요'],
  ] as const)('compareSentence(%s, %s)', (v, r, expected) => {
    expect(compareSentence('ko', v, r)).toBe(expected);
  });

  it('returns null when a value is missing', () => {
    expect(compareSentence('ko', null, 20)).toBeNull();
    expect(compareSentence('ko', 20, null)).toBeNull();
  });
});
