import { readJson, writeJson } from '../data/storage';
import type { Place } from '../data/types';

const KEY = 'cloudia.places.v1';

const isPlace = (p: unknown): p is Place => {
  const v = p as Place;
  return !!v && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.lat === 'number' && typeof v.lon === 'number';
};

export function loadPlaces(): Place[] {
  const raw = readJson<unknown>(KEY);
  return Array.isArray(raw) ? raw.filter(isPlace) : [];
}

export function savePlaces(list: Place[]): void {
  writeJson(KEY, list);
}

export function addPlace(list: Place[], p: Place): Place[] {
  return list.some((x) => x.id === p.id) ? list : [...list, p];
}

export function removePlace(list: Place[], id: string): Place[] {
  return list.filter((p) => p.id !== id);
}

export function movePlace(list: Place[], id: string, delta: -1 | 1): Place[] {
  const i = list.findIndex((p) => p.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
