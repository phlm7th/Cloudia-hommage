import { searchPlaces } from './data/geocoding';
import { fetchWeather, localNow } from './data/openMeteo';
import type { Place, WeatherData } from './data/types';
import { compareSentence } from './domain/daySummary';
import { loadPlaces, savePlaces } from './domain/places';
import { toHourFraction } from './domain/sceneMath';
import { conditionOf, precipKindOf } from './domain/weatherCode';
import { detectLang, t, type Lang } from './i18n';
import { createScene, type SceneState } from './scene/scene';
import { renderCitiesView } from './ui/citiesView';
import { attachSwipe } from './ui/swipe';
import { renderTempChart } from './ui/tempChart';
import { renderTimeline } from './ui/timelineBar';
import { renderWeeklyChart, weeklyColumns } from './ui/weeklyChart';

export interface AppDeps {
  fetch?: typeof fetch;
  geolocation?: Geolocation | null;
  now?: () => number;
  lang?: Lang;
}

const GEO_TIMEOUT_MS = 8000;
const RESET_AFTER_MS = 10 * 60_000;
const MAX_CONTENT_WIDTH = 480;
const SIDE_PADDING = 32;
const CITIES_HASH = '#/cities';

export function defaultPlace(lang: Lang): Place {
  return { id: 'default-seoul', name: lang === 'ko' ? '서울' : 'Seoul', lat: 37.5665, lon: 126.978 };
}

/**
 * Current position, or Seoul when permission is denied, unavailable or slow (Review Focus 1).
 * The 8s fallback also runs while the permission prompt is still open, so a position that
 * arrives after it is handed to `onLate` instead of being dropped.
 */
export function locate(
  geo: Geolocation | null | undefined,
  lang: Lang,
  onLate?: (p: Place) => void,
): Promise<Place> {
  const fallback = defaultPlace(lang);
  if (!geo) return Promise.resolve(fallback);
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      resolve(fallback);
    }, GEO_TIMEOUT_MS);
    geo.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        const current: Place = {
          id: 'current',
          name: t(lang, 'label.currentPlace'),
          lat: Math.round(pos.coords.latitude * 1e4) / 1e4,
          lon: Math.round(pos.coords.longitude * 1e4) / 1e4,
          isCurrent: true,
        };
        if (settled) onLate?.(current);
        else resolve(current);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
      { maximumAge: 10 * 60_000 },
    );
  });
}

