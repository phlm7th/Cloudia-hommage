export type IconName =
  | 'sun' | 'moon' | 'clear' | 'partlyCloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

const SUN_COLOR = '#ffc93c';
const CLOUD = 'M7 18a4 4 0 0 1-.6-7.96A5.5 5.5 0 0 1 17 9.5a3.75 3.75 0 0 1 .25 7.5z';

const sun = (cx = 12, cy = 12, r = 4.2) => {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const p = (d: number) => `${(cx + Math.cos(a) * d).toFixed(2)} ${(cy + Math.sin(a) * d).toFixed(2)}`;
    return `M${p(r + 2)}L${p(r + 4)}`;
  }).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN_COLOR}"/><path d="${rays}" stroke="${SUN_COLOR}" stroke-width="1.6" stroke-linecap="round"/>`;
};
const cloud = (fill = '#fff', dy = 0) => `<path d="${CLOUD}" fill="${fill}" transform="translate(0 ${dy})"/>`;
const drops = (n: number) =>
  Array.from({ length: n }, (_, i) => `<path d="M${8 + i * 4} 19.5l-1 2.5" stroke="#5ab0ff" stroke-width="1.6" stroke-linecap="round"/>`).join('');

let moonSeq = 0;
/** phase: 0 = new, 0.5 = full, 1 = new (Open-Meteo moon_phase). */
const moon = (phase = 0.5) => {
  const id = `moon-clip-${++moonSeq}`;
  const lit = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
  const waxing = phase < 0.5;
  const shift = (waxing ? -1 : 1) * lit * 16;
  return `<defs><clipPath id="${id}"><circle cx="12" cy="12" r="8"/></clipPath></defs>
<circle cx="12" cy="12" r="8" fill="#fff3c4"/>
<circle cx="${(12 + shift).toFixed(2)}" cy="12" r="8" fill="#1f3b63" fill-opacity="0.85" clip-path="url(#${id})"/>`;
};

const BODY: Record<Exclude<IconName, 'moon'>, () => string> = {
  sun: () => sun(),
  clear: () => sun(),
  partlyCloudy: () => sun(9, 8, 3.6) + cloud('#fff', 2),
  cloudy: () => cloud('#e8eef5'),
  fog: () => '<path d="M4 9h16M3 13h18M5 17h14" stroke="#e8eef5" stroke-width="2" stroke-linecap="round"/>',
  drizzle: () => cloud('#fff', -3) + drops(2),
  rain: () => cloud('#fff', -3) + drops(3),
  snow: () =>
    cloud('#fff', -3) +
    [8, 12, 16].map((x) => `<circle cx="${x}" cy="20.5" r="1.3" fill="#fff"/>`).join(''),
  thunder: () => cloud('#fff', -3) + `<path d="M12.5 15l-2.5 4h2.5l-1.5 4" stroke="${SUN_COLOR}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`,
};

export function iconSvg(name: IconName, opts: { moonPhase?: number; size?: number } = {}): string {
  const size = opts.size ?? 24;
  const body = name === 'moon' ? moon(opts.moonPhase ?? 0.5) : BODY[name]();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}
