# Cloudia Web/PWA MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PRD의 MVP 범위(F1~F4, F5-1·2, F6, F7)를 서버 없는 웹/PWA로 구현하고 GitHub Pages에 자동 배포한다.

**Architecture:** Vite + TypeScript 단일 페이지 앱. 프레임워크 없이 `data/`(Open-Meteo 호출·캐시) → `domain/`(순수 계산) → `ui/`(SVG·DOM 컴포넌트) + `scene/`(Canvas 2D 풍경) 순서로 의존한다. 순수 계산은 모두 `domain/`에 모아 단위 테스트하고, 렌더링은 jsdom DOM 테스트와 브라우저 수동 확인으로 검증한다. GitHub Actions가 테스트·빌드 후 Pages에 게시한다.

**Tech Stack:** Node 24, Vite 7, TypeScript 5 (strict), Vitest 3 + jsdom, vite-plugin-pwa (Workbox), @vite-pwa/assets-generator, GitHub Actions (Pages). 실행 시점에 각 패키지·액션의 최신 안정 메이저 버전을 확인해 쓴다.

**Spec:** [PRD.md](../../../PRD.md) — 특히 6장(기능), 8장(데이터), 9장(비기능), 부록 B.3(플랫폼·데이터 결정), 부록 C(GitHub Pages 검토)

## Global Constraints

- 시간축은 항상 그 지역 현지 시각 0~24시 고정 (PRD F2-1). 타임라인 레이블은 `0 3 6 9 12 3 6 9 12`.
- 하늘 상태는 세 가지뿐: `clear` = 투명, `cloud` = `rgba(255,255,255,0.45)`, `precip` = `rgba(74,144,226,0.9)` (PRD F4-1, 눈도 파랑 — Q1 미결이므로 원문 소개 페이지 기준).
- 기온 단위는 °C만, 표시값은 정수 반올림.
- 언어는 `navigator.language`가 `ko`로 시작하면 한국어, 아니면 영어 (PRD 9장 현지화).
- 서버 없음. 비밀 키 없음. Open-Meteo 무료 API를 브라우저에서 직접 호출 (부록 B.3, C).
- 화면 하단에 `Weather data by Open-Meteo.com` 출처를 Open-Meteo 링크와 함께 항상 표시 (CC BY 4.0).
- 저장은 `localStorage`만 쓰고, 접근은 전부 try/catch로 감싼다.
- 화면 전환은 해시 라우팅(`#/`, `#/cities`). 모든 에셋 경로는 상대 경로 또는 `import.meta.env.BASE_URL` 기준 (GitHub Pages 하위 경로).
- 애니메이션: `document.hidden`이면 루프 정지, `prefers-reduced-motion: reduce`면 정지 프레임만 그림, Canvas 배율은 `Math.min(devicePixelRatio, 2)`.
- 레이아웃은 모바일 세로 기준, 데스크톱에서는 `max-width: 480px` 가운데 정렬.

## Review Focus

1. **위치 권한 거부·시간 초과** — 빈 화면 대신 기본 지역 서울(37.5665, 126.9780, 레이블 "서울"/"Seoul")로 바로 그린다. → Task 8 테스트
2. **오프라인·API 오류** — 캐시가 있으면 오래된 데이터라도 보여주고 "마지막 갱신 HH:MM"을 표시, 캐시가 없으면 오류 문구와 다시 시도 버튼. → Task 2, Task 8 테스트
3. **기기와 다른 시간대의 도시** — 도쿄·뉴욕을 볼 때 "지금" 마커와 기본 선택 시각은 기기 시계가 아니라 그 도시 현지 시각(`utc_offset_seconds`)이어야 한다. → Task 2 테스트
4. **시간별 값의 null** — Open-Meteo가 일부 시간에 `null`을 주면 그래프는 그 구간을 건너뛰고, 요약 문장은 값이 없으면 생략한다. 앱이 멈추면 안 된다. → Task 2, Task 4 테스트
5. **localStorage 사용 불가(사파리 개인정보 보호 모드 등)** — 저장만 안 될 뿐 앱은 정상 동작한다. → Task 2, Task 9 테스트

---

## File Structure

```
D:\dev\Cloudia\
├─ PRD.md
├─ index.html                     # 앱 셸 (canvas, overlay 영역, footer)
├─ package.json
├─ tsconfig.json
├─ vite.config.ts                 # base 경로, PWA, vitest 설정
├─ .gitignore
├─ .github/workflows/deploy.yml   # 테스트 → 빌드 → Pages 게시
├─ public/
│  └─ icon.svg                    # PWA 아이콘 원본 (PNG는 빌드 전에 생성)
└─ src/
   ├─ main.ts                     # 진입점: 스타일 import, startApp()
   ├─ app.ts                      # 상태·라우팅·컴포넌트 연결
   ├─ styles.css
   ├─ i18n.ts                     # 언어 감지, 문자열 사전, t()
   ├─ data/
   │  ├─ types.ts                 # HourPoint, DayPoint, WeatherData, Place
   │  ├─ openMeteo.ts             # URL 생성, 응답 파싱, fetchWeather
   │  ├─ storage.ts               # 안전한 localStorage 래퍼
   │  ├─ geocoding.ts             # 도시 검색
   │  └─ __fixtures__/forecast-seoul.json
   ├─ domain/
   │  ├─ weatherCode.ts           # WMO 코드 → 상태·문구 키
   │  ├─ daySummary.ts            # 하늘 구간 병합, 최고/최저, 비교 문장
   │  ├─ places.ts                # 등록 지역 목록 관리
   │  └─ sceneMath.ts             # 해 위치, 하늘색, 구름·입자 수
   ├─ ui/
   │  ├─ smoothPath.ts            # 단조 3차 보간 SVG path
   │  ├─ icons.ts                 # 날씨 아이콘 SVG 문자열
   │  ├─ tempChart.ts             # F3 어제 대비 기온 그래프
   │  ├─ timelineBar.ts           # F2·F4 타임라인 + 하늘 상태 바
   │  ├─ weeklyChart.ts           # F6·F7 주간 범위 영역 차트
   │  ├─ swipe.ts                 # 가로 스와이프 → 시각
   │  └─ citiesView.ts            # F7 지역 목록·검색 화면
   └─ scene/
      └─ scene.ts                 # Canvas 루프와 레이어 그리기
```

