import { describe, expect, it } from "vitest";
import {
  filterMapReports,
  reportAreaPoint,
  type PublicReport,
  type ReportFilters,
} from "./report-context";
const now = Date.parse("2026-10-17T12:00:00Z");
const filters: ReportFilters = { days: "all", kind: "all", status: "all" };
const report = (overrides: Partial<PublicReport> = {}): PublicReport => ({
  id: "one",
  category: "harassment",
  description: "Demo",
  location: [28.613912, 77.209045],
  locationLabel: "Demo area",
  submittedAt: "2026-10-15T12:00:00Z",
  sourceType: "incident_report",
  verification: "unverified",
  moderation: "visible",
  flags: 0,
  flaggedBy: [],
  demo: true,
  ...overrides,
});
describe("map report context", () => {
  it("never exposes hidden reports through filters", () => {
    expect(filterMapReports([report({ moderation: "hidden" })], filters, now)).toEqual([]);
  });
  it("uses event date for recency and excludes future or invalid dates", () => {
    const rows = [
      report(),
      report({ id: "old", eventDate: "2026-09-01" }),
      report({ id: "future", eventDate: "2027-01-01" }),
      report({ id: "invalid", eventDate: "nonsense" }),
    ];
    expect(filterMapReports(rows, { ...filters, days: "7" }, now).map((r) => r.id)).toEqual([
      "one",
    ]);
  });
  it("combines category and status without treating confirmation as safety", () => {
    const rows = [
      report(),
      report({ id: "lit", category: "well_lit_busy", verification: "community_confirmed" }),
      report({ id: "police", category: "police_presence" }),
    ];
    expect(
      filterMapReports(
        rows,
        { ...filters, kind: "positive", status: "community_confirmed" },
        now,
      ).map((r) => r.id),
    ).toEqual(["lit"]);
    expect(filterMapReports(rows, { ...filters, kind: "concern" }, now).map((r) => r.id)).toEqual([
      "one",
    ]);
  });
  it("rounds public coordinates including negative longitudes", () => {
    expect(reportAreaPoint([28.613912, -77.209045])).toEqual([28.614, -77.209]);
  });
});
