import type { Lang } from '../i18n';
import type { Place } from './types';

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const MIN_QUERY = 2;

export function buildGeocodingUrl(query: string, lang: Lang): string {
  const params = new URLSearchParams({ name: query, count: '5', language: lang, format: 'json' });
  return `${ENDPOINT}?${params}`;
}

interface RawResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
}

export function parseGeocoding(json: unknown): Place[] {
  const results = (json as { results?: RawResult[] } | null)?.results;
  if (!Array.isArray(results)) return [];
  return results.map((r) => ({
    id: `geo-${r.id}`,
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    ...(r.country ? { country: r.country } : {}),
  }));
}

export async function searchPlaces(query: string, lang: Lang, deps: { fetch?: typeof fetch } = {}): Promise<Place[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY) return [];
  const res = await (deps.fetch ?? fetch)(buildGeocodingUrl(q, lang));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseGeocoding(await res.json());
}