테스트 파일은 대상 옆에 `*.test.ts`로 둔다.

---

### Task 1: 프로젝트 골격과 GitHub Pages 자동 배포

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts`, `src/styles.css`, `src/main.test.ts`, `public/icon.svg`, `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: `npm run dev | build | preview | test`, 빌드 결과 `dist/`, `import.meta.env.BASE_URL`

- [ ] **Step 1: 저장소 초기화**

```bash
git init -b main
npm init -y
npm pkg set type=module
npm i -D vite typescript vitest jsdom vite-plugin-pwa @vite-pwa/assets-generator
```
폴더에 PRD.md와 docs/가 이미 있어 `npm create vite`는 대화형 확인에 걸리므로 쓰지 않는다. `.gitignore`에 `node_modules`, `dist`, `public/pwa-*.png`, `public/maskable-*.png`, `public/apple-touch-*.png`, `public/favicon.ico`를 넣는다.

- [ ] **Step 2: `package.json` scripts 확정**

```json
"scripts": {
  "dev": "vite",
  "icons": "pwa-assets-generator --preset minimal-2023 public/icon.svg",
  "build": "npm run icons && tsc --noEmit && vite build",
  "preview": "vite preview",
  "test": "vitest run"
}
```

- [ ] **Step 3: `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cloudia',
        short_name: 'Cloudia',
        description: 'Live infographic weather',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2f7fc1',
        background_color: '#2f7fc1',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'] },
    }),
  ],
  test: { environment: 'jsdom' },
});
```

- [ ] **Step 4: 실패하는 스모크 테스트 작성** — `src/main.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { APP_NAME } from './main';

describe('app shell', () => {
  it('exports the app name', () => {
    expect(APP_NAME).toBe('Cloudia');
  });
});
```

- [ ] **Step 5: 테스트 실패 확인** — Run: `npm test` / Expected: FAIL (`APP_NAME` 없음)

- [ ] **Step 6: `src/main.ts`에 `export const APP_NAME = 'Cloudia'` 추가, `index.html`에 `<canvas id="scene">`, `<main id="overlay">`, `<footer id="credit">` 배치.** `tsconfig.json`은 `"strict": true`. `public/icon.svg`는 파란 원 배경 위 흰 구름 하나(512×512 viewBox).

- [ ] **Step 7: 통과와 하위 경로 빌드 확인**

Run: `npm test` → PASS
Run (Git Bash): `BASE_PATH=/cloudia/ npm run build` → `dist/index.html` 안의 스크립트 경로가 `/cloudia/assets/...`로 시작하고, `dist/manifest.webmanifest`, `dist/sw.js`가 존재

- [ ] **Step 8: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "chore: scaffold Vite PWA app with GitHub Pages deploy"
```

- [ ] **Step 10: (사용자 작업) GitHub 연결과 첫 배포**

1. GitHub에서 **공개** 저장소 생성 (예: `cloudia`)
2. `git remote add origin https://github.com/<계정>/cloudia.git && git push -u origin main`
3. 저장소 Settings → Pages → Source를 **GitHub Actions**로 변경
4. Actions 탭에서 워크플로가 초록색으로 끝나고 `https://<계정>.github.io/cloudia/`에 빈 셸이 뜨는지 확인

---

### Task 2: 날씨 데이터 계층 (Open-Meteo 호출·파싱·캐시)

**Files:**
- Create: `src/data/types.ts`, `src/data/storage.ts`, `src/data/openMeteo.ts`, `src/data/__fixtures__/forecast-seoul.json`
- Test: `src/data/openMeteo.test.ts`, `src/data/storage.test.ts`

**Interfaces:**
- Produces:
```ts
// types.ts
export interface Place { id: string; name: string; lat: number; lon: number; country?: string; isCurrent?: boolean }
export interface HourPoint { hour: number; temp: number | null; code: number | null; cloud: number | null; wind: number | null; pop: number | null }
export interface DayPoint { date: string; max: number | null; min: number | null; code: number | null; sunrise: string | null; sunset: string | null; moonPhase: number | null }
export interface WeatherData {
  timezone: string; utcOffsetSeconds: number; fetchedAt: number; stale: boolean;
  yesterday: HourPoint[]; // 24개, hour 0..23
  today: HourPoint[];     // 24개, hour 0..23
  days: DayPoint[];       // [0]=어제, [1]=오늘, [2..5]=이후 4일 → 6개
}
// storage.ts
export function readJson<T>(key: string): T | null
export function writeJson(key: string, value: unknown): boolean
// openMeteo.ts
export function buildForecastUrl(lat: number, lon: number): string
export function parseForecast(json: unknown, fetchedAt: number): WeatherData
export function cacheKey(lat: number, lon: number): string           // 'cloudia.wx.v1:37.6,127.0'
export function localNow(utcOffsetSeconds: number, nowMs: number): { date: string; hour: number; minute: number }
export class WeatherUnavailableError extends Error {}
export async function fetchWeather(
  place: Pick<Place, 'lat' | 'lon'>,
  deps?: { fetch?: typeof fetch; now?: () => number }
): Promise<WeatherData>
```

요청 URL은 다음 파라미터로 고정한다(PRD 8.1):
`https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,weather_code,cloud_cover,wind_speed_10m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,moon_phase&past_days=1&forecast_days=5&timezone=auto&wind_speed_unit=ms`

