import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Place } from '../data/types';
import { addPlace, removePlace, movePlace, loadPlaces, savePlaces } from './places';

const tokyo: Place = { id: 'geo-1', name: 'Tokyo', lat: 35.7, lon: 139.7 };
const paris: Place = { id: 'geo-2', name: 'Paris', lat: 48.9, lon: 2.35 };

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('places', () => {
  it('addPlace appends and ignores duplicates', () => {
    expect(addPlace([], tokyo)).toEqual([tokyo]);
    expect(addPlace([tokyo], tokyo)).toEqual([tokyo]);
  });

  it('removePlace drops by id', () => expect(removePlace([tokyo, paris], 'geo-1')).toEqual([paris]));

  it('movePlace swaps neighbors and stays in bounds', () => {
    expect(movePlace([tokyo, paris], 'geo-2', -1).map((p) => p.id)).toEqual(['geo-2', 'geo-1']);
    expect(movePlace([tokyo, paris], 'geo-1', -1).map((p) => p.id)).toEqual(['geo-1', 'geo-2']);
    expect(movePlace([tokyo, paris], 'geo-2', 1).map((p) => p.id)).toEqual(['geo-1', 'geo-2']);
  });

  it('persists the list', () => {
    savePlaces([tokyo, paris]);
    expect(loadPlaces()).toEqual([tokyo, paris]);
  });

  it('loadPlaces returns [] when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadPlaces()).toEqual([]);
  });

  it('loadPlaces ignores malformed data', () => {
    localStorage.setItem('cloudia.places.v1', '{"not":"a list"}');
    expect(loadPlaces()).toEqual([]);
  });
});
