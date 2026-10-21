import type { DayPoint } from '../data/types';
import { conditionOf } from '../domain/weatherCode';
import { t, type Lang } from '../i18n';
import { iconSvg } from './icons';
import { smoothArea, type Pt } from './smoothPath';
import { svgEl } from './svg';

export interface WeeklyColumn {
  label: string;
  max: number | null;
  min: number | null;
  code: number | null;
  muted: boolean;
}

/**
 * PRD F6 + F7-2: [Y'day | reference place], Today, then 4 weekdays.
 * For another city the first column is the user's own place, labelled so it can't be read as that city.
 */
export function weeklyColumns(
  lang: Lang,
  days: DayPoint[],
  reference?: { day: DayPoint; label: string },
): WeeklyColumn[] {
  const weekday = new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' });
  const col = (d: DayPoint, label: string, muted = false): WeeklyColumn => ({
    label, max: d.max, min: d.min, code: d.code, muted,
  });
  return [
    reference ? col(reference.day, reference.label, true) : col(days[0], t(lang, 'label.yday'), true),
    col(days[1], t(lang, 'label.todayCol')),
    ...days.slice(2, 6).map((d) => col(d, weekday.format(new Date(`${d.date}T00:00:00Z`)))),
  ];
}

const LABEL_Y = 18;
const ICON_Y = 26;
const ICON_SIZE = 28;

/** Max/min as one filled range so the daily spread reads as a single shape. */
export function renderWeeklyChart(cols: WeeklyColumn[], width: number, height: number): SVGSVGElement {
  const svg = svgEl('svg', { class: 'weekly-chart', viewBox: `0 0 ${width} ${height}`, width, height });
  const values = cols.flatMap((c) => [c.max, c.min]).filter((v): v is number => v !== null);
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  const span = Math.max(hi - lo, 1);
  const top = ICON_Y + ICON_SIZE + 34;
  const bottom = height - 30;

  const x = (i: number) => ((i + 0.5) / cols.length) * width;
  const y = (v: number) => top + ((hi - v) / span) * (bottom - top);

  const maxPts: (Pt | null)[] = cols.map((c, i) => (c.max === null ? null : { x: x(i), y: y(c.max) }));
  const minPts: (Pt | null)[] = cols.map((c, i) => (c.min === null ? null : { x: x(i), y: y(c.min) }));
  svg.append(svgEl('path', { class: 'range-area', d: smoothArea(maxPts, minPts) }));

  cols.forEach((c, i) => {
    const g = svgEl('g', { class: c.muted ? 'col muted' : 'col' });
    g.append(svgEl('text', { class: 'day', x: x(i), y: LABEL_Y }, c.label));
    const cond = conditionOf(c.code);
    if (cond) {
      const icon = svgEl('g', { class: 'icon', transform: `translate(${x(i) - ICON_SIZE / 2} ${ICON_Y})` });
      icon.innerHTML = iconSvg(cond, { size: ICON_SIZE });
      g.append(icon);
    }
    const maxP = maxPts[i];
    const minP = minPts[i];
    if (maxP && c.max !== null) g.append(svgEl('text', { class: 'max', x: maxP.x, y: maxP.y - 8 }, `${Math.round(c.max)}°`));
    if (minP && c.min !== null) g.append(svgEl('text', { class: 'min', x: minP.x, y: minP.y + 20 }, `${Math.round(c.min)}°`));
    svg.append(g);
  });
  return svg;
}
