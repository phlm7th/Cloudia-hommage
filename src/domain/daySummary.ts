import type { HourPoint } from '../data/types';
import { t, type Lang } from '../i18n';
import { skyStateOf, type SkyState } from './weatherCode';

export interface SkySegment {
  state: SkyState;
  /** inclusive hour */
  start: number;
  /** exclusive hour, up to 24 */
  end: number;
}

/** Collapse consecutive hours with the same sky state into one bar (PRD F4-3). */
export function skySegments(hours: HourPoint[]): SkySegment[] {
  const out: SkySegment[] = [];
  let open: SkySegment | null = null;
  for (const p of hours) {
    const state = skyStateOf(p.code);
    if (open && state === open.state && p.hour === open.end) {
      open.end = p.hour + 1;
      continue;
    }
    if (open) out.push(open);
    open = state === null ? null : { state, start: p.hour, end: p.hour + 1 };
  }
  if (open) out.push(open);
  return out;
}

export interface Extreme {
  hour: number;
  temp: number;
}

export function extremes(hours: HourPoint[]): { max: Extreme; min: Extreme } | null {
  let max: Extreme | null = null;
  let min: Extreme | null = null;
  for (const { hour, temp } of hours) {
    if (temp === null) continue;
    if (!max || temp > max.temp) max = { hour, temp };
    if (!min || temp < min.temp) min = { hour, temp };
  }
  return max && min ? { max, min } : null;
}

/** Always against yesterday — the app's core comparison (PRD 2.3, P2), whichever city is shown. */
export function compareSentence(lang: Lang, value: number | null, yesterday: number | null): string | null {
  if (value === null || yesterday === null) return null;
  const d = Math.round(value - yesterday);
  if (Math.abs(d) <= 1) return t(lang, 'cmp.same');
  return t(lang, d > 0 ? 'cmp.warmer' : 'cmp.cooler', { d: Math.abs(d) });
}
