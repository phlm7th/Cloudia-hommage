import type { HourPoint } from '../data/types';
import { extremes } from '../domain/daySummary';
import { t, type Lang } from '../i18n';
import { smoothArea, smoothSegments, type Pt } from './smoothPath';
import { svgEl } from './svg';

export interface TempChartInput {
  lang: Lang;
  today: HourPoint[];
  reference: HourPoint[];
  referenceLabel: string;
  selectedHour: number;
  width: number;
  height: number;
}

const PAD = 0.15;

/** PRD F3: today's hourly curve over the reference day (yesterday), difference as a filled area. */
export function renderTempChart(input: TempChartInput): SVGSVGElement {
  const { lang, today, reference, referenceLabel, selectedHour, width, height } = input;
  const svg = svgEl('svg', { class: 'temp-chart', viewBox: `0 0 ${width} ${height}`, width, height, role: 'img' });

  const values = [...today, ...reference].map((p) => p.temp).filter((v): v is number => v !== null);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  const top = hi + span * PAD;
  const bottom = lo - span * PAD;

  const x = (hour: number) => ((hour + 0.5) / 24) * width;
  const y = (temp: number) => ((top - temp) / (top - bottom)) * height;
  const pointsOf = (hours: HourPoint[]): (Pt | null)[] =>
    Array.from({ length: 24 }, (_, hr) => {
      const temp = hours.find((p) => p.hour === hr)?.temp ?? null;
      return temp === null ? null : { x: x(hr), y: y(temp) };
    });

  const todayPts = pointsOf(today);
  const refPts = pointsOf(reference);

  svg.append(
    svgEl('text', { class: 'ref-label', x: 0, y: 14 }, referenceLabel),
    svgEl('path', { class: 'ref-area', d: smoothArea(refPts, todayPts) }),
    svgEl('path', { class: 'today-line', d: smoothSegments(todayPts) }),
  );

  const ext = extremes(today);
  if (ext) {
    svg.append(
      svgEl('text', { class: 'extreme-max', x: x(ext.max.hour), y: y(ext.max.temp) - 10 }, `${Math.round(ext.max.temp)}°`),
      svgEl('text', { class: 'extreme-min', x: x(ext.min.hour), y: y(ext.min.temp) + 22 }, `${Math.round(ext.min.temp)}°`),
    );
    svg.setAttribute(
      'aria-label',
      t(lang, 'aria.tempChart', {
        max: Math.round(ext.max.temp),
        maxH: ext.max.hour,
        min: Math.round(ext.min.temp),
        minH: ext.min.hour,
      }),
    );
  }

  const sel = todayPts[selectedHour];
  const selTemp = today.find((p) => p.hour === selectedHour)?.temp ?? null;
  if (sel && selTemp !== null) {
    const badge = svgEl('g', { class: 'badge', transform: `translate(${sel.x} ${sel.y})` });
    badge.append(svgEl('circle', { r: 18 }), svgEl('text', { y: 6 }, String(Math.round(selTemp))));
    svg.append(badge);
  }
  return svg;
}
