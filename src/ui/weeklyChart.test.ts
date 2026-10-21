import { describe, it, expect } from 'vitest';
import type { DayPoint } from '../data/types';
import { weeklyColumns, renderWeeklyChart } from './weeklyChart';

const day = (date: string, max: number | null, min: number | null, code = 3): DayPoint => ({
  date, max, min, code, sunrise: null, sunset: null, moonPhase: null,
});
const days = [
  day('2026-10-20', 32, 24, 61),
  day('2026-10-21', 29, 23, 61),
  day('2026-10-22', 30, 21, 61),
  day('2026-10-23', 31, 20, 2),
  day('2026-10-24', 31, 20, 0),
  day('2026-10-25', 31, 19, 2),
];
const hereToday = day('2026-10-21', 6, -7, 95);

describe('weeklyColumns', () => {
  it('labels yesterday, today, then weekdays', () => {
    const cols = weeklyColumns('en', days);
    expect(cols.map((c) => c.label)).toEqual(["Y'day", 'Today', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(cols[0].muted).toBe(true);
    expect(cols[1].muted).toBe(false);
  });

  it('uses Korean weekday names', () => {
    expect(weeklyColumns('ko', days).map((c) => c.label)).toEqual(['어제', '오늘', '목', '금', '토', '일']);
  });

  it('uses the reference place as the first column for another city', () => {
    const cols = weeklyColumns('ko', days, { day: hereToday, label: '내 위치' });
    expect(cols[0]).toMatchObject({ label: '내 위치', max: 6, min: -7, muted: true });
    expect(cols).toHaveLength(6);
  });
});

describe('renderWeeklyChart', () => {
  it('draws one range area and 6 max/min labels', () => {
    const svg = renderWeeklyChart(weeklyColumns('en', days), 320, 200);
    expect(svg.querySelectorAll('path.range-area')).toHaveLength(1);
    expect([...svg.querySelectorAll('text.max')].map((n) => n.textContent)).toEqual(['32°', '29°', '30°', '31°', '31°', '31°']);
    expect(svg.querySelectorAll('text.min')).toHaveLength(6);
    expect(svg.querySelectorAll('.col.muted')).toHaveLength(1);
  });

  it('leaves a gap for a day without values', () => {
    const cols = weeklyColumns('en', days.map((d, i) => (i === 3 ? day(d.date, null, null) : d)));
    const svg = renderWeeklyChart(cols, 320, 200);
    expect(svg.querySelectorAll('text.max')).toHaveLength(5);
  });
});
