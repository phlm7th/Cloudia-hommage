import { describe, it, expect } from 'vitest';
import { hourFromDrag } from './swipe';

describe('hourFromDrag', () => {
  it('moves one hour per 1/24 of the width', () => expect(hourFromDrag(10, 320 / 24, 320)).toBe(11));
  it('moves back when dragging left', () => expect(hourFromDrag(10, (-320 / 24) * 3, 320)).toBe(7));
  it('clamps at 0 and 23', () => {
    expect(hourFromDrag(1, -1000, 320)).toBe(0);
    expect(hourFromDrag(22, 1000, 320)).toBe(23);
  });
  it('stays put for a zero width', () => expect(hourFromDrag(5, 100, 0)).toBe(5));
});
