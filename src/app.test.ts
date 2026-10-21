import { describe, it, expect, beforeEach, vi } from 'vitest';
import fixture from './data/__fixtures__/forecast-seoul.json';
import { startApp } from './app';

const FIXED_NOW = Date.UTC(2026, 9, 21, 0, 0); // 09:00 in Seoul, fixture "today"
const deniedGeo = {
  getCurrentPosition: (_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    fail?.({ code: 1, message: 'denied' } as GeolocationPositionError),
} as unknown as Geolocation;

let root: HTMLElement;
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

const fakeFetch = () =>
  vi.fn(async (_url: string) => new Response(JSON.stringify(fixture), { status: 200 })) as unknown as typeof fetch;

describe('startApp', () => {
  it('falls back to Seoul when geolocation is denied', async () => {
    const f = fakeFetch();
    await startApp(root, { fetch: f, geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    expect(f).toHaveBeenCalledWith(expect.stringContaining('latitude=37.5665'));
    expect(root.querySelector('h1.condition')!.textContent).not.toBe('');
  });

  it('selects the current local hour of the place', async () => {
    await startApp(root, { fetch: fakeFetch(), geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    const expected = Math.round(fixture.hourly.temperature_2m[24 + 9]!);
    expect(root.querySelector('g.badge text')!.textContent).toBe(String(expected));
  });

  it('renders the timeline, both charts and the data credit', async () => {
    await startApp(root, { fetch: fakeFetch(), geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    expect(root.querySelector('.timeline')).not.toBeNull();
    expect(root.querySelector('svg.temp-chart')).not.toBeNull();
    expect(root.querySelector('svg.weekly-chart')).not.toBeNull();
    expect(root.querySelector('a[href="https://open-meteo.com/"]')!.textContent).toContain('Open-Meteo');
  });

  it('shows retry when there is no data at all', async () => {
    const offline = vi.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    await startApp(root, { fetch: offline, geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    expect(root.textContent).toContain('날씨를 불러오지 못했어요');
    expect(root.querySelector('button.retry')).not.toBeNull();
  });

  it('shows the last update time when serving stale data', async () => {
    await startApp(root, { fetch: fakeFetch(), geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
    const offline = vi.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    await startApp(root, { fetch: offline, geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW + 3600_000 });
    expect(root.querySelector('.stale')!.textContent).toBe('마지막 갱신 09:00');
  });
});
