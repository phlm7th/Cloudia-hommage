import { describe, it, expect, vi } from 'vitest';
import { buildGeocodingUrl, parseGeocoding, searchPlaces } from './geocoding';

describe('geocoding', () => {
  it('builds a search URL with language and count', () => {
    const url = new URL(buildGeocodingUrl('도쿄', 'ko'));
    expect(url.origin + url.pathname).toBe('https://geocoding-api.open-meteo.com/v1/search');
    expect(url.searchParams.get('name')).toBe('도쿄');
    expect(url.searchParams.get('language')).toBe('ko');
    expect(url.searchParams.get('count')).toBe('5');
  });

  it('maps results to places', () => {
    const places = parseGeocoding({
      results: [{ id: 1850147, name: '도쿄', latitude: 35.6895, longitude: 139.69171, country: '일본' }],
    });
    expect(places).toEqual([{ id: 'geo-1850147', name: '도쿄', lat: 35.6895, lon: 139.69171, country: '일본' }]);
  });

  it('returns [] when results is missing', () => expect(parseGeocoding({})).toEqual([]));

  it('returns [] for queries shorter than 2 characters without calling the API', async () => {
    const f = vi.fn() as unknown as typeof fetch;
    expect(await searchPlaces('a', 'en', { fetch: f })).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });
});
