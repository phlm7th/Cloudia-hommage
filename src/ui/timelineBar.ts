import type { DayPoint, HourPoint } from '../data/types';
import { skySegments } from '../domain/daySummary';
import { toHourFraction } from '../domain/sceneMath';
import { conditionOf } from '../domain/weatherCode';
import { iconSvg } from './icons';

export interface TimelineInput {
  hours: HourPoint[];
  day: DayPoint;
  selectedHour: number;
  nowHour: number | null;
  label: string;
}

const TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const pct = (hour: number) => `${(hour / 24) * 100}%`;

function el(tag: string, cls: string, left?: number, html?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = cls;
  if (left !== undefined) node.style.left = pct(left);
  if (html !== undefined) node.innerHTML = html;
  return node;
}

/** PRD F2 + F4: fixed 0–24h timeline whose bar is the 3-state sky. */
export function renderTimeline(input: TimelineInput): HTMLElement {
  const { hours, day, selectedHour, nowHour, label } = input;
  const root = el('section', 'timeline');
  root.append(el('div', 'timeline-title', undefined, label));

  const markers = el('div', 'timeline-markers');
  const sunrise = toHourFraction(day.sunrise);
  const sunset = toHourFraction(day.sunset);
  if (sunrise !== null) markers.append(el('span', 'sunrise', sunrise, iconSvg('sun', { size: 14 })));
  if (sunset !== null) markers.append(el('span', 'sunset', sunset, iconSvg('moon', { size: 14, moonPhase: day.moonPhase ?? 0.5 })));
  root.append(markers);

  const bar = el('div', 'timeline-bar');
  for (const seg of skySegments(hours)) {
    if (seg.state === 'clear') continue;
    const node = el('div', `sky-seg sky-${seg.state}`, seg.start);
    node.style.width = pct(seg.end - seg.start);
    bar.append(node);
  }
  for (let h = 1; h < 24; h++) {
    if (h % 3 !== 0) bar.append(el('span', 'tick-dot', h));
  }
  for (const h of TICKS) {
    bar.append(el('span', 'tick-label', h, String(h === 0 ? 0 : ((h - 1) % 12) + 1)));
  }
  if (nowHour !== null) bar.append(el('span', 'now', nowHour + 0.5));

  const code = hours.find((p) => p.hour === selectedHour)?.code ?? null;
  const cond = conditionOf(code);
  bar.append(el('span', 'cursor', selectedHour + 0.5, cond ? iconSvg(cond, { size: 26 }) : ''));
  root.append(bar);
  return root;
}
