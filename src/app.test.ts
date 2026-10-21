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
    expect(f).toHaveBeenCalledWith(expect.stringContaining('latitude=37.5665'), expect.anything());
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

describe('places', () => {
  it('opens the place list and compares another city with here', async () => {
    localStorage.setItem('cloudia.places.v1', JSON.stringify([{ id: 'geo-1', name: '도쿄', lat: 35.69, lon: 139.69 }]));
    const f = fakeFetch();
    await startApp(root, { fetch: f, geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    root.querySelector<HTMLButtonElement>('button.place-name')!.click();
    expect(root.querySelector('.cities')).not.toBeNull();

    root.querySelectorAll<HTMLButtonElement>('.saved .pick')[1].click();
    await vi.waitFor(() => expect(root.querySelector('button.place-name')!.textContent).toBe('도쿄'));
    expect(f).toHaveBeenCalledWith(expect.stringContaining('latitude=35.69'), expect.anything());
    expect(root.querySelector('.weekly-chart .day')!.textContent).toBe('여기');
    expect(root.querySelector('p.compare')!.textContent).toBe('여기와 비슷해요');
  });
});

describe('review fixes', () => {
  it('keeps the data credit outside the scrolling content so it stays visible on every screen', async () => {
    await startApp(root, { fetch: fakeFetch(), geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    const credit = root.querySelector(':scope > .credit');
    expect(credit?.querySelector('a[href="https://open-meteo.com/"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('button.place-name')!.click();
    expect((root.querySelector(':scope > .credit') as HTMLElement).hidden).toBe(false);
  });

  it('closes the place list with the browser back button', async () => {
    history.replaceState(null, '', '#/');
    await startApp(root, { fetch: fakeFetch(), geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    root.querySelector<HTMLButtonElement>('button.place-name')!.click();
    expect(location.hash).toBe('#/cities');
    history.back();
    await vi.waitFor(() => expect(root.querySelector<HTMLElement>('.cities-layer')!.hidden).toBe(true));
    expect(root.querySelector<HTMLElement>('.screen')!.hidden).toBe(false);
  });

  it('starts on the main screen even when launched at #/cities', async () => {
    history.replaceState(null, '', '#/cities');
    await startApp(root, { fetch: fakeFetch(), geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    expect(location.hash).toBe('#/');
    expect(root.querySelector<HTMLElement>('.cities-layer')!.hidden).toBe(true);
  });

  it('falls back to Seoul after 8s, then switches when the position arrives late', async () => {
    let grant!: (pos: GeolocationPosition) => void;
    const slowGeo = {
      getCurrentPosition: (ok: PositionCallback) => {
        grant = ok;
      },
    } as unknown as Geolocation;
    const f = fakeFetch();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const started = startApp(root, { fetch: f, geolocation: slowGeo, lang: 'ko', now: () => FIXED_NOW });
      await vi.advanceTimersByTimeAsync(8000);
      await started;
    } finally {
      vi.useRealTimers();
    }
    expect(root.querySelector('button.place-name')!.textContent).toBe('서울');

    grant({ coords: { latitude: 35.1796, longitude: 129.0756 } } as GeolocationPosition);
    await vi.waitFor(() => expect(root.querySelector('button.place-name')!.textContent).toBe('현재 위치'));
    expect(f).toHaveBeenCalledWith(expect.stringContaining('latitude=35.1796'), expect.anything());
  });

  it('dates the update banner when the cache is from an earlier day', async () => {
    await startApp(root, { fetch: fakeFetch(), geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
    document.body.innerHTML = '<div id="app"></div>';
    root = document.getElementById('app')!;
    const offline = vi.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    await startApp(root, { fetch: offline, geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW + 24 * 3600_000 });
    expect(root.querySelector('.stale')!.textContent).toBe('마지막 갱신 10/21 09:00');
  });

  const shifted = (delta: number) => ({
    ...fixture,
    hourly: { ...fixture.hourly, temperature_2m: fixture.hourly.temperature_2m.map((v) => (v === null ? null : v + delta)) },
  });
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it('keeps the latest city when an earlier request answers last', async () => {
    localStorage.setItem(
      'cloudia.places.v1',
      JSON.stringify([
        { id: 'geo-1', name: '도쿄', lat: 35.69, lon: 139.69 },
        { id: 'geo-2', name: '뉴욕', lat: 40.71, lon: -74.01 },
      ]),
    );
    let releaseTokyo!: () => void;
    const f = vi.fn((url: string) => {
      if (url.includes('latitude=35.69')) return new Promise<Response>((r) => (releaseTokyo = () => r(ok(shifted(10)))));
      if (url.includes('latitude=40.71')) return Promise.resolve(ok(shifted(20)));
      return Promise.resolve(ok(fixture));
    }) as unknown as typeof fetch;
    await startApp(root, { fetch: f, geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });

    root.querySelector<HTMLButtonElement>('button.place-name')!.click();
    root.querySelectorAll<HTMLButtonElement>('.saved .pick')[1].click(); // Tokyo, pending
    root.querySelector<HTMLButtonElement>('button.place-name')!.click();
    root.querySelectorAll<HTMLButtonElement>('.saved .pick')[2].click(); // New York, immediate
    await vi.waitFor(() => expect(root.querySelector('button.place-name')!.textContent).toBe('뉴욕'));
    releaseTokyo();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const todayMax = Math.max(...fixture.hourly.temperature_2m.slice(24, 48).filter((v): v is number => v !== null));
    expect(root.querySelector('button.place-name')!.textContent).toBe('뉴욕');
    expect(root.querySelector('svg.temp-chart text.extreme-max')!.textContent).toBe(`${Math.round(todayMax + 20)}°`);
  });
});