function div(cls: string, text?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

export async function startApp(root: HTMLElement, deps: AppDeps = {}): Promise<void> {
  const lang = deps.lang ?? detectLang(navigator.language);
  const now = deps.now ?? Date.now;
  const geo = deps.geolocation === undefined ? navigator.geolocation : deps.geolocation;
  document.documentElement.lang = lang;

  root.replaceChildren();
  const canvas = document.createElement('canvas');
  canvas.className = 'scene';
  const screen = div('screen');
  const view = div('main-view');
  const topbar = div('topbar');
  const placeName = document.createElement('button');
  placeName.type = 'button';
  placeName.className = 'place-name';
  topbar.append(placeName);
  const stale = div('stale');
  const hourSlot = div('hour-slot');
  view.append(topbar, stale, hourSlot);
  const weekly = div('weekly');
  const credit = document.createElement('footer');
  credit.className = 'credit';
  credit.innerHTML = '<a href="https://open-meteo.com/" target="_blank" rel="noopener">Weather data by Open-Meteo.com</a>';
  screen.append(view, weekly);
  const citiesLayer = div('cities-layer');
  citiesLayer.hidden = true;
  // Outside the scroller so the CC BY attribution stays on screen (Global Constraints).
  root.append(canvas, screen, citiesLayer, credit);

  const scene = createScene(canvas);
  let here: Place = defaultPlace(lang);
  let place: Place = here;
  let wx: WeatherData | null = null;
  let hereWx: WeatherData | null = null;
  let places = loadPlaces();
  let selectedHour = 0;
  let loadSeq = 0;
  const isHere = () => place.id === here.id;

  const contentWidth = () => Math.min(screen.clientWidth || 360, MAX_CONTENT_WIDTH) - SIDE_PADDING;

  const nowHourOf = (data: WeatherData): number | null => {
    const local = localNow(data.utcOffsetSeconds, now());
    return data.days[1]?.date === local.date ? local.hour : null;
  };

  const renderHour = () => {
    if (!wx) return;
    const width = contentWidth();
    const point = wx.today.find((p) => p.hour === selectedHour);
    const ref = wx.yesterday.find((p) => p.hour === selectedHour);
    const cond = conditionOf(point?.code ?? null);
    const compare = compareSentence(lang, point?.temp ?? null, ref?.temp ?? null);

    const condition = document.createElement('h1');
    condition.className = 'condition';
    condition.textContent = cond ? t(lang, `cond.${cond}`) : '';
    const sentence = document.createElement('p');
    sentence.className = 'compare';
    sentence.textContent = compare ?? '';
    sentence.hidden = compare === null;

    hourSlot.replaceChildren(
      renderTimeline({ hours: wx.today, day: wx.days[1], selectedHour, nowHour: nowHourOf(wx), label: t(lang, 'label.today') }),
      renderTempChart({
        lang,
        today: wx.today,
        reference: wx.yesterday,
        referenceLabel: t(lang, 'label.yesterday'),
        selectedHour,
        width,
        height: Math.round(width * 0.42),
      }),
      condition,
      sentence,
    );

    const sceneState: SceneState = {
      hour: selectedHour + 0.5,
      sunrise: toHourFraction(wx.days[1]?.sunrise ?? null),
      sunset: toHourFraction(wx.days[1]?.sunset ?? null),
      cloud: point?.cloud ?? 0,
      windMs: point?.wind ?? 0,
      precip: precipKindOf(point?.code ?? null),
      thunder: cond === 'thunder',
      moonPhase: wx.days[1]?.moonPhase ?? null,
      pop: point?.pop ?? 60,
    };
    scene.update(sceneState);
  };

  const render = () => {
    placeName.textContent = place.name;
    if (!wx) {
      stale.hidden = true;
      weekly.replaceChildren();
      const retry = document.createElement('button');
      retry.className = 'retry';
      retry.textContent = t(lang, 'action.retry');
      retry.addEventListener('click', () => void load());
      hourSlot.replaceChildren(div('error', t(lang, 'err.unavailable')), retry);
      return;
    }
    stale.hidden = !wx.stale;
    if (wx.stale) {
      const at = localNow(wx.utcOffsetSeconds, wx.fetchedAt);
      const sameDay = at.date === localNow(wx.utcOffsetSeconds, now()).date;
      const [, mm, dd] = at.date.split('-').map(Number);
      const time = hhmm(at.hour, at.minute);
      stale.textContent = t(lang, 'label.updated', { time: sameDay ? time : `${mm}/${dd} ${time}` });
    }
    const width = contentWidth();
    const reference =
      !isHere() && hereWx
        ? { day: hereWx.days[1], label: here.isCurrent ? t(lang, 'label.myLocation') : here.name }
        : undefined;
    weekly.replaceChildren(renderWeeklyChart(weeklyColumns(lang, wx.days, reference), width, Math.round(width * 0.6)));
    renderHour();
  };

  /** Only the latest request may render: a slow answer for a previous place is dropped. */
  const load = async () => {
    const seq = ++loadSeq;
    const target = place;
    const targetIsHere = target.id === here.id;
    const opts = { fetch: deps.fetch, now };
    const data = await fetchWeather(target, opts).catch(() => null);
    const hereData = targetIsHere ? data : await fetchWeather(here, opts).catch(() => null);
    if (seq !== loadSeq) return;
    wx = data;
    hereWx = hereData;
    if (wx) selectedHour = nowHourOf(wx) ?? 12;
    render();
  };

  const showCities = (open: boolean) => {
    citiesLayer.hidden = !open;
    screen.hidden = open;
    if (!open) {
      citiesLayer.replaceChildren();
      return;
    }
    citiesLayer.replaceChildren(
      renderCitiesView({
        lang,
        current: here,
        places,
        search: (q, l) => searchPlaces(q, l, { fetch: deps.fetch }),
        onChange: (list) => {
          places = list;
          savePlaces(list);
        },
        onBack: closeCities,
        onSelect: (p) => {
          place = p;
          closeCities();
          void load();
        },
      }),
    );
  };

  // The list is a history entry, so the phone/PWA back button closes it.
  const openCities = () => {
    if (location.hash !== CITIES_HASH) history.pushState(null, '', CITIES_HASH);
    showCities(true);
  };
  const closeCities = () => {
    showCities(false);
    if (location.hash === CITIES_HASH) history.back();
  };
  const syncRoute = () => showCities(location.hash === CITIES_HASH);

  if (location.hash !== '#/') history.replaceState(null, '', '#/');
  placeName.addEventListener('click', openCities);
  window.addEventListener('popstate', syncRoute);
  window.addEventListener('hashchange', syncRoute);

  attachSwipe(
    screen,
    () => selectedHour,
    (h) => {
      selectedHour = h;
      renderHour();
    },
  );

  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = now();
    else if (hiddenAt && now() - hiddenAt > RESET_AFTER_MS) void load();
  });

  here = await locate(geo, lang, (late) => {
    const wasHere = isHere();
    here = late;
    if (wasHere) place = late;
    void load();
  });
  place = here;
  await load();
}