캐시 정책: 키는 좌표를 소수 첫째 자리로 반올림. 저장값 `WeatherData`. `fetchedAt`으로부터 30분 이내면 네트워크 없이 반환. 네트워크 실패 시 캐시가 있으면 `stale: true`로 반환, 없으면 `WeatherUnavailableError`.

- [ ] **Step 1: 픽스처 저장** — 위 URL(서울 37.57, 126.98)로 실제 응답을 받아 `src/data/__fixtures__/forecast-seoul.json`에 저장한다. 그 뒤 `hourly.temperature_2m[30]`(오늘 06시)을 `null`로 바꿔 저장한다(Review Focus 4).

- [ ] **Step 2: 실패하는 테스트 작성** — `src/data/openMeteo.test.ts`

```ts
import fixture from './__fixtures__/forecast-seoul.json';

it('buildForecastUrl includes past_days=1 and forecast_days=5', () => {
  const url = new URL(buildForecastUrl(37.57, 126.98));
  expect(url.searchParams.get('past_days')).toBe('1');
  expect(url.searchParams.get('forecast_days')).toBe('5');
  expect(url.searchParams.get('daily')).toContain('moon_phase');
});

it('parseForecast splits hourly into yesterday and today', () => {
  const wx = parseForecast(fixture, 0);
  expect(wx.yesterday).toHaveLength(24);
  expect(wx.today).toHaveLength(24);
  expect(wx.days).toHaveLength(6);
  expect(wx.today[0].hour).toBe(0);
  expect(wx.today[6].temp).toBeNull();             // null 유지
  expect(wx.days[1].date).toBe(fixture.daily.time[1]);
});

it('localNow uses the place offset, not the device clock', () => {
  // 2026-10-21T00:30Z, Tokyo(+9h) → 09:30
  expect(localNow(32400, Date.UTC(2026, 9, 21, 0, 30))).toEqual({ date: '2026-10-21', hour: 9, minute: 30 });
  // 같은 순간 New York(-4h) → 전날 20:30
  expect(localNow(-14400, Date.UTC(2026, 9, 21, 0, 30))).toEqual({ date: '2026-10-20', hour: 20, minute: 30 });
});

it('fetchWeather returns fresh cache without network', async () => { /* 1차 호출 후 now+10분 2차 호출 → fetch 1회 */ });
it('fetchWeather returns stale cache when network fails', async () => { /* 캐시 저장 후 now+2시간, fetch reject → stale === true */ });
it('fetchWeather throws WeatherUnavailableError with no cache and no network', async () => { /* fetch reject */ });
```
`src/data/storage.test.ts`: `localStorage.getItem`/`setItem`이 throw하도록 `vi.spyOn`한 상태에서 `readJson`은 `null`, `writeJson`은 `false`를 반환한다(Review Focus 5).

- [ ] **Step 3: 실패 확인** — Run: `npm test -- src/data` / Expected: FAIL (모듈 없음)

- [ ] **Step 4: `types.ts`, `storage.ts`, `openMeteo.ts` 구현.** `parseForecast`는 `hourly.time[i]`의 날짜 부분이 `daily.time[0]`이면 yesterday, `daily.time[1]`이면 today로 나눈다(인덱스 가정 대신 날짜로 판정). `localNow`는 `new Date(nowMs + offset*1000)`의 UTC 필드를 읽는다.

- [ ] **Step 5: 통과 확인** — Run: `npm test -- src/data` / Expected: PASS

- [ ] **Step 6: 커밋** — `git commit -m "feat(data): Open-Meteo client with offline cache"`

---

### Task 3: 날씨 코드 매핑과 다국어 문자열

**Files:**
- Create: `src/domain/weatherCode.ts`, `src/i18n.ts`
- Test: `src/domain/weatherCode.test.ts`, `src/i18n.test.ts`

**Interfaces:**
- Produces:
```ts
export type SkyState = 'clear' | 'cloud' | 'precip';
export type Condition = 'clear' | 'partlyCloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';
export function conditionOf(code: number | null): Condition | null
export function skyStateOf(code: number | null): SkyState | null
export function precipKindOf(code: number | null): 'none' | 'rain' | 'snow'
export type Lang = 'ko' | 'en';
export function detectLang(navLang: string): Lang
export function t(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string
```

WMO 매핑(PRD 8.2 확정값):

| 코드 | Condition | SkyState |
|---|---|---|
| 0, 1 | clear | clear |
| 2 | partlyCloudy | cloud |
| 3 | cloudy | cloud |
| 45, 48 | fog | cloud |
| 51–57 | drizzle | precip |
| 61–67, 80–82 | rain | precip |
| 71–77, 85, 86 | snow | precip |
| 95–99 | thunder | precip |

문자열 사전(`StringKey`):

| key | ko | en |
|---|---|---|
| cond.clear | 맑음 | Clear |
| cond.partlyCloudy | 구름 조금 | Partly Cloudy |
| cond.cloudy | 흐림 | Cloudy |
| cond.fog | 안개 | Fog |
| cond.drizzle | 이슬비 | Drizzle |
| cond.rain | 비 | Rain |
| cond.snow | 눈 | Snow |
| cond.thunder | 뇌우 | Thunderstorm |
| cmp.same.yesterday | 어제와 비슷해요 | Same as yesterday. |
| cmp.warmer.yesterday | 어제보다 {d}° 따뜻해요 | {d}° warmer than yesterday. |
| cmp.cooler.yesterday | 어제보다 {d}° 쌀쌀해요 | {d}° cooler than yesterday. |
| cmp.same.here | 여기와 비슷해요 | Same as here. |
| cmp.warmer.here | 여기보다 {d}° 따뜻해요 | {d}° warmer than here. |
| cmp.cooler.here | 여기보다 {d}° 쌀쌀해요 | {d}° cooler than here. |
| label.today | TODAY | TODAY |
| label.yesterday | YESTERDAY | YESTERDAY |
| label.yday | 어제 | Y'day |
| label.todayCol | 오늘 | Today |
| label.here | 여기 | Here |
| label.currentPlace | 현재 위치 | Current location |
| label.updated | 마지막 갱신 {time} | Updated {time} |
| err.unavailable | 날씨를 불러오지 못했어요 | Couldn't load the weather |
| action.retry | 다시 시도 | Retry |
| cities.title | 지역 | Places |
| cities.search | 도시 검색 | Search city |

