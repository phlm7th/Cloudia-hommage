import { describe, it, expect, afterEach, vi } from 'vitest';
import { readJson, writeJson } from './storage';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('storage', () => {
  it('round-trips JSON values', () => {
    expect(writeJson('k', { a: 1 })).toBe(true);
    expect(readJson('k')).toEqual({ a: 1 });
  });

  it('returns null for missing or corrupt values', () => {
    expect(readJson('missing')).toBeNull();
    localStorage.setItem('bad', '{oops');
    expect(readJson('bad')).toBeNull();
  });

  it('survives a storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(readJson('k')).toBeNull();
    expect(writeJson('k', 1)).toBe(false);
  });
});
