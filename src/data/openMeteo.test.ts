import { describe, it, expect, beforeEach, vi } from 'vitest';
import fixture from './__fixtures__/forecast-seoul.json';
import {
  buildForecastUrl,
  parseForecast,
  localNow,
  cacheKey,
  fetchWeather,
  WeatherUnavailableError,
} from './openMeteo';

const SEOUL = { lat: 37.57, lon: 126.98 };
const T0 = Date.UTC(2026, 9, 21, 0, 0);
const okFetch = () =>
  vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 })) as unknown as typeof fetch;

beforeEach(() => localStorage.clear());

describe('buildForecastUrl', () => {
  it('includes past_days=1 and forecast_days=5', () => {
    const url = new URL(buildForecastUrl(37.57, 126.98));
    expect(url.searchParams.get('past_days')).toBe('1');
    expect(url.searchParams.get('forecast_days')).toBe('5');
    expect(url.searchParams.get('daily')).toContain('moon_phase');
    expect(url.searchParams.get('timezone')).toBe('auto');
  });
});

describe('parseForecast', () => {
  it('splits hourly into yesterday and today', () => {
    const wx = parseForecast(fixture, 0);
    expect(wx.yesterday).toHaveLength(24);
    expect(wx.today).toHaveLength(24);
    expect(wx.days).toHaveLength(6);
    expect(wx.today[0].hour).toBe(0);
    expect(wx.today[23].hour).toBe(23);
    expect(wx.days[1].date).toBe(fixture.daily.time[1]);
    expect(wx.utcOffsetSeconds).toBe(32400);
  });

  it('keeps null values instead of dropping hours', () => {
    const wx = parseForecast(fixture, 0);
    expect(wx.today[6].temp).toBeNull();
    expect(wx.today[7].temp).toBe(fixture.hourly.temperature_2m[31]);
  });

  it('rejects a response without hourly data', () => {
    expect(() => parseForecast({ daily: {} }, 0)).toThrow();
  });
});

describe('localNow', () => {
  it('uses the place offset, not the device clock', () => {
    expect(localNow(32400, Date.UTC(2026, 9, 21, 0, 30))).toEqual({ date: '2026-10-21', hour: 9, minute: 30 });
    expect(localNow(-14400, Date.UTC(2026, 9, 21, 0, 30))).toEqual({ date: '2026-10-20', hour: 20, minute: 30 });
  });
});

describe('cacheKey', () => {
  it('rounds coordinates to one decimal', () => {
    expect(cacheKey(37.5665, 126.978)).toBe('cloudia.wx.v1:37.6,127.0');
  });
});

describe('fetchWeather', () => {
  it('returns fresh cache without network', async () => {
    const f = okFetch();
    await fetchWeather(SEOUL, { fetch: f, now: () => T0 });
    const wx = await fetchWeather(SEOUL, { fetch: f, now: () => T0 + 10 * 60_000 });
    expect(f).toHaveBeenCalledTimes(1);
    expect(wx.stale).toBe(false);
  });

  it('refetches when the cache is older than 30 minutes', async () => {
    const f = okFetch();
    await fetchWeather(SEOUL, { fetch: f, now: () => T0 });
    await fetchWeather(SEOUL, { fetch: f, now: () => T0 + 31 * 60_000 });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('refetches a fresh cache once the local date has rolled over', async () => {
    const f = okFetch();
    // fixture "today" is 2026-10-21 in Seoul; 2026-10-21T14:55Z is 23:55 there, 15:05Z is 00:05 next day
    await fetchWeather(SEOUL, { fetch: f, now: () => Date.UTC(2026, 9, 21, 14, 55) });
    await fetchWeather(SEOUL, { fetch: f, now: () => Date.UTC(2026, 9, 21, 15, 5) });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('returns stale cache when network fails', async () => {
    await fetchWeather(SEOUL, { fetch: okFetch(), now: () => T0 });
    const failing = vi.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    const wx = await fetchWeather(SEOUL, { fetch: failing, now: () => T0 + 2 * 3600_000 });
    expect(wx.stale).toBe(true);
    expect(wx.fetchedAt).toBe(T0);
  });

  it('treats an HTTP error like a network failure', async () => {
    const bad = vi.fn(async () => new Response('{"error":true}', { status: 500 })) as unknown as typeof fetch;
    await expect(fetchWeather(SEOUL, { fetch: bad, now: () => T0 })).rejects.toBeInstanceOf(WeatherUnavailableError);
  });

  it('throws WeatherUnavailableError with no cache and no network', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    await expect(fetchWeather(SEOUL, { fetch: failing, now: () => T0 })).rejects.toBeInstanceOf(WeatherUnavailableError);
  });
});
