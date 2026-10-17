import type { LatLng, SafetyReport } from "./types";
import { distanceKm, pointAt, type RouteOption } from "./routing";
import { distanceToPathKm } from "./geometry";
import { reportAreaPoint } from "./report-context";

export const CONCERN_WEIGHT = {
  poor_lighting: 3,
  harassment: 5,
  deserted_stretch: 3,
  unsafe_transport: 4,
  other: 1,
  well_lit_busy: 0,
  police_presence: 0,
};
export interface RoutePreferences {
  concerns: number;
  distance: number;
  unknown: number;
  night: boolean;
  includeDemo: boolean;
}
export const DEFAULT_ROUTE_PREFERENCES: RoutePreferences = {
  concerns: 65,
  distance: 20,
  unknown: 15,
  night: true,
  includeDemo: false,
};
export interface RouteAnalysis {
  id: string;
  cost: number;
  exposure: number;
  unknownShare: number;
  detour: number;
  nearCount: number;
  contributions: {
    id: string;
    category: string;
    units: number;
    distanceM: number;
    ageDays: number;
  }[];
}
export interface ConcernZone {
  at: LatLng;
  count: number;
  units: number;
  demo: boolean;
}

/** Policy heuristics, not calibrated likelihoods. No demographic or neighbourhood proxies. */
export function eligibleSignals(reports: SafetyReport[], prefs: RoutePreferences, now: number) {
  const seen = new Set<string>();
  return reports.filter((r) => {
    const age = (now - Date.parse(r.eventDate || r.submittedAt)) / 86400000;
    if (
      r.moderation !== "visible" ||
      (!prefs.includeDemo && r.demo) ||
      !Number.isFinite(age) ||
      age < 0 ||
      age > 90
    )
      return false;
    const point = reportAreaPoint(r.location);
    const key = [
      ...point,
      r.category,
      r.sourceType,
      (r.eventDate || r.submittedAt).slice(0, 10),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function signalUnits(r: SafetyReport, prefs: RoutePreferences, now: number) {
  const ageDays = Math.max(0, (now - Date.parse(r.eventDate || r.submittedAt)) / 86400000);
  // Attribution and community agreement are not independent verification: no credibility boost.
  return (
    CONCERN_WEIGHT[r.category] *
    Math.pow(0.5, ageDays / 30) *
    (prefs.night && r.category === "poor_lighting" ? 1.5 : 1)
  );
}
export function analyseRoutes(
  routes: RouteOption[],
  reports: SafetyReport[],
  prefs: RoutePreferences,
  now = Date.now(),
): RouteAnalysis[] {
  const signals = eligibleSignals(reports, prefs, now);
  const shortest = Math.min(...routes.map((r) => r.distanceKm).filter((d) => d > 0));
  const sum = prefs.concerns + prefs.distance + prefs.unknown || 1;
  return routes.map((route) => {
    const length = route.distanceKm;
    // Equal-distance midpoint sampling avoids polyline vertex-density bias. Cap computational work.
    const n = Math.max(1, Math.min(250, Math.ceil(length / 0.05)));
    let exposure = 0,
      unknown = 0;
    for (let i = 0; i < n; i++) {
      const point = pointAt(route.path, (i + 0.5) / n);
      let max = 0,
        covered = false;
      for (const r of signals) {
        const d = distanceKm(point, reportAreaPoint(r.location));
        if (d < 0.2) {
          covered = true;
          max = Math.max(max, signalUnits(r, prefs, now) * (1 - d / 0.2));
        }
      }
      // Max signal per sample prevents repeated reports from multiplying the same exposure.
      exposure += (max * length) / n;
      if (!covered) unknown++;
    }
    const contributions = signals
      .map((r) => ({
        id: r.id,
        category: r.category,
        units: signalUnits(r, prefs, now),
        distanceM: distanceToPathKm(reportAreaPoint(r.location), route.path) * 1000,
        ageDays: Math.max(0, (now - Date.parse(r.eventDate || r.submittedAt)) / 86400000),
      }))
      .filter((r) => r.distanceM < 200 && r.units > 0);
    const detour = Number.isFinite(shortest) ? Math.max(0, length / shortest - 1) : 0;
    const unknownShare = unknown / n;
    // Fixed transforms preserve absolute exposure differences; never normalize by the worst route.
    const cost =
      ((prefs.concerns * (exposure / (1 + exposure)) +
        prefs.distance * (detour / (1 + detour)) +
        prefs.unknown * unknownShare) /
        sum) *
      100;
    return {
      id: route.id,
      cost,
      exposure,
      unknownShare,
      detour,
      nearCount: contributions.length,
      contributions,
    };
  });
}
export function concernZones(
  reports: SafetyReport[],
  prefs: RoutePreferences,
  now = Date.now(),
): ConcernZone[] {
  const cells = new Map<string, ConcernZone>();
  for (const r of eligibleSignals(reports, prefs, now)) {
    const units = signalUnits(r, prefs, now);
    if (!units) continue;
    const at: LatLng = [
      Math.round(r.location[0] / 0.003) * 0.003,
      Math.round(r.location[1] / 0.003) * 0.003,
    ];
    const key = at.join() + String(r.demo);
    const old = cells.get(key);
    if (old) {
      old.count++;
      old.units = Math.max(old.units, units);
    } else cells.set(key, { at, count: 1, units, demo: r.demo });
  }
  return [...cells.values()];
}