- [ ] **Step 1: 실패하는 테스트** — 표의 각 행 대표 코드(0, 1, 2, 3, 45, 53, 63, 81, 73, 86, 95)에 대해 `conditionOf`·`skyStateOf` 기대값을 `it.each`로 단언. `conditionOf(null)`은 `null`. `precipKindOf(95) === 'rain'`, `precipKindOf(75) === 'snow'`. `detectLang('ko-KR') === 'ko'`, `detectLang('en-US') === 'en'`, `t('ko', 'cmp.warmer.yesterday', { d: 3 }) === '어제보다 3° 따뜻해요'`.
- [ ] **Step 2: 실패 확인** — Run: `npm test -- src/domain/weatherCode src/i18n` / Expected: FAIL
- [ ] **Step 3: 구현** — 사전은 `as const` 객체로 두고 `StringKey = keyof typeof ko`.
- [ ] **Step 4: 통과 확인** — 같은 명령 / Expected: PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(domain): WMO code mapping and ko/en strings"`

---

### Task 4: 하루 요약 계산 (하늘 구간·최고/최저·비교 문장)

**Files:**
- Create: `src/domain/daySummary.ts`
- Test: `src/domain/daySummary.test.ts`

**Interfaces:**
- Consumes: `HourPoint` (Task 2), `skyStateOf`, `t`, `Lang` (Task 3)
- Produces:
```ts
export interface SkySegment { state: SkyState; start: number; end: number } // end는 미포함, 0..24
export function skySegments(hours: HourPoint[]): SkySegment[]
export interface Extreme { hour: number; temp: number }
export function extremes(hours: HourPoint[]): { max: Extreme; min: Extreme } | null
export function compareSentence(lang: Lang, value: number | null, reference: number | null, against: 'yesterday' | 'here'): string | null
```

비교 규칙(PRD F5-2 구체화): `d = Math.round(value - reference)`. `|d| <= 1`이면 same, `d > 1`이면 warmer(`{d}` = d), `d < -1`이면 cooler(`{d}` = |d|). 어느 값이든 `null`이면 `null`.

- [ ] **Step 1: 실패하는 테스트**

```ts
const h = (hour: number, code: number | null, temp: number | null = 10): HourPoint =>
  ({ hour, temp, code, cloud: 0, wind: 0, pop: 0 });

it('merges consecutive hours with the same sky state', () => {
  const hours = [...Array(24)].map((_, i) => h(i, i < 9 ? 0 : i < 15 ? 3 : 61));
  expect(skySegments(hours)).toEqual([
    { state: 'clear', start: 0, end: 9 },
    { state: 'cloud', start: 9, end: 15 },
    { state: 'precip', start: 15, end: 24 },
  ]);
});
it('skips hours with null code', () => {
  const hours = [...Array(24)].map((_, i) => h(i, i === 5 ? null : 3));
  expect(skySegments(hours)).toEqual([
    { state: 'cloud', start: 0, end: 5 },
    { state: 'cloud', start: 6, end: 24 },
  ]);
});
it('finds max and min with their hours, ignoring nulls', () => {
  const temps = [19, 18, null, 17, 20, 28, 25];
  const r = extremes(temps.map((t, i) => h(i, 0, t)));
  expect(r).toEqual({ max: { hour: 5, temp: 28 }, min: { hour: 3, temp: 17 } });
});
it.each([
  [20, 19.4, 'yesterday', '어제와 비슷해요'],
  [23, 20, 'yesterday', '어제보다 3° 따뜻해요'],
  [15, 20, 'here', '여기보다 5° 쌀쌀해요'],
] as const)('compareSentence(%s, %s, %s)', (v, r, a, expected) => {
  expect(compareSentence('ko', v, r, a)).toBe(expected);
});
it('returns null when a value is missing', () => {
  expect(compareSentence('ko', null, 20, 'yesterday')).toBeNull();
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- src/domain/daySummary` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — Expected: PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(domain): sky segments, extremes, comparison sentence"`

---

### Task 5: 어제 대비 기온 그래프 (F3)

**Files:**
- Create: `src/ui/smoothPath.ts`, `src/ui/tempChart.ts`
- Test: `src/ui/smoothPath.test.ts`, `src/ui/tempChart.test.ts`

**Interfaces:**
- Consumes: `HourPoint` (Task 2), `extremes` (Task 4), `t` (Task 3)
- Produces:
```ts
export type Pt = { x: number; y: number };
export function smoothPath(points: Pt[]): string          // 'M x y C ...'
export function smoothSegments(points: (Pt | null)[]): string // null에서 끊어 여러 'M' 하위 경로
export interface TempChartInput { today: HourPoint[]; reference: HourPoint[]; referenceLabel: string; selectedHour: number; width: number; height: number }
export function renderTempChart(input: TempChartInput): SVGSVGElement
```

`smoothPath`는 **단조 3차 보간(Fritsch–Carlson)**으로 제어점을 계산한다. 곡선이 데이터 사이에서 위아래로 튀어나가지 않아야 하기 때문이다(최고·최저 레이블이 실제 최고·최저 위치와 맞아야 함).

