import type { LatLng, SafetyReport } from "./types";
export type PublicReport = Omit<SafetyReport, "reporterId">;
export interface ReportFilters {
  days: "all" | "7" | "30";
  kind: "all" | "concern" | "positive";
  status: "all" | SafetyReport["verification"];
}
export const isPositiveReport = (report: PublicReport) =>
  report.category === "well_lit_busy" || report.category === "police_presence";
/** Public pins are deliberately rounded; the surrounding circle is illustrative, not an event boundary. */
export const reportAreaPoint = (point: LatLng): LatLng => [
  Math.round(point[0] * 1000) / 1000,
  Math.round(point[1] * 1000) / 1000,
];
export function filterMapReports(
  reports: PublicReport[],
  filters: ReportFilters,
  now = Date.now(),
): PublicReport[] {
  return reports
    .filter((report) => {
      if (report.moderation !== "visible") return false;
      if (filters.kind !== "all" && isPositiveReport(report) !== (filters.kind === "positive"))
        return false;
      if (filters.status !== "all" && report.verification !== filters.status) return false;
      if (filters.days !== "all") {
        const at = Date.parse(report.eventDate || report.submittedAt);
        const age = now - at;
        if (!Number.isFinite(age) || age < 0 || age > Number(filters.days) * 86400000) return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        (Date.parse(b.eventDate || b.submittedAt) || 0) -
        (Date.parse(a.eventDate || a.submittedAt) || 0),
    );
}
export const reportKindLabel = (category: string) =>
  ({
    poor_lighting: "Lighting concern",
    harassment: "Harassment report",
    deserted_stretch: "Quiet stretch",
    well_lit_busy: "Busy / well lit",
    unsafe_transport: "Transport concern",
    police_presence: "Police presence reported",
    other: "Other report",
  })[category] ?? "Report";
