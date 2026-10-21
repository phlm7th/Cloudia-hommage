export type SkyState = 'clear' | 'cloud' | 'precip';
export type Condition = 'clear' | 'partlyCloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

const inRange = (c: number, lo: number, hi: number) => c >= lo && c <= hi;

/** WMO weather interpretation code → condition (PRD 8.2). */
export function conditionOf(code: number | null): Condition | null {
  if (code === null) return null;
  if (code <= 1) return 'clear';
  if (code === 2) return 'partlyCloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (inRange(code, 51, 57)) return 'drizzle';
  if (inRange(code, 61, 67) || inRange(code, 80, 82)) return 'rain';
  if (inRange(code, 71, 77) || code === 85 || code === 86) return 'snow';
  if (inRange(code, 95, 99)) return 'thunder';
  return 'cloudy';
}

const SKY: Record<Condition, SkyState> = {
  clear: 'clear',
  partlyCloudy: 'cloud',
  cloudy: 'cloud',
  fog: 'cloud',
  drizzle: 'precip',
  rain: 'precip',
  snow: 'precip',
  thunder: 'precip',
};

export function skyStateOf(code: number | null): SkyState | null {
  const c = conditionOf(code);
  return c === null ? null : SKY[c];
}

export function precipKindOf(code: number | null): 'none' | 'rain' | 'snow' {
  const c = conditionOf(code);
  if (c === 'snow') return 'snow';
  if (c === 'drizzle' || c === 'rain' || c === 'thunder') return 'rain';
  return 'none';
}