그래프 구성(PRD F3, 소개 페이지 스크린샷 기준):
- x: `hour + 0.5`를 `[0, 24]` → `[0, width]`에 대응. y: 두 날의 null 아닌 기온 전체 범위에 위아래 15% 여백.
- `path.ref-area` = 기준(어제) 곡선 정방향 + 오늘 곡선 역방향으로 닫은 면, `fill: rgba(255,255,255,0.25)`.
- `path.today-line` = 오늘 곡선, `stroke: #fff`, `stroke-width: 3`, fill 없음.
- `text.extreme-max`, `text.extreme-min` = `28°` 형식, 해당 시각 x에, 최고는 선 위·최저는 선 아래.
- `g.badge` = 선택 시각의 오늘 기온, 흰 원(r=18) + 파란 글자 정수. 값이 null이면 배지 숨김.
- `text.ref-label` = `referenceLabel`, 왼쪽 위.
- 축·격자·눈금 없음(F3-6).
- 스크린리더용으로 `<svg role="img">`에 `aria-label`을 단다. 예: `오늘 최고 28° 15시, 최저 19° 5시` (PRD 9장 접근성). 테스트에서 `aria-label`에 `28°`가 들어 있는지 확인한다.

- [ ] **Step 1: 실패하는 테스트**

```ts
it('smoothPath passes through every point', () => {
  const d = smoothPath([{ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 20, y: 5 }]);
  expect(d.startsWith('M0 10')).toBe(true);
  expect(d).toContain(' 10 0');
  expect(d.trim().endsWith('20 5')).toBe(true);
});
it('smoothPath control points stay within neighbor y range (no overshoot)', () => {
  const ys = [0, 0, 10, 10];
  const d = smoothPath(ys.map((y, i) => ({ x: i * 10, y })));
  const nums = d.replace(/[MC]/g, ' ').trim().split(/[\s,]+/).map(Number);
  const yValues = nums.filter((_, i) => i % 2 === 1);
  expect(Math.min(...yValues)).toBeGreaterThanOrEqual(0);
  expect(Math.max(...yValues)).toBeLessThanOrEqual(10);
});
it('smoothSegments breaks at null', () => {
  expect(smoothSegments([{ x: 0, y: 0 }, { x: 1, y: 1 }, null, { x: 3, y: 3 }, { x: 4, y: 4 }]).match(/M/g)).toHaveLength(2);
});
it('renderTempChart draws area, line, extremes and badge', () => {
  const svg = renderTempChart({ today, reference: yesterday, referenceLabel: 'YESTERDAY', selectedHour: 15, width: 320, height: 160 });
  expect(svg.querySelector('path.ref-area')).not.toBeNull();
  expect(svg.querySelector('path.today-line')).not.toBeNull();
  expect(svg.querySelector('text.extreme-max')!.textContent).toBe('28°');
  expect(svg.querySelector('text.extreme-min')!.textContent).toBe('19°');
  expect(svg.querySelector('g.badge text')!.textContent).toBe(String(Math.round(today[15].temp!)));
  expect(svg.querySelector('text.ref-label')!.textContent).toBe('YESTERDAY');
});
```
`today`/`yesterday` 픽스처는 테스트 파일 안에서 오늘 최고 28°(15시), 최저 19°(5시)가 되도록 만든다.

- [ ] **Step 2: 실패 확인** — Run: `npm test -- src/ui/smoothPath src/ui/tempChart` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — Expected: PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(ui): yesterday-vs-today temperature chart"`

---

### Task 6: 타임라인과 하늘 상태 바 (F2·F4)

**Files:**
- Create: `src/ui/icons.ts`, `src/ui/timelineBar.ts`
- Test: `src/ui/timelineBar.test.ts`

**Interfaces:**
- Consumes: `skySegments` (Task 4), `DayPoint` (Task 2)
- Produces:
```ts
export type IconName = 'sun' | 'moon' | 'clear' | 'partlyCloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';
export function iconSvg(name: IconName, opts?: { moonPhase?: number; size?: number }): string
export interface TimelineInput { hours: HourPoint[]; day: DayPoint; selectedHour: number; nowHour: number | null; label: string }
export function renderTimeline(input: TimelineInput): HTMLElement
```

구성:
- 레이블 9개 `0 3 6 9 12 3 6 9 12`를 `hour = 0,3,...,24` 위치에, 그 사이 시간은 점. 좌측 상단에 `label`(TODAY).
- 하늘 구간마다 `div.sky-seg.sky-{state}`를 `left = start/24*100%`, `width = (end-start)/24*100%`로. `clear`는 요소를 만들지 않는다(투명 = 표시 없음, PRD F4-1).
- 일출 시각 위치에 `span.sunrise`(sun 아이콘), 일몰 시각 위치에 `span.sunset`(moon 아이콘, `moonPhase` 반영). 값이 null이면 생략.
- 선택 시각 위치에 `span.cursor`, 그 시각 condition 아이콘.
- 달 아이콘: `moonPhase` 0=삭, 0.5=망. 밝은 원 위에 어두운 원을 `(phase*2-1)` 비율로 가로 이동해 겹치는 방식으로 그린다.
- 비 아이콘은 빗방울 구름(PRD Q2 미결 → 소개 페이지 스크린샷 기준).

- [ ] **Step 1: 실패하는 테스트**

```ts
it('renders 9 hour labels in order', () => {
  const el = renderTimeline(input);
  expect([...el.querySelectorAll('.tick-label')].map(n => n.textContent)).toEqual(['0','3','6','9','12','3','6','9','12']);
});
it('renders cloud and precip segments but not clear', () => {
  const el = renderTimeline(input); // 0-9 clear, 9-15 cloud, 15-24 rain
  expect(el.querySelectorAll('.sky-clear')).toHaveLength(0);
  const cloud = el.querySelector<HTMLElement>('.sky-cloud')!;
  expect(cloud.style.left).toBe('37.5%');
  expect(cloud.style.width).toBe('25%');
  expect(el.querySelector('.sky-precip')).not.toBeNull();
});
it('places sunrise at its local time', () => {
  const el = renderTimeline({ ...input, day: { ...day, sunrise: '2026-10-21T06:45' } });
  expect(el.querySelector<HTMLElement>('.sunrise')!.style.left).toBe(`${(6.75 / 24) * 100}%`);
});
it('omits sunrise and sunset markers when missing', () => {
  const el = renderTimeline({ ...input, day: { ...day, sunrise: null, sunset: null } });
  expect(el.querySelector('.sunrise')).toBeNull();
  expect(el.querySelector('.sunset')).toBeNull();
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- src/ui/timelineBar` / Expected: FAIL
- [ ] **Step 3: 구현** — 색은 Global Constraints의 CSS 값을 `styles.css`의 `.sky-cloud`, `.sky-precip`에 둔다.
- [ ] **Step 4: 통과 확인** — Expected: PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(ui): 0-24 timeline with 3-state sky bar"`

