import { cloudCount, particleCount, skyColors, skyPhase, sunPosition, type SkyPhase } from '../domain/sceneMath';

export interface SceneState {
  hour: number;
  sunrise: number | null;
  sunset: number | null;
  cloud: number;
  windMs: number;
  precip: 'none' | 'rain' | 'snow';
  thunder: boolean;
  moonPhase: number | null;
  pop?: number;
}

interface Cloud { x: number; y: number; s: number }
interface Drop { x: number; y: number; v: number; phase: number }

const HORIZON = 0.72;
const MAX_DPR = 2;

/** PRD F1: canvas scene driven by real weather values. */
export function createScene(canvas: HTMLCanvasElement): { update(s: SceneState): void; destroy(): void } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { update() {}, destroy() {} };

  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let state: SceneState | null = null;
  let w = 0;
  let h = 0;
  let clouds: Cloud[] = [];
  let drops: Drop[] = [];
  let raf = 0;
  let last = 0;
  let nextFlash = 0;
  let flashUntil = 0;

  const syncObjects = (force = false) => {
    if (!state) return;
    const nClouds = cloudCount(state.cloud);
    if (force || clouds.length !== nClouds) {
      clouds = Array.from({ length: nClouds }, (_, i) => ({
        x: ((i + Math.random() * 0.6) / Math.max(nClouds, 1)) * w * 1.2 - w * 0.1,
        y: h * (0.12 + Math.random() * 0.4),
        s: 0.6 + Math.random() * 0.7,
      }));
    }
    const nDrops = particleCount(state.precip, state.pop ?? 60);
    if (force || drops.length !== nDrops) {
      drops = Array.from({ length: nDrops }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        v: 0.7 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      }));
    }
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    w = canvas.clientWidth || window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    syncObjects(true);
    if (!raf) draw(performance.now());
  };

  const step = (dt: number, now: number) => {
    if (!state) return;
    const wind = state.windMs;
    for (const c of clouds) {
      c.x += (4 + wind * 6) * c.s * dt;
      if (c.x - 120 * c.s > w) c.x = -120 * c.s;
    }
    for (const d of drops) {
      if (state.precip === 'rain') {
        d.y += 600 * d.v * dt;
        d.x += wind * 20 * dt;
      } else {
        d.y += 50 * d.v * dt;
        d.x += (Math.sin(now / 900 + d.phase) * 12 + wind * 6) * dt;
      }
      if (d.y > h) {
        d.y = -10;
        d.x = Math.random() * w;
      }
      if (d.x > w) d.x -= w;
      if (d.x < 0) d.x += w;
    }
    if (state.thunder && now > nextFlash) {
      flashUntil = now + 150;
      nextFlash = now + 4000 + Math.random() * 4000;
    }
  };

  const draw = (now: number) => {
    if (!state || w === 0) return;
    const phase = skyPhase(state.hour, state.sunrise, state.sunset);
    const [top, bottom] = skyColors(phase, state.cloud, state.precip !== 'none');
    const sky = ctx.createLinearGradient(0, 0, 0, h * HORIZON);
    sky.addColorStop(0, top);
    sky.addColorStop(1, bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    if (phase === 'night') {
      drawMoon(ctx, w * 0.78, h * 0.3, Math.min(w, h) * 0.06, state.moonPhase ?? 0.5);
    } else {
      const sun = sunPosition(state.hour, state.sunrise, state.sunset);
      if (sun.up) {
        drawSun(ctx, w * (0.1 + 0.8 * sun.t), h * HORIZON - Math.sin(Math.PI * sun.t) * h * 0.4, Math.min(w, h) * 0.09);
      }
    }

    const cloudColor = state.precip !== 'none' ? 'rgba(220,228,238,0.92)' : 'rgba(255,255,255,0.85)';
    for (const c of clouds) drawCloud(ctx, c.x, c.y, c.s * Math.min(w, 480) * 0.22, cloudColor);

    drawLandscape(ctx, w, h, phase);

    if (state.precip === 'rain') {
      ctx.strokeStyle = 'rgba(200,225,255,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const d of drops) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + state.windMs * 0.6, d.y + 14 * d.v);
      }
      ctx.stroke();
    } else if (state.precip === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (const d of drops) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.5 + d.v * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (now < flashUntil) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(0, 0, w, h);
    }
  };

  const loop = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    step(dt, now);
    draw(now);
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (raf || reduceMotion || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : start());

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);

  return {
    update(s) {
      const first = state === null;
      state = s;
      if (first) resize();
      else syncObjects();
      if (!raf) draw(performance.now());
      start();
    },
    destroy() {
      stop();
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.2);
  glow.addColorStop(0, 'rgba(255,230,140,0.55)');
  glow.addColorStop(1, 'rgba(255,230,140,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  body.addColorStop(0, '#fff3b0');
  body.addColorStop(1, '#ffb52e');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** phase: 0 = new, 0.5 = full (Open-Meteo moon_phase). */
function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, phase: number) {
  const lit = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
  const shift = (phase < 0.5 ? -1 : 1) * lit * r * 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#fff3c4';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(15,30,58,0.88)';
  ctx.beginPath();
  ctx.arc(x + shift, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.32, 0, Math.PI * 2);
  ctx.arc(x + size * 0.3, y - size * 0.12, size * 0.38, 0, Math.PI * 2);
  ctx.arc(x + size * 0.65, y, size * 0.3, 0, Math.PI * 2);
  ctx.rect(x, y - size * 0.05, size * 0.65, size * 0.32);
  ctx.fill();
}

const NIGHT_TINT: Record<SkyPhase, number> = { day: 0, twilight: 0.2, night: 0.55 };

/** Countryside illustration (hills, house, trees). One function so it can be swapped for artwork later. */
export function drawLandscape(ctx: CanvasRenderingContext2D, w: number, h: number, phase: SkyPhase) {
  const base = h * HORIZON;
  ctx.fillStyle = '#9fcf7a';
  ctx.beginPath();
  ctx.moveTo(0, base + h * 0.04);
  ctx.bezierCurveTo(w * 0.3, base - h * 0.05, w * 0.6, base + h * 0.02, w, base - h * 0.03);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  const hx = w * 0.28;
  const hy = base - h * 0.005;
  const hw = w * 0.16;
  ctx.fillStyle = '#f6f1e7';
  ctx.fillRect(hx, hy - hw * 0.45, hw, hw * 0.45);
  ctx.fillStyle = '#d8463b';
  ctx.beginPath();
  ctx.moveTo(hx - hw * 0.08, hy - hw * 0.45);
  ctx.lineTo(hx + hw * 0.3, hy - hw * 0.8);
  ctx.lineTo(hx + hw * 1.08, hy - hw * 0.45);
  ctx.fill();
  ctx.fillStyle = '#6b4b3a';
  ctx.fillRect(hx + hw * 0.15, hy - hw * 0.25, hw * 0.14, hw * 0.25);

  const tree = (tx: number, ty: number, r: number, color: string) => {
    ctx.fillStyle = '#6b4b3a';
    ctx.fillRect(tx - r * 0.1, ty - r * 0.2, r * 0.2, r * 0.9);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx, ty - r * 0.6, r, 0, Math.PI * 2);
    ctx.fill();
  };
  tree(w * 0.12, base + h * 0.01, w * 0.05, '#4c9a3f');
  tree(w * 0.62, base, w * 0.06, '#3fb6b2');
  tree(w * 0.86, base - h * 0.01, w * 0.045, '#4c9a3f');

  ctx.fillStyle = '#c9dc6a';
  ctx.beginPath();
  ctx.moveTo(0, base + h * 0.1);
  ctx.bezierCurveTo(w * 0.35, base + h * 0.05, w * 0.7, base + h * 0.14, w, base + h * 0.08);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  ctx.strokeStyle = '#d9a35f';
  ctx.lineWidth = w * 0.025;
  ctx.beginPath();
  ctx.moveTo(w * 0.7, h);
  ctx.bezierCurveTo(w * 0.62, base + h * 0.18, w * 0.9, base + h * 0.12, w * 0.75, base + h * 0.07);
  ctx.stroke();

  const tint = NIGHT_TINT[phase];
  if (tint > 0) {
    ctx.fillStyle = `rgba(11,26,51,${tint})`;
    ctx.fillRect(0, base - h * 0.1, w, h);
  }
}
