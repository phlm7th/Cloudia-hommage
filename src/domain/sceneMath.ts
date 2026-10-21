/** '2026-10-21T06:45' (location local time) → 6.75 */
export function toHourFraction(iso: string | null): number | null {
  if (!iso) return null;
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? Number(m[1]) + Number(m[2]) / 60 : null;
}

const DEFAULT_SUNRISE = 6;
const DEFAULT_SUNSET = 18;
const TWILIGHT_H = 0.75;

/** t: 0 at sunrise → 1 at sunset. Missing times fall back to a 6–18 day. */
export function sunPosition(hour: number, sunrise: number | null, sunset: number | null): { t: number; up: boolean } {
  const rise = sunrise ?? DEFAULT_SUNRISE;
  const set = sunset ?? DEFAULT_SUNSET;
  const t = (hour - rise) / (set - rise);
  return { t, up: t >= 0 && t <= 1 };
}

export type SkyPhase = 'night' | 'twilight' | 'day';

export function skyPhase(hour: number, sunrise: number | null, sunset: number | null): SkyPhase {
  if (sunrise === null || sunset === null) return 'day';
  if (Math.abs(hour - sunrise) <= TWILIGHT_H || Math.abs(hour - sunset) <= TWILIGHT_H) return 'twilight';
  return hour > sunrise && hour < sunset ? 'day' : 'night';
}

const PALETTE: Record<SkyPhase, [string, string]> = {
  night: ['#0b1a33', '#1f3b63'],
  twilight: ['#3a4f7a', '#f2a477'],
  day: ['#2f7fc1', '#9fd3f0'],
};
const RAINY_DAY: [string, string] = ['#4b6280', '#8fa3b8'];
const OVERCAST = '#8a9bb0';

function mix(a: string, b: string, w: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return (
    '#' +
    [0, 1, 2]
      .map((i) => Math.round(ch(a, i) * (1 - w) + ch(b, i) * w).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function skyColors(phase: SkyPhase, cloud: number, precip: boolean): [top: string, bottom: string] {
  const base = precip && phase === 'day' ? RAINY_DAY : PALETTE[phase];
  return cloud >= 80 ? [mix(base[0], OVERCAST, 0.5), mix(base[1], OVERCAST, 0.5)] : [base[0], base[1]];
}

export function cloudCount(cloudPercent: number): number {
  return Math.max(0, Math.min(8, Math.round((cloudPercent / 100) * 8)));
}

export function particleCount(kind: 'none' | 'rain' | 'snow', pop: number): number {
  if (kind === 'rain') return Math.min(200, Math.round(40 + pop * 1.6));
  if (kind === 'snow') return Math.min(100, Math.round(20 + pop * 0.8));
  return 0;
}
