import { describe, it, expect } from "vitest";
import {
  analyseRoutes,
  concernZones,
  DEFAULT_ROUTE_PREFERENCES as defaults,
  signalUnits,
} from "./route-analysis";
import type { SafetyReport } from "./types";
import type { RouteOption } from "./routing";
const now = Date.parse("2026-10-17T12:00:00Z");
const report: SafetyReport = {
  id: "r",
  category: "poor_lighting",
  location: [0, 0.005],
  locationLabel: "Area",
  description: "Lighting report",
  submittedAt: new Date(now).toISOString(),
  sourceType: "firsthand_review",
  verification: "unverified",
  moderation: "visible",
  flags: 0,
  flaggedBy: [],
  demo: false,
};
const straight: RouteOption = {
  id: "a",
  kind: "fastest",
  label: "A",
  path: [
    [0, 0],
    [0, 0.01],
  ],
  distanceKm: 1.11,
  minutes: 15,
  mainRoadShare: "mixed",
  nearbyReportIds: [],
  provider: "osm-foot",
  note: "",
};
const away: RouteOption = {
  ...straight,
  id: "b",
  kind: "balanced",
  path: [
    [0.005, 0],
    [0.005, 0.01],
  ],
  distanceKm: 1.3,
};
describe("transparent route comparison", () => {
  it("prefers the longer path away from concerns when exposure is the only weight", () => {
    const a = analyseRoutes(
      [straight, away],
      [report],
      { ...defaults, concerns: 100, distance: 0, unknown: 0 },
      now,
    );
    expect(a[0]!.exposure).toBeGreaterThan(0);
    expect(a[1]!.cost).toBeLessThan(a[0]!.cost);
  });
  it("reverses that preference when distance is the only weight", () => {
    const a = analyseRoutes(
      [straight, away],
      [report],
      { ...defaults, concerns: 0, distance: 100, unknown: 0 },
      now,
    );
    expect(a[0]!.cost).toBeLessThan(a[1]!.cost);
  });
  it("does not mistake no reports for known coverage", () => {
    const a = analyseRoutes([straight], [], defaults, now)[0]!;
    expect(a.unknownShare).toBe(1);
    expect(a.nearCount).toBe(0);
  });
  it("excludes synthetic, hidden, stale and future observations", () => {
    for (const r of [
      { ...report, demo: true },
      { ...report, moderation: "hidden" as const },
      { ...report, submittedAt: "2020-01-01" },
      { ...report, submittedAt: "2027-01-01" },
    ])
      expect(analyseRoutes([straight], [r], defaults, now)[0]!.exposure).toBe(0);
  });
  it("allows explicitly labelled synthetic demonstrations", () =>
    expect(
      concernZones([{ ...report, demo: true }], { ...defaults, includeDemo: true }, now)[0]?.demo,
    ).toBe(true));
  it("halves influence over 30 days and increases lighting weight at night", () => {
    expect(
      signalUnits(
        { ...report, submittedAt: new Date(now - 30 * 86400000).toISOString() },
        defaults,
        now,
      ),
    ).toBeCloseTo(signalUnits(report, defaults, now) / 2);
    expect(signalUnits(report, defaults, now)).toBe(
      signalUnits(report, { ...defaults, night: false }, now) * 1.5,
    );
  });
  it("does not multiply exposure through duplication or positive observations", () => {
    const base = analyseRoutes([straight], [report], defaults, now)[0]!.exposure;
    const extra = analyseRoutes(
      [straight],
      [
        report,
        { ...report, id: "duplicate" },
        { ...report, id: "positive", category: "well_lit_busy" },
      ],
      defaults,
      now,
    )[0]!.exposure;
    expect(extra).toBeCloseTo(base);
  });
  it("is invariant to added polyline vertices", () => {
    const dense = {
      ...straight,
      path: [
        [0, 0],
        [0, 0.002],
        [0, 0.005],
        [0, 0.01],
      ] as [number, number][],
    };
    expect(analyseRoutes([dense], [report], defaults, now)[0]!.exposure).toBeCloseTo(
      analyseRoutes([straight], [report], defaults, now)[0]!.exposure,
      5,
    );
  });
});
