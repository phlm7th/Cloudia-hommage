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

import { sunPoint, moonPoint } from './sceneMath';

describe('celestial placement', () => {
  // The sun travels below the condition text; the moon sits beside it on the right.
  it('rises and sets on the horizon at 72% height', () => {
    const rise = sunPoint(0, 400, 800, 500);
    expect(rise.x).toBeCloseTo(40);
    expect(rise.y).toBeCloseTo(576);
    expect(sunPoint(1, 400, 800, 500).y).toBeCloseTo(576);
  });
  it('peaks at the given height at midday', () => {
    const noon = sunPoint(0.5, 400, 800, 500);
    expect(noon.x).toBeCloseTo(200);
    expect(noon.y).toBeCloseTo(500);
  });
  it('keeps a visible arc when the text leaves almost no room above the horizon', () => {
    expect(sunPoint(0.5, 400, 800, 590).y).toBeCloseTo(576 - 40);
  });
  it('places the moon on the right at the given height', () => {
    const m = moonPoint(400, 350);
    expect(m.x).toBeCloseTo(312);
    expect(m.y).toBe(350);
  });
});

import { celestialOpacity } from './sceneMath';

describe('celestialOpacity', () => {
  it('shows the sun or moon fully in fair weather', () => expect(celestialOpacity(30, 'none')).toBe(1));
  it('fades it behind a heavy overcast', () => expect(celestialOpacity(90, 'none')).toBe(0.35));
  it('hides it while it rains or snows', () => {
    expect(celestialOpacity(100, 'rain')).toBe(0);
    expect(celestialOpacity(100, 'snow')).toBe(0);
  });
});