---

### Task 7: 주간 범위 영역 차트 (F6, F7-2)

**Files:**
- Create: `src/ui/weeklyChart.ts`
- Test: `src/ui/weeklyChart.test.ts`

**Interfaces:**
- Consumes: `DayPoint` (Task 2), `smoothPath` (Task 5), `iconSvg` (Task 6), `conditionOf` (Task 3), `t` (Task 3)
- Produces:
```ts
export interface WeeklyColumn { label: string; max: number | null; min: number | null; code: number | null; muted: boolean }
export function weeklyColumns(lang: Lang, days: DayPoint[], here?: DayPoint): WeeklyColumn[]
export function renderWeeklyChart(cols: WeeklyColumn[], width: number, height: number): SVGSVGElement
```

규칙:
- 6열. 첫 열은 `here`가 없으면 `days[0]`(레이블 `label.yday`), 있으면 `here`(레이블 `label.here`, PRD F7-2). 첫 열은 `muted: true`.
- 둘째 열 `days[1]` = `label.todayCol`. 나머지 4열은 요일 약칭: `new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'))` (기기 시간대 때문에 요일이 밀리지 않게).
- `path.range-area` = 최고 곡선 정방향 + 최저 곡선 역방향의 닫힌 면, `fill: rgba(255,255,255,0.3)`, 경계선 `stroke: rgba(255,255,255,0.6)`.
- 각 열에 아이콘, 위에 `text.max`, 아래에 `text.min` (`31°` 형식). muted 열은 `opacity: 0.5`.

- [ ] **Step 1: 실패하는 테스트**

```ts
it('labels yesterday, today, then weekdays', () => {
  const cols = weeklyColumns('en', days); // days[0].date = '2026-10-20'
  expect(cols.map(c => c.label)).toEqual(["Y'day", 'Today', 'Thu', 'Fri', 'Sat', 'Sun']);
  expect(cols[0].muted).toBe(true);
});
it('uses Here as the first column for another city', () => {
  const cols = weeklyColumns('ko', days, hereToday);
  expect(cols[0]).toMatchObject({ label: '여기', max: hereToday.max, muted: true });
});
it('draws one range area and 6 max/min labels', () => {
  const svg = renderWeeklyChart(weeklyColumns('en', days), 320, 200);
  expect(svg.querySelectorAll('path.range-area')).toHaveLength(1);
  expect(svg.querySelectorAll('text.max')).toHaveLength(6);
  expect(svg.querySelectorAll('text.min')).toHaveLength(6);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- src/ui/weeklyChart` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — Expected: PASS
- [ ] **Step 5: 커밋** — `git commit -m "feat(ui): weekly range area chart with Y'day/Here column"`

---

### Task 8: 라이브 풍경과 메인 화면 연결 (F1, F2-3, F5)

**Files:**
- Create: `src/domain/sceneMath.ts`, `src/scene/scene.ts`, `src/ui/swipe.ts`, `src/app.ts`
- Modify: `src/main.ts`, `src/styles.css`, `index.html`
- Test: `src/domain/sceneMath.test.ts`, `src/ui/swipe.test.ts`, `src/app.test.ts`

**Interfaces:**
- Consumes: Task 2~7의 모든 Produces
- Produces:
```ts
// sceneMath.ts
export function toHourFraction(iso: string | null): number | null     // '2026-10-21T06:45' → 6.75
export function sunPosition(hour: number, sunrise: number | null, sunset: number | null): { t: number; up: boolean }
export type SkyPhase = 'night' | 'twilight' | 'day';
export function skyPhase(hour: number, sunrise: number | null, sunset: number | null): SkyPhase
export function skyColors(phase: SkyPhase, cloud: number, precip: boolean): [top: string, bottom: string]
export function cloudCount(cloudPercent: number): number               // round(cloud/100*8), 0..8
export function particleCount(kind: 'none' | 'rain' | 'snow', pop: number): number
// scene.ts
export interface SceneState { hour: number; sunrise: number | null; sunset: number | null; cloud: number; windMs: number; precip: 'none' | 'rain' | 'snow'; thunder: boolean; moonPhase: number | null }
export function createScene(canvas: HTMLCanvasElement): { update(s: SceneState): void; destroy(): void }
// swipe.ts
export function hourFromDrag(startHour: number, dx: number, width: number): number // dx * 24/width 만큼 이동, [0, 23] 클램프, 정수
export function attachSwipe(el: HTMLElement, getHour: () => number, onHour: (h: number) => void): () => void
// app.ts
export const DEFAULT_PLACE: Place // { id: 'default-seoul', name: '서울' 또는 'Seoul', lat: 37.5665, lon: 126.9780 }
export async function startApp(root: HTMLElement, deps?: { fetch?: typeof fetch; geolocation?: Geolocation; now?: () => number; lang?: Lang }): Promise<void>
```

`sceneMath` 확정값(PRD F1 구체화):
- `twilight` = 일출·일몰 각각 앞뒤 45분. 일출~일몰 사이 나머지는 `day`, 그 밖은 `night`. 일출·일몰이 null이면 `cloud`와 무관하게 `day`.
- `sunPosition.t` = `(hour - sunrise) / (sunset - sunrise)`, `up = 0 <= t <= 1`. 화면 x = `0.1 + 0.8t`, y = 지평선 − `sin(πt) × 높이`.
- `skyColors` 기본값: night `#0b1a33 → #1f3b63`, twilight `#3a4f7a → #f2a477`, day `#2f7fc1 → #9fd3f0`. `precip`이면 day를 `#4b6280 → #8fa3b8`로. `cloud >= 80`이면 결과 색을 `#8a9bb0`과 50% 섞는다.
- `particleCount`: none 0, rain `40 + pop*1.6`(최대 200), snow `20 + pop*0.8`(최대 100).

