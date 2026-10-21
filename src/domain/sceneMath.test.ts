import { describe, it, expect } from 'vitest';
import { toHourFraction } from './sceneMath';

describe('toHourFraction', () => {
  it('parses local ISO time', () => expect(toHourFraction('2026-10-21T06:45')).toBe(6.75));
  it('returns null for missing values', () => expect(toHourFraction(null)).toBeNull());
});
