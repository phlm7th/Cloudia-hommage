import { describe, it, expect } from 'vitest';
import type { DayPoint, HourPoint } from '../data/types';
import { renderTimeline, type TimelineInput } from './timelineBar';
import { iconSvg } from './icons';

const hours: HourPoint[] = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  temp: 20,
  code: hour < 9 ? 0 : hour < 15 ? 3 : 61,
  cloud: 0,
  wind: 0,
  pop: 0,
}));
const day: DayPoint = {
  date: '2026-10-21',
  max: 28,
  min: 19,
  code: 3,
  sunrise: '2026-10-21T06:45',
  sunset: '2026-10-21T17:47',
  moonPhase: 0.33,
};
const input: TimelineInput = { hours, day, selectedHour: 10, nowHour: 9, label: 'TODAY' };
const pct = (h: number) => `${(h / 24) * 100}%`;

describe('renderTimeline', () => {
  it('renders 9 hour labels in order', () => {
    const el = renderTimeline(input);
    expect([...el.querySelectorAll('.tick-label')].map((n) => n.textContent)).toEqual([
      '0', '3', '6', '9', '12', '3', '6', '9', '12',
    ]);
    expect(el.querySelector('.timeline-title')!.textContent).toBe('TODAY');
  });

  it('renders cloud and precip segments but not clear', () => {
    const el = renderTimeline(input);
    expect(el.querySelectorAll('.sky-clear')).toHaveLength(0);
    const cloud = el.querySelector<HTMLElement>('.sky-cloud')!;
    expect(cloud.style.left).toBe('37.5%');
    expect(cloud.style.width).toBe('25%');
    expect(el.querySelector('.sky-precip')).not.toBeNull();
  });

  it('places sunrise and sunset at their local times', () => {
    const el = renderTimeline(input);
    expect(el.querySelector<HTMLElement>('.sunrise')!.style.left).toBe(pct(6.75));
    expect(el.querySelector<HTMLElement>('.sunset')!.style.left).toBe(pct(17 + 47 / 60));
  });

  it('omits sunrise and sunset markers when missing', () => {
    const el = renderTimeline({ ...input, day: { ...day, sunrise: null, sunset: null } });
    expect(el.querySelector('.sunrise')).toBeNull();
    expect(el.querySelector('.sunset')).toBeNull();
  });

  it('puts the cursor at the middle of the selected hour', () => {
    const el = renderTimeline(input);
    expect(el.querySelector<HTMLElement>('.cursor')!.style.left).toBe(pct(10.5));
  });
});

describe('iconSvg', () => {
  it('returns an svg for every icon name', () => {
    for (const name of ['sun', 'moon', 'clear', 'partlyCloudy', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'thunder'] as const) {
      expect(iconSvg(name)).toMatch(/^<svg[\s\S]*<\/svg>$/);
    }
  });
});
