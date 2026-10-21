/** '2026-10-21T06:45' (location local time) → 6.75 */
export function toHourFraction(iso: string | null): number | null {
  if (!iso) return null;
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? Number(m[1]) + Number(m[2]) / 60 : null;
}
