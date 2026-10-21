export type Pt = { x: number; y: number };

const fmt = (n: number) => String(Math.round(n * 100) / 100 || 0);

/**
 * Monotone cubic interpolation (Fritsch–Butland tangents). The curve never
 * overshoots between data points, so the drawn peak stays where the real
 * max/min is — the chart labels depend on that.
 */
export function smoothPath(points: Pt[]): string {
  const n = points.length;
  if (n === 0) return '';
  const head = `M${fmt(points[0].x)} ${fmt(points[0].y)}`;
  if (n === 1) return head;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push(dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i]);
  }

  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    const s0 = slope[i - 1];
    const s1 = slope[i];
    m.push(
      s0 * s1 <= 0
        ? 0
        : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / s0 + (dx[i] + 2 * dx[i - 1]) / s1),
    );
  }
  m.push(slope[n - 2]);

  let d = head;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const h = dx[i] / 3;
    d += ` C${fmt(a.x + h)} ${fmt(a.y + m[i] * h)} ${fmt(b.x - h)} ${fmt(b.y - m[i + 1] * h)} ${fmt(b.x)} ${fmt(b.y)}`;
  }
  return d;
}

/** Split at null values so a missing hour leaves a visible gap instead of a fake line. */
export function runs(points: (Pt | null)[]): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  for (const p of points) {
    if (p) cur.push(p);
    else if (cur.length) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
}

export function smoothSegments(points: (Pt | null)[]): string {
  return runs(points).map(smoothPath).join(' ');
}

/** Closed area between two curves sampled at the same x positions. */
export function smoothArea(top: (Pt | null)[], bottom: (Pt | null)[]): string {
  const pairs = top.map((p, i) => (p && bottom[i] ? i : null));
  return runs(pairs.map((i) => (i === null ? null : { x: i, y: 0 })))
    .filter((run) => run.length > 1)
    .map((run) => {
      const idx = run.map((p) => p.x);
      const upper = smoothPath(idx.map((i) => top[i]!));
      const lower = smoothPath(idx.map((i) => bottom[i]!).reverse());
      return `${upper} L${lower.slice(1)} Z`;
    })
    .join(' ');
}
