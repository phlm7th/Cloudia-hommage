import { describe, it, expect } from 'vitest';
import { smoothPath, smoothSegments } from './smoothPath';

const numbers = (d: string) =>
  d.replace(/[MCL]/g, ' ').trim().split(/[\s,]+/).map(Number);

describe('smoothPath', () => {
  it('passes through every point', () => {
    const d = smoothPath([{ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 20, y: 5 }]);
    expect(d.startsWith('M0 10')).toBe(true);
    expect(d).toContain(' 10 0');
    expect(d.trim().endsWith('20 5')).toBe(true);
  });

  it('keeps control points within the neighbor y range (no overshoot)', () => {
    const d = smoothPath([0, 0, 10, 10].map((y, i) => ({ x: i * 10, y })));
    const ys = numbers(d).filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(10);
  });

  it('handles a single point and an empty list', () => {
    expect(smoothPath([{ x: 3, y: 4 }])).toBe('M3 4');
    expect(smoothPath([])).toBe('');
  });
});

describe('smoothSegments', () => {
  it('breaks the path at null', () => {
    const d = smoothSegments([{ x: 0, y: 0 }, { x: 1, y: 1 }, null, { x: 3, y: 3 }, { x: 4, y: 4 }]);
    expect(d.match(/M/g)).toHaveLength(2);
  });
});
