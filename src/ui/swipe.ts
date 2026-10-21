const START_THRESHOLD_PX = 8;

export function hourFromDrag(startHour: number, dx: number, width: number): number {
  if (width <= 0) return startHour;
  return Math.max(0, Math.min(23, Math.round(startHour + (dx * 24) / width)));
}

/** Horizontal drag anywhere on `el` scrubs the 0–24h timeline (PRD F2-3); vertical scroll is left alone. */
export function attachSwipe(el: HTMLElement, getHour: () => number, onHour: (h: number) => void): () => void {
  let start: { x: number; y: number; hour: number } | null = null;
  let dragging = false;

  const down = (e: PointerEvent) => {
    if ((e.target as Element | null)?.closest('button, a, input')) return;
    start = { x: e.clientX, y: e.clientY, hour: getHour() };
    dragging = false;
  };
  const move = (e: PointerEvent) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(dy) > START_THRESHOLD_PX && Math.abs(dy) > Math.abs(dx)) {
        start = null;
        return;
      }
      if (Math.abs(dx) < START_THRESHOLD_PX) return;
      dragging = true;
    }
    const hour = hourFromDrag(start.hour, dx, el.clientWidth);
    if (hour !== getHour()) onHour(hour);
  };
  const up = () => {
    start = null;
    dragging = false;
  };

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}
