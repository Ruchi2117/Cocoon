import type { LatLng } from "./types";
export function validPoint(p: unknown): p is LatLng {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    p.every(Number.isFinite) &&
    Math.abs(p[0] as number) <= 90 &&
    Math.abs(p[1] as number) <= 180
  );
}
/** Local tangent-plane distance for reports near a walking route, including long segments. */
export function distanceToPathKm(point: LatLng, path: LatLng[]): number {
  if (!path.length) return Infinity;
  const cos = Math.cos((point[0] * Math.PI) / 180);
  const xy = (p: LatLng) => [(p[1] - point[1]) * 111.32 * cos, (p[0] - point[0]) * 111.32] as const;
  let best = Infinity;
  for (let i = 0; i < path.length; i++) {
    const a = xy(path[i]!),
      b = xy(path[Math.min(i + 1, path.length - 1)]!);
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(a[0] + t * dx, a[1] + t * dy));
  }
  return best;
}
