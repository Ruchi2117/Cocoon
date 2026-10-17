import { SafetyNews } from "@/components/cocoon/SafetyNews";
import { ReportReel } from "@/components/cocoon/ReportReel";
import { ReportType } from "@/components/cocoon/ReportType";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/cocoon/MapView";
import { CATEGORY_LABEL, PageHeader, ReportCard, SOURCE_LABEL } from "@/components/cocoon/ui";
import { useDemoState } from "@/lib/cocoon/store";
import { publicReports } from "@/lib/cocoon/access";
import { flagReport, submitReport } from "@/lib/cocoon/actions";
import type { LatLng, ReportCategory, SourceType } from "@/lib/cocoon/types";
import { validPoint } from "@/lib/cocoon/geometry";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Community safety reports · Cocoon" },
      {
        name: "description",
        content:
          "Firsthand reviews, user incident reports and attributed external sources — clearly labelled.",
      },
      { property: "og:title", content: "Community safety reports · Cocoon" },
      { property: "og:description", content: "Transparent, moderated safety intelligence." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const s = useDemoState();
  const all = useMemo(
    () =>
      publicReports(s, s.role === "moderator" ? "moderator" : "traveller").filter(
        (r) => r.moderation === "visible",
      ),
    [s],
  );
  const [filter, setFilter] = useState<SourceType | "all">("all");
  const list = filter === "all" ? all : all.filter((r) => r.sourceType === filter);
  const me = s.actorIds[s.role];
  const flagged = new Set(s.reports.filter((r) => r.flaggedBy.includes(me)).map((r) => r.id));

  const [pin, setPin] = useState<LatLng | null>(null);
  const [coordinates, setCoordinates] = useState({ lat: "", lng: "" });
  const [form, setForm] = useState({
    category: "poor_lighting" as ReportCategory,
    sourceType: "firsthand_review" as Exclude<SourceType, "external_source">,
    description: "",
    locationLabel: "",
    eventDate: "",
  });
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!pin) throw new Error("Tap the map to set an approximate location.");
      if (!form.locationLabel.trim()) throw new Error("Add a short place description.");
      submitReport({
        ...form,
        location: pin,
        locationLabel: form.locationLabel.trim(),
        eventDate: form.eventDate || undefined,
      });
      setForm({ ...form, description: "", locationLabel: "", eventDate: "" });
      setPin(null);
      setErr(null);
      toast.success("Report published as unverified. Your identity is not shown publicly.");
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <div className="reports-editorial">
      <ReportType />
      <PageHeader eyebrow="Community safety intelligence" title="What others have noticed">
        Three kinds of information, always labelled: firsthand road reviews, user incident reports,
        and external sources with attribution. Unverified reports are not confirmed crimes. Seeded
        items are demonstration data.
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2" role="tablist">
            {(["all", "firsthand_review", "incident_report", "external_source"] as const).map(
              (f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${filter === f ? "bg-primary text-primary-foreground" : "bg-card"}`}
                >
                  {f === "all" ? "All" : SOURCE_LABEL[f]}
                </button>
              ),
            )}
          </div>
          <ReportReel key={filter} reports={list} />
          <details className="report-full-list">
            <summary>All reports & review controls</summary>
            <div className="space-y-3">
              {list.map((r) => (
                <ReportCard key={r.id} r={r}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-xs"
                    disabled={flagged.has(r.id)}
                    onClick={() => {
                      flagReport(r.id);
                      toast("Flagged for moderator review");
                    }}
                  >
                    {flagged.has(r.id) ? "Flagged" : "Flag as questionable"}
                  </Button>
                </ReportCard>
              ))}
            </div>
          </details>
        </div>
        <form onSubmit={submit} className="card-soft h-fit space-y-3 p-4 lg:sticky lg:top-32">
          <h2 className="text-xl font-semibold">Share a report</h2>
          <MapView
            className="h-48 overflow-hidden rounded-2xl border"
            reports={
              pin
                ? [
                    {
                      id: "pin",
                      category: form.category,
                      description: "",
                      location: pin,
                      locationLabel: "Your pin",
                      submittedAt: new Date().toISOString(),
                      sourceType: form.sourceType,
                      verification: "unverified",
                      moderation: "visible",
                      flags: 0,
                      flaggedBy: [],
                      demo: false,
                    },
                  ]
                : []
            }
            onMapClick={setPin}
            focusPoint={pin}
          />
          <p className="text-xs text-muted-foreground">
            {pin ? "Approximate location set." : "Tap the map to drop an approximate pin."}
          </p>
          <details className="border-b pb-3 text-xs">
            <summary className="cursor-pointer py-1">
              Set approximate coordinates with keyboard
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label>
                Latitude
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={coordinates.lat}
                  onChange={(e) => setCoordinates({ ...coordinates, lat: e.target.value })}
                  className="mt-1 w-full border bg-background p-2"
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={coordinates.lng}
                  onChange={(e) => setCoordinates({ ...coordinates, lng: e.target.value })}
                  className="mt-1 w-full border bg-background p-2"
                />
              </label>
            </div>
            <button
              type="button"
              className="mt-2 underline"
              onClick={() => {
                const p: LatLng = [Number(coordinates.lat), Number(coordinates.lng)];
                if (!coordinates.lat || !coordinates.lng || !validPoint(p))
                  setErr("Enter valid latitude and longitude.");
                else {
                  setPin(p);
                  setErr(null);
                }
              }}
            >
              Use these coordinates
            </button>
          </details>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label>
              Type
              <select
                value={form.sourceType}
                onChange={(e) =>
                  setForm({ ...form, sourceType: e.target.value as typeof form.sourceType })
                }
                className="mt-1 w-full rounded-xl border bg-background px-2 py-2"
              >
                <option value="firsthand_review">Road review</option>
                <option value="incident_report">Incident report</option>
              </select>
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ReportCategory })}
                className="mt-1 w-full rounded-xl border bg-background px-2 py-2"
              >
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input
            value={form.locationLabel}
            maxLength={120}
            onChange={(e) => setForm({ ...form, locationLabel: e.target.value })}
            placeholder="Place, e.g. Lane near Gate 3"
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            aria-label="Place description"
          />
          <textarea
            value={form.description}
            maxLength={600}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="What did you notice? (10–600 chars, no names)"
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            aria-label="Description"
          />
          <label className="block text-sm">
            Event date (if known)
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
            />
          </label>
          {err && (
            <p className="text-sm text-coral" role="alert">
              {err}
            </p>
          )}
          <Button type="submit" className="w-full rounded-full">
            Publish report
          </Button>
          <p className="text-xs text-muted-foreground">
            Published as unverified. Your identity stays private.
          </p>
        </form>
      </div>
      <SafetyNews />
    </div>
  );
}
