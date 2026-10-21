import { describe, it, expect } from 'vitest';
import { toHourFraction } from './sceneMath';

describe('toHourFraction', () => {
  it('parses local ISO time', () => expect(toHourFraction('2026-10-21T06:45')).toBe(6.75));
  it('returns null for missing values', () => expect(toHourFraction(null)).toBeNull());
});

import { sunPosition, skyPhase, skyColors, cloudCount, particleCount } from './sceneMath';

describe('sunPosition', () => {
  it('is at the top at the midpoint of the day', () => expect(sunPosition(12, 6, 18)).toEqual({ t: 0.5, up: true }));
  it('is down before sunrise and after sunset', () => {
    expect(sunPosition(5, 6, 18).up).toBe(false);
    expect(sunPosition(19, 6, 18).up).toBe(false);
  });
  it('treats missing sunrise/sunset as a 6–18 day', () => expect(sunPosition(12, null, null)).toEqual({ t: 0.5, up: true }));
});

describe('skyPhase', () => {
  it.each([[3, 'night'], [6.5, 'twilight'], [12, 'day'], [17.5, 'twilight'], [22, 'night']] as const)(
    'skyPhase(%s) = %s',
    (h, p) => expect(skyPhase(h, 6.75, 17.75)).toBe(p),
  );
  it('treats missing sunrise/sunset as day', () => expect(skyPhase(3, null, null)).toBe('day'));
});

describe('skyColors', () => {
  it('returns the base palette for a clear day', () => expect(skyColors('day', 10, false)).toEqual(['#2f7fc1', '#9fd3f0']));
  it('uses the rainy palette when it rains by day', () => expect(skyColors('day', 10, true)).toEqual(['#4b6280', '#8fa3b8']));
  it('greys the sky when overcast', () => expect(skyColors('night', 90, false)).toEqual(['#4b5b72', '#556b8a']));
});

describe('counts', () => {
  it('cloudCount scales 0..8', () => {
    expect(cloudCount(0)).toBe(0);
    expect(cloudCount(50)).toBe(4);
    expect(cloudCount(100)).toBe(8);
  });
  it('particleCount follows precipitation and caps', () => {
    expect(particleCount('none', 80)).toBe(0);
    expect(particleCount('rain', 50)).toBe(120);
    expect(particleCount('rain', 100)).toBe(200);
    expect(particleCount('snow', 100)).toBe(100);
  });
});