화면 동작:
- 시작 시 `navigator.geolocation.getCurrentPosition`을 8초 타임아웃으로 호출. 거부·오류·타임아웃이면 `DEFAULT_PLACE`로 즉시 진행(Review Focus 1).
- 선택 시각 기본값 = `localNow(utcOffsetSeconds, now()).hour`(Review Focus 3).
- 메인 화면 위에서부터: `renderTimeline` → `renderTempChart`(referenceLabel = `label.yesterday`) → 상태 문구(`h1.condition` = 선택 시각 condition 문구, `p.compare` = `compareSentence(..., 'yesterday')`, null이면 숨김) → 아래로 스크롤하면 `renderWeeklyChart`.
- 화면 아무 곳이나 가로로 끌면 `hourFromDrag`로 시각이 바뀌고, 타임라인 커서·배지·문구·풍경이 함께 갱신(F2-3). 세로 스크롤은 막지 않는다(`touch-action: pan-y`).
- `visibilitychange`로 다시 보일 때 마지막 활성 시점에서 10분이 지났으면 선택 시각을 현재로 되돌리고 `fetchWeather`를 다시 호출(F2-6).
- `stale`이면 상단에 `label.updated`(HH:MM, 현지 시각) 띠 표시. `WeatherUnavailableError`면 `err.unavailable` + `action.retry` 버튼(Review Focus 2).
- `scene.ts`: Canvas 2D로 그리는 레이어 순서 = 하늘 그라데이션 → 해 또는 달 → 구름(`cloudCount`개, 바람 속도에 비례해 x 이동, 화면 밖으로 나가면 반대편에서 다시 등장) → 비·눈 입자 → 번개(thunder면 4~8초 간격으로 0.15초 화면 섬광) → 언덕·집·나무 실루엣(곡선과 도형으로 그린 전원 풍경, 나중에 이미지 레이어로 교체 가능하도록 `drawLandscape(ctx, w, h)` 하나로 분리). Global Constraints의 루프 정지·동작 줄이기·DPR 상한을 따른다.

- [ ] **Step 1: 실패하는 테스트**

```ts
// sceneMath.test.ts
it('toHourFraction parses local ISO time', () => expect(toHourFraction('2026-10-21T06:45')).toBe(6.75));
it('sun is at the top at the midpoint of the day', () => expect(sunPosition(12, 6, 18)).toEqual({ t: 0.5, up: true }));
it('sun is down before sunrise', () => expect(sunPosition(5, 6, 18).up).toBe(false));
it.each([[3, 'night'], [6.5, 'twilight'], [12, 'day'], [17.5, 'twilight'], [22, 'night']] as const)(
  'skyPhase(%s)', (h, p) => expect(skyPhase(h, 6.75, 17.75)).toBe(p));
it('treats missing sunrise/sunset as day', () => expect(skyPhase(3, null, null)).toBe('day'));
it('cloudCount scales 0..8', () => { expect(cloudCount(0)).toBe(0); expect(cloudCount(100)).toBe(8); });
it('particleCount caps rain at 200', () => expect(particleCount('rain', 100)).toBe(200));

// swipe.test.ts
it('dragging one hour-width to the right moves +1h', () => expect(hourFromDrag(10, 320 / 24, 320)).toBe(11));
it('clamps at 0 and 23', () => { expect(hourFromDrag(1, -1000, 320)).toBe(0); expect(hourFromDrag(22, 1000, 320)).toBe(23); });

// app.test.ts  (fetch는 forecast-seoul.json을 돌려주는 가짜, canvas getContext는 vi.fn 스텁)
it('falls back to Seoul when geolocation is denied', async () => {
  const geolocation = { getCurrentPosition: (_ok: any, fail: any) => fail({ code: 1 }) } as unknown as Geolocation;
  await startApp(root, { fetch: fakeFetch, geolocation, lang: 'ko', now: () => FIXED_NOW });
  expect(fakeFetch).toHaveBeenCalledWith(expect.stringContaining('latitude=37.5665'));
  expect(root.querySelector('h1.condition')!.textContent).not.toBe('');
});
it('shows retry when there is no data at all', async () => {
  await startApp(root, { fetch: () => Promise.reject(new TypeError('offline')), geolocation: deniedGeo, lang: 'ko', now: () => FIXED_NOW });
  expect(root.textContent).toContain('날씨를 불러오지 못했어요');
  expect(root.querySelector('button.retry')).not.toBeNull();
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- src/domain/sceneMath src/ui/swipe src/app` / Expected: FAIL
- [ ] **Step 3: `sceneMath.ts`, `swipe.ts` 구현 → 해당 테스트 통과 확인**
- [ ] **Step 4: `scene.ts`, `app.ts` 구현, `main.ts`에서 `startApp(document.getElementById('overlay')!)` 호출**
- [ ] **Step 5: 전체 테스트 통과 확인** — Run: `npm test` / Expected: PASS
- [ ] **Step 6: 브라우저 확인** — Run: `npm run dev` 후 모바일 크기(375×812)로 확인
  - 타임라인·기온 그래프·상태 문구·풍경이 보이고, 가로로 끌면 시각과 해 위치·하늘색이 함께 바뀐다
  - 위치 권한을 거부해도 서울 날씨가 뜬다
  - 개발자 도구에서 오프라인 전환 후 새로고침 → "마지막 갱신" 띠와 함께 화면이 유지된다
  - 동작 줄이기 설정을 켜면 풍경이 멈춘 그림으로 바뀐다
- [ ] **Step 7: 커밋** — `git commit -m "feat: live scene and main screen wiring"`

