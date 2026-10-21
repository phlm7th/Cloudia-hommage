import { describe, it, expect } from 'vitest';
import type { HourPoint } from '../data/types';
import { renderTempChart } from './tempChart';

const series = (temps: (number | null)[]): HourPoint[] =>
  temps.map((temp, hour) => ({ hour, temp, code: 0, cloud: 0, wind: 0, pop: 0 }));

// today: min 19° at 05h, max 28° at 15h
const todayTemps = [22, 21, 21, 20, 20, 19, 20, 21, 22, 23, 24, 25, 26, 27, 27, 28, 27, 26, 25, 24, 23, 22, 22, 21];
const yesterdayTemps = todayTemps.map((v) => v + 2);
const today = series(todayTemps);
const yesterday = series(yesterdayTemps);

const render = (over: Partial<Parameters<typeof renderTempChart>[0]> = {}) =>
  renderTempChart({
    lang: 'ko',
    today,
    reference: yesterday,
    referenceLabel: 'YESTERDAY',
    selectedHour: 15,
    width: 320,
    height: 160,
    ...over,
  });

describe('renderTempChart', () => {
  it('draws the reference area and today line', () => {
    const svg = render();
    expect(svg.querySelector('path.ref-area')?.getAttribute('d')).toMatch(/^M/);
    expect(svg.querySelector('path.today-line')?.getAttribute('d')).toMatch(/^M/);
  });

  it('labels max and min at their hours', () => {
    const svg = render();
    const max = svg.querySelector('text.extreme-max')!;
    const min = svg.querySelector('text.extreme-min')!;
    expect(max.textContent).toBe('28°');
    expect(min.textContent).toBe('19°');
    expect(Number(max.getAttribute('x'))).toBeCloseTo(((15 + 0.5) / 24) * 320);
    expect(Number(min.getAttribute('x'))).toBeCloseTo(((5 + 0.5) / 24) * 320);
  });

  it('shows the selected hour temperature in the badge', () => {
    expect(render({ selectedHour: 9 }).querySelector('g.badge text')!.textContent).toBe('23');
  });

  it('hides the badge when the selected hour has no value', () => {
    const gap = series(todayTemps.map((v, i) => (i === 9 ? null : v)));
    expect(render({ today: gap, selectedHour: 9 }).querySelector('g.badge')).toBeNull();
  });

  it('shows the reference label and an accessible summary', () => {
    const svg = render();
    expect(svg.querySelector('text.ref-label')!.textContent).toBe('YESTERDAY');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('28°');
  });

  it('renders without crashing when every value is missing', () => {
    const empty = series(Array(24).fill(null));
    const svg = render({ today: empty, reference: empty });
    expect(svg.querySelector('text.extreme-max')).toBeNull();
  });
});
