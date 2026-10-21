import type { DayPoint, HourPoint, Place, WeatherData } from './types';
import { readJson, writeJson } from './storage';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 30 * 60_000;

export class WeatherUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Weather data unavailable', { cause });
    this.name = 'WeatherUnavailableError';
  }
}

export function buildForecastUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'temperature_2m,weather_code,cloud_cover,wind_speed_10m,precipitation_probability',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,moon_phase',
    past_days: '1',
    forecast_days: '5',
    timezone: 'auto',
    wind_speed_unit: 'ms',
  });
  return `${ENDPOINT}?${params}`;
}

type Num = (number | null)[];
interface RawForecast {
  timezone: string;
  utc_offset_seconds: number;
  hourly: {
    time: string[];
    temperature_2m: Num;
    weather_code: Num;
    cloud_cover: Num;
    wind_speed_10m: Num;
    precipitation_probability: Num;
  };
  daily: {
    time: string[];
    temperature_2m_max: Num;
    temperature_2m_min: Num;
    weather_code: Num;
    sunrise: (string | null)[];
    sunset: (string | null)[];
    moon_phase: Num;
  };
}

export function parseForecast(json: unknown, fetchedAt: number): WeatherData {
  const raw = json as RawForecast;
  if (!raw?.hourly?.time || !raw?.daily?.time) throw new Error('Unexpected forecast response');
  const { hourly: h, daily: d } = raw;
  const at = <T>(arr: (T | null)[] | undefined, i: number): T | null => arr?.[i] ?? null;

  const hoursOf = (date: string): HourPoint[] =>
    h.time.flatMap((t, i) =>
      t.slice(0, 10) === date
        ? [{
            hour: Number(t.slice(11, 13)),
            temp: at(h.temperature_2m, i),
            code: at(h.weather_code, i),
            cloud: at(h.cloud_cover, i),
            wind: at(h.wind_speed_10m, i),
            pop: at(h.precipitation_probability, i),
          }]
        : [],
    );

  const days: DayPoint[] = d.time.map((date, i) => ({
    date,
    max: at(d.temperature_2m_max, i),
    min: at(d.temperature_2m_min, i),
    code: at(d.weather_code, i),
    sunrise: at(d.sunrise, i),
    sunset: at(d.sunset, i),
    moonPhase: at(d.moon_phase, i),
  }));

  return {
    timezone: raw.timezone,
    utcOffsetSeconds: raw.utc_offset_seconds,
    fetchedAt,
    stale: false,
    yesterday: hoursOf(d.time[0]),
    today: hoursOf(d.time[1]),
    days,
  };
}

export function cacheKey(lat: number, lon: number): string {
  return `cloudia.wx.v1:${lat.toFixed(1)},${lon.toFixed(1)}`;
}

export function localNow(utcOffsetSeconds: number, nowMs: number): { date: string; hour: number; minute: number } {
  const d = new Date(nowMs + utcOffsetSeconds * 1000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

export async function fetchWeather(
  place: Pick<Place, 'lat' | 'lon'>,
  deps: { fetch?: typeof fetch; now?: () => number } = {},
): Promise<WeatherData> {
  const doFetch = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const key = cacheKey(place.lat, place.lon);
  const cached = readJson<WeatherData>(key);
  const fresh =
    cached !== null &&
    now() - cached.fetchedAt < CACHE_TTL_MS &&
    cached.days[1]?.date === localNow(cached.utcOffsetSeconds, now()).date;
  if (fresh) return { ...cached, stale: false };

  try {
    const res = await doFetch(buildForecastUrl(place.lat, place.lon));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = parseForecast(await res.json(), now());
    writeJson(key, data);
    return data;
  } catch (err) {
    if (cached) return { ...cached, stale: true };
    throw new WeatherUnavailableError(err);
  }
}