---

### Task 9: 지역 검색·저장·비교 (F7)

**Files:**
- Create: `src/data/geocoding.ts`, `src/domain/places.ts`, `src/ui/citiesView.ts`
- Modify: `src/app.ts`
- Test: `src/data/geocoding.test.ts`, `src/domain/places.test.ts`

**Interfaces:**
- Consumes: `Place`, `readJson`/`writeJson` (Task 2), `weeklyColumns` (Task 7), `compareSentence` (Task 4)
- Produces:
```ts
// geocoding.ts
export function buildGeocodingUrl(query: string, lang: Lang): string // https://geocoding-api.open-meteo.com/v1/search?name=..&count=5&language=..
export function parseGeocoding(json: unknown): Place[]               // id = 'geo-' + result.id, name, country, lat, lon
export async function searchPlaces(query: string, lang: Lang, deps?: { fetch?: typeof fetch }): Promise<Place[]>
// places.ts — 저장 키 'cloudia.places.v1'
export function loadPlaces(): Place[]
export function addPlace(list: Place[], p: Place): Place[]   // id 중복이면 그대로
export function removePlace(list: Place[], id: string): Place[]
export function movePlace(list: Place[], id: string, delta: -1 | 1): Place[]
export function savePlaces(list: Place[]): void
// citiesView.ts
export function renderCitiesView(opts: { lang: Lang; places: Place[]; onSelect(p: Place): void; onChange(list: Place[]): void; search: typeof searchPlaces }): HTMLElement
```

화면 동작:
- `#/cities`: 검색 입력(300ms 디바운스, 2글자 이상일 때 호출) → 결과 목록 → 누르면 추가. 등록 목록에는 위/아래 이동, 삭제 버튼. 맨 위에 항상 "현재 위치"(삭제 불가).
- 등록 지역을 고르면 `#/`로 돌아가 그 지역을 표시. 이때 주간 차트 첫 열은 `weeklyColumns(lang, days, hereDays[1])`로 "여기", 비교 문장은 선택 시각 기온을 현재 위치의 같은 현지 시각 기온과 `compareSentence(..., 'here')`로 비교(PRD F7-2, F7-3). 기온 그래프의 기준 곡선은 그대로 어제.
- 메인 화면 우측 상단에 지역 이름 버튼 → `#/cities`.

- [ ] **Step 1: 실패하는 테스트**

```ts
it('parseGeocoding maps results to places', () => {
  const places = parseGeocoding({ results: [{ id: 1850147, name: '도쿄', latitude: 35.6895, longitude: 139.69171, country: '일본' }] });
  expect(places).toEqual([{ id: 'geo-1850147', name: '도쿄', lat: 35.6895, lon: 139.69171, country: '일본' }]);
});
it('parseGeocoding returns [] when results is missing', () => expect(parseGeocoding({})).toEqual([]));
it('addPlace ignores duplicates', () => expect(addPlace([tokyo], tokyo)).toEqual([tokyo]));
it('movePlace swaps neighbors and stays in bounds', () => {
  expect(movePlace([tokyo, paris], 'geo-2', -1).map(p => p.id)).toEqual(['geo-2', 'geo-1']);
  expect(movePlace([tokyo, paris], 'geo-1', -1).map(p => p.id)).toEqual(['geo-1', 'geo-2']);
});
it('loadPlaces returns [] when storage throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(loadPlaces()).toEqual([]);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- src/data/geocoding src/domain/places` / Expected: FAIL
- [ ] **Step 3: 구현 (geocoding, places, citiesView, app 라우팅)**
- [ ] **Step 4: 전체 테스트 통과 확인** — Run: `npm test` / Expected: PASS
- [ ] **Step 5: 브라우저 확인** — "도쿄" 검색 → 추가 → 선택 시 주간 차트 첫 열이 "여기", 타임라인 "지금" 커서가 도쿄 현지 시각에 놓인다. 새로고침 후에도 목록이 남는다.
- [ ] **Step 6: 커밋** — `git commit -m "feat: place search, saved places, compare with here"`

---

### Task 10: PWA 마무리와 배포 검증

**Files:**
- Modify: `index.html`, `src/styles.css`, `src/main.ts`

**Interfaces:**
- Consumes: Task 1의 PWA 설정, Task 8의 `startApp`

- [ ] **Step 1: 앱 셸 메타 정보** — `index.html`에 `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#2f7fc1">`, `<link rel="apple-touch-icon" href="apple-touch-icon-180x180.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, 상대 경로 `<link rel="icon" href="favicon.ico">`.
- [ ] **Step 2: 레이아웃** — `body` 배경 `#0b1a33`, `#app` `max-width: 480px; margin: 0 auto; height: 100dvh`, 노치 영역은 `env(safe-area-inset-*)` 패딩. 출처 footer 고정.
- [ ] **Step 3: 하위 경로 빌드 검증**

Run: `BASE_PATH=/cloudia/ npm run build && npx vite preview --base /cloudia/`
Expected: `http://localhost:4173/cloudia/`에서 앱이 뜨고, 개발자 도구 Application 탭에서 Manifest 오류 없음·Service Worker 활성화, 오프라인 전환 후 새로고침해도 앱 셸이 뜬다.

- [ ] **Step 4: 전체 테스트** — Run: `npm test` / Expected: PASS
- [ ] **Step 5: 커밋 후 푸시** — `git commit -m "feat: PWA polish"` 후 `git push`
- [ ] **Step 6: 배포 확인** — Actions 워크플로 성공 후 `https://<계정>.github.io/cloudia/`를 iPhone Safari와 Android Chrome에서 열어:
  - 위치 권한 요청이 뜨고, 허용하면 현재 위치 날씨가 나온다
  - "홈 화면에 추가" 후 실행하면 주소창 없는 전체 화면으로 열린다
  - 비행기 모드에서 홈 화면 아이콘으로 열어도 마지막 데이터가 보인다
