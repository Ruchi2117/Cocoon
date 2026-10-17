import type { LatLng, RouteKind, SafetyReport } from "./types";

/**
 * Shared route types and deterministic fallback. Live routing lives in geo.ts.
 * Leaflet only renders — it never calculates routes.
 */
export interface RouteOption {
  id: string;
  kind: RouteKind;
  label: string;
  path: LatLng[];
  distanceKm: number;
  minutes: number;
  mainRoadShare: "mostly main roads" | "mixed" | "includes quiet lanes";
  nearbyReportIds: string[];
  provider: "seeded-demo" | "osm-foot";
  note: string;
  steps?: { instruction: string; distanceM: number; at: LatLng }[] | undefined;
}

const LABEL: Record<RouteKind, string> = {
  fastest: "Demo path A",
  balanced: "Demo path B",
  safety: "Demo path C",
};

function hav(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const distanceKm = hav;

function pathLength(p: LatLng[]) {
  let d = 0;
  for (let i = 1; i < p.length; i++) d += hav(p[i - 1]!, p[i]!);
  return d;
}

/** Dense points along a polyline so markers/progress feel smooth. */
function densify(p: LatLng[], steps = 8): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 1; i < p.length; i++) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const a = p[i - 1]!,
        b = p[i]!;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  out.push(p[p.length - 1]!);
  return out;
}

function reportsNear(path: LatLng[], reports: SafetyReport[], km = 0.18) {
  return reports
    .filter((r) => r.moderation === "visible" && path.some((pt) => hav(pt, r.location) < km))
    .map((r) => r.id);
}

export function planRoutes(from: LatLng, to: LatLng, reports: SafetyReport[]): RouteOption[] {
  const dLat = to[0] - from[0];
  const dLng = to[1] - from[1];
  // Fastest: direct diagonal with slight bend through the quiet interior.
  const fastest: LatLng[] = [
    from,
    [from[0] + dLat * 0.5 + dLng * 0.12, from[1] + dLng * 0.5 - dLat * 0.12],
    to,
  ];
  // Balanced: L-shaped via one major axis.
  const balanced: LatLng[] = [
    from,
    [from[0] + dLat * 0.15, from[1] + dLng * 0.55],
    [from[0] + dLat * 0.7, from[1] + dLng * 0.85],
    to,
  ];
  // Safety-prioritized: follows the main-road grid (lat first, then lng) with a wider berth.
  const safety: LatLng[] = [
    from,
    [from[0] + dLat * 0.05, from[1] - 0.0012],
    [from[0] + dLat * 0.85, from[1] - 0.0012],
    [to[0] - 0.0004, to[1] - dLng * 0.1],
    to,
  ];

  const make = (
    kind: RouteKind,
    raw: LatLng[],
    speed: number,
    share: RouteOption["mainRoadShare"],
    note: string,
  ): RouteOption => {
    const path = densify(raw);
    const distanceKm = pathLength(path);
    return {
      id: `${kind}-${to[0].toFixed(4)}`,
      kind,
      label: LABEL[kind],
      path,
      distanceKm,
      minutes: Math.max(3, Math.round((distanceKm / speed) * 60)),
      mainRoadShare: share,
      nearbyReportIds: reportsNear(path, reports),
      provider: "seeded-demo",
      note,
    };
  };

  return [
    make(
      "fastest",
      fastest,
      4.8,
      "includes quiet lanes",
      "Illustrative shortest path on the seeded network. Not street-accurate.",
    ),
    make("balanced", balanced, 4.6, "mixed", "Illustrative mixed path. Not street-accurate."),
    make(
      "safety",
      safety,
      4.5,
      "mostly main roads",
      "Illustrative path that stays on the seeded main-road grid. Not street-accurate.",
    ),
  ];
}

export function pointAt(path: LatLng[], progress: number): LatLng {
  if (!path.length) throw new Error("Cannot locate progress on an empty path.");
  if (path.length === 1) return path[0]!;
  const total = pathLength(path);
  let remaining = total * Math.max(0, Math.min(1, progress));
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!,
      b = path[i]!,
      length = hav(a, b);
    if (remaining <= length || i === path.length - 1) {
      const fraction = length ? remaining / length : 0;
      return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
    }
    remaining -= length;
  }
  return path[path.length - 1]!;
}
