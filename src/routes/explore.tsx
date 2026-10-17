import { BalancedColumns } from "@/components/cocoon/BalancedColumns";
import { RouteWalkStrip } from "@/components/cocoon/RouteWalkStrip";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  ArrowDownUp,
  ExternalLink,
  LocateFixed,
  Loader2,
  MapPin,
  Search,
  Navigation,
  Footprints,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/cocoon/MapView";
import { PageHeader, Pill, ReportCard, SimLabel } from "@/components/cocoon/ui";
import { RoleGate } from "@/components/cocoon/AppShell";
import { useDemoState } from "@/lib/cocoon/store";
import { activeTrip, publicReports } from "@/lib/cocoon/access";
import { DESTINATIONS, ORIGIN, profileById } from "@/lib/cocoon/seed";
import { planRoutes, type RouteOption } from "@/lib/cocoon/routing";
import { directionsUrl, geocode, GeoError, liveWalkingRoutes, type Place } from "@/lib/cocoon/geo";
import { startTrip } from "@/lib/cocoon/actions";
import type { LatLng, RouteKind, Trip } from "@/lib/cocoon/types";
import { cn } from "@/lib/utils";
import { formatDistance, usePrefs } from "@/lib/cocoon/locale";
import { distanceToPathKm } from "@/lib/cocoon/geometry";
import {
  analyseRoutes,
  concernZones,
  DEFAULT_ROUTE_PREFERENCES,
} from "@/lib/cocoon/route-analysis";
import { RouteWeights } from "@/components/cocoon/RouteWeights";
import { PrivateJourneyPanel } from "@/components/cocoon/PrivateJourneyPanel";

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): { to: string; query?: string } => ({
    to: typeof s["to"] === "string" ? s["to"] : "d-metro",
    query: typeof s["query"] === "string" ? s["query"].slice(0, 120) : "",
  }),
  head: () => ({
    meta: [
      { title: "Route explorer · Cocoon" },
      {
        name: "description",
        content:
          "Compare Fastest, Balanced and Safety-prioritized walking routes with community report provenance.",
      },
      { property: "og:title", content: "Route explorer · Cocoon" },
      { property: "og:description", content: "Compare routes and inspect safety report sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate role="traveller">
      <Explore />
    </RoleGate>
  ),
});

type Status = { k: "idle" } | { k: "loading" } | { k: "ok" } | { k: "error"; msg: string };

function Explore() {
  const { units } = usePrefs();
  const { to, query } = Route.useSearch();
  const nav = useNavigate();
  const s = useDemoState();
  const preset = DESTINATIONS.find((d) => d.id === to) ?? DESTINATIONS[0];
  if (!preset) throw new Error("No destination is configured.");
  const [origin, setOrigin] = useState<Place>(ORIGIN);
  const [dest, setDest] = useState<Place>({ label: preset.label, at: preset.at });
  useEffect(
    () => setDest({ label: preset.label, at: preset.at }),
    [preset.id, preset.label, preset.at],
  );
  const reports = useMemo(() => publicReports(s, "traveller"), [s]);
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [live, setLive] = useState<RouteOption[]>([]);
  const [status, setStatus] = useState<Status>({ k: "idle" });
  const [retry, setRetry] = useState(0);
  const [stepFocus, setStepFocus] = useState<LatLng | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const demo = useMemo(
    () => planRoutes(origin.at, dest.at, s.reports),
    [origin.at, dest.at, s.reports],
  );

  useEffect(() => {
    if (mode !== "live") return;
    const ctrl = new AbortController();
    setStatus({ k: "loading" });
    setLive([]);
    setStepFocus(null);
    const t = setTimeout(() => {
      liveWalkingRoutes(origin.at, dest.at, s.reports, ctrl.signal)
        .then((r) => {
          if (ctrl.signal.aborted) return;
          setLive(r);
          setStatus({ k: "ok" });
        })
        .catch((e: unknown) => {
          if (e instanceof GeoError && e.kind === "aborted") return;
          setStatus({ k: "error", msg: e instanceof Error ? e.message : "Routing failed." });
        });
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // reports intentionally excluded: avoid refetching on every report edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin.at, dest.at, mode, retry]);

  const routes = useMemo(
    () =>
      mode === "live"
        ? live.map((r) => ({
            ...r,
            nearbyReportIds: reports
              .filter((report) => distanceToPathKm(report.location, r.path) < 0.15)
              .map((report) => report.id),
          }))
        : demo,
    [mode, live, demo, reports],
  );
  const [kind, setKind] = useState<RouteKind>("fastest");
  const [routePrefs, setRoutePrefs] = useState(DEFAULT_ROUTE_PREFERENCES);
  const [showZones, setShowZones] = useState(true);
  const analysis = useMemo(
    () => analyseRoutes(routes, reports, routePrefs),
    [routes, reports, routePrefs],
  );
  const zones = useMemo(() => concernZones(reports, routePrefs), [reports, routePrefs]);
  const sel = routes.find((r) => r.kind === kind) ?? routes[0];
  const [focus, setFocus] = useState<string | null>(null);
  const [pin, setPin] = useState<"origin" | "destination" | null>(null);
  const accepted = s.contacts.filter(
    (c) => c.travellerId === s.actorIds.traveller && c.status === "accepted",
  );
  const [guardian, setGuardian] = useState<string>(accepted[0]?.guardianId ?? "");
  const [locMode, setLocMode] = useState<Trip["locationMode"]>("simulated");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const trip = activeTrip(s);

  const mapRoutes = useMemo(
    () =>
      routes.map((r) => ({
        id: r.id,
        path: r.path,
        selected: r.kind === sel?.kind,
        dashed: r.provider === "seeded-demo",
        label: `${r.label} · ${r.minutes} min`,
        onSelect: () => setKind(r.kind),
      })),
    [routes, sel?.kind],
  );
  const onReport = useCallback((id: string) => setFocus(id), []);
  const onMapClick = useCallback(
    (p: LatLng) => {
      if (!pin) return;
      const place = { label: `Pinned point (${p[0].toFixed(4)}, ${p[1].toFixed(4)})`, at: p };
      if (pin === "origin") {
        setOrigin(place);
        setLocMode("manual");
      } else setDest(place);
      setPin(null);
      setFocus(null);
    },
    [pin],
  );
  const shown = focus
    ? reports.filter((r) => r.id === focus)
    : reports.filter((r) => sel?.nearbyReportIds.includes(r.id));

  const useGps = () => {
    if (!("geolocation" in navigator))
      return setGeoMsg(
        "Location isn't available in this browser. Search or pin your start instead.",
      );
    setGeoMsg("Asking your browser for permission…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const at: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setOrigin({ label: "My current location", at });
        setLocMode("gps");
        setGeoMsg(
          `Start set to your location (accuracy ±${Math.round(pos.coords.accuracy)} m). Journey progress afterwards is still simulated.`,
        );
      },
      (err) => {
        setLocMode("manual");
        setGeoMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — that's okay. Search for your start or tap the map to pin it."
            : "Couldn't get your location. Search for your start or pin it on the map.",
        );
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 30000 },
    );
  };

  return (
    <div className="route-explorer-page">
      <PageHeader eyebrow="Route explorer" title={`To ${dest.label.split(",")[0]}`}>
        Walking routes come from OpenStreetMap community routing when available. They show the path
        — Cocoon never rates a route as "safe". Check the reports along each one.
      </PageHeader>
      <RouteWalkStrip to={dest.label} />
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {DESTINATIONS.map((d, i) => (
          <button
            key={d.id}
            onClick={() => {
              setFocus(null);
              setDest({ label: d.label, at: d.at });
              nav({ to: "/explore", search: { to: d.id }, replace: true });
            }}
            style={{ animationDelay: `${i * 70}ms` }}
            className={cn(
              "rws-chip whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition",
              d.label === dest.label
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-accent",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <PlaceSearch
          label="From"
          value={origin}
          near={origin.at}
          onPick={(p) => {
            setOrigin(p);
            setLocMode("manual");
          }}
          pinActive={pin === "origin"}
          onPin={() => setPin(pin === "origin" ? null : "origin")}
          extra={
            <Button size="sm" variant="outline" className="rounded-full" onClick={useGps}>
              <LocateFixed className="h-3.5 w-3.5" /> Use my location
            </Button>
          }
        />
        <PlaceSearch
          label="To"
          initialQuery={query ?? ""}
          value={dest}
          near={origin.at}
          onPick={setDest}
          pinActive={pin === "destination"}
          onPin={() => setPin(pin === "destination" ? null : "destination")}
        />
      </div>
      {geoMsg && (
        <p className="-mt-2 mb-3 text-xs text-muted-foreground" role="status">
          {geoMsg}
        </p>
      )}
      <BalancedColumns className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <MapView
              className={cn(
                "h-[60vh] min-h-[390px] overflow-hidden border border-foreground/30",
                pin && "cursor-crosshair",
              )}
              routes={mapRoutes}
              concernZones={showZones ? zones : []}
              reports={reports}
              origin={origin.at}
              destination={dest.at}
              originLabel="Start"
              destinationLabel="Destination"
              onReportClick={onReport}
              onMapClick={onMapClick}
              focusPoint={stepFocus}
            />
            {pin && (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] mx-auto w-fit rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background">
                Tap the map to set your {pin === "origin" ? "start" : "destination"}
              </div>
            )}
            {mode === "live" && status.k === "loading" && (
              <div
                className="absolute bottom-3 left-3 z-[500] flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs shadow"
                role="status"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding walking routes…
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <i className="h-2.5 w-2.5 rounded-full bg-coral" /> Concern report
            </span>
            <span className="flex items-center gap-1">
              <i className="h-2.5 w-2.5 rounded-full bg-sage" /> Positive review
            </span>
            <span className="flex items-center gap-1">
              <i className="h-2.5 w-2.5 rounded-full bg-plum" /> Synthetic external-style
            </span>
            {mode === "live" ? (
              <span>
                Routing © OpenStreetMap contributors · FOSSGIS (walking) · Place search: Photon
              </span>
            ) : (
              <SimLabel>Illustrative demo paths — dashed, not street-accurate</SimLabel>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOrigin(dest);
                setDest(origin);
                setLocMode("manual");
                setFocus(null);
              }}
            >
              <ArrowDownUp className="h-3.5 w-3.5" /> Swap endpoints
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <a href={directionsUrl(origin.at, dest.at)} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open walking directions in Google Maps
              </a>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => setMode(mode === "live" ? "demo" : "live")}
            >
              {mode === "live" ? "Use seeded demo paths instead" : "Try live walking routes"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Searches and route endpoints are sent to public map providers. Avoid entering private
            information.{" "}
            <a
              href="https://www.openstreetmap.org/fixthemap"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Suggest a map correction
            </a>
            .
          </p>
          {sel?.steps && sel.steps.length > 0 && (
            <section className="route-directions">
              <button
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => setShowSteps(!showSteps)}
                aria-expanded={showSteps}
              >
                <span className="flex items-center gap-2">
                  <Navigation size={16} /> Walking directions
                </span>
                <span className="text-xs">
                  {sel.steps.length} steps · {showSteps ? "Hide" : "Show"}
                </span>
              </button>
              {showSteps && (
                <ol className="max-h-80 overflow-y-auto border-t">
                  {sel.steps.map((step, i) => (
                    <li key={`${i}-${step.instruction}`}>
                      <button
                        onClick={() => setStepFocus([...step.at])}
                        className="flex w-full items-start gap-3 border-b p-3 text-left text-sm hover:bg-accent"
                      >
                        <span className="step-number">{i + 1}</span>
                        <span className="flex-1">{step.instruction}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistance(step.distanceM / 1000, units)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
                Provider instructions, not live turn-by-turn navigation. Observe crossings and local
                access rules.
              </p>
            </section>
          )}
        </div>
        <div className="space-y-4">
          <div className="route-editorial-heading">
            <Footprints size={18} />
            <span>YOUR WALK, YOUR WAY</span>
            <span className="ml-auto text-xs">{mode === "live" ? "OSM walking" : "Demo"}</span>
          </div>
          {mode === "live" && status.k === "error" && (
            <div className="card-soft space-y-2 border-coral/50 p-4 text-sm" role="alert">
              <p className="font-medium">Live walking routes unavailable</p>
              <p className="text-muted-foreground">{status.msg}</p>
              <div className="flex gap-2">
                <Button size="sm" className="rounded-full" onClick={() => setRetry((n) => n + 1)}>
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setMode("demo")}
                >
                  Use seeded demo paths
                </Button>
              </div>
            </div>
          )}
          {mode === "live" && status.k === "loading" && (
            <div className="space-y-2" aria-hidden>
              {[0, 1].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          )}
          <label className="block text-sm">
            <input
              type="checkbox"
              checked={showZones}
              onChange={(e) => setShowZones(e.target.checked)}
            />{" "}
            Show reported-concern hot zones · {zones.length} cells ·{" "}
            {routePrefs.includeDemo ? "includes synthetic data" : "excludes synthetic data"}
          </label>
          <RouteWeights
            prefs={routePrefs}
            onChange={setRoutePrefs}
            analysis={analysis}
            routes={routes}
            onChoose={(id) => {
              const r = routes.find((r) => r.id === id);
              if (r) setKind(r.kind);
            }}
          />
          <div role="radiogroup" aria-label="Route options" className="grid gap-2">
            {routes.map((r, i) => (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                role="radio"
                aria-checked={r.kind === sel?.kind}
                onClick={() => {
                  setKind(r.kind);
                  setFocus(null);
                }}
                className={cn(
                  "card-soft p-4 text-left transition",
                  r.kind === sel?.kind ? "ring-2 ring-primary" : "opacity-90 hover:opacity-100",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg">{r.label}</span>
                  <span className="text-lg font-semibold">{r.minutes} min</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <Pill>{formatDistance(r.distanceKm, units)} walk</Pill>
                  {r.provider === "seeded-demo" && <Pill tone="amber">demo path</Pill>}
                  <Pill tone={r.nearbyReportIds.length ? "rose" : "sage"}>
                    {r.nearbyReportIds.length} report{r.nearbyReportIds.length === 1 ? "" : "s"}{" "}
                    nearby
                  </Pill>
                </div>
                {r.kind === sel?.kind && (
                  <p className="mt-2 text-xs text-muted-foreground">{r.note}</p>
                )}
              </motion.button>
            ))}
          </div>

          <details className="border-t py-4">
            <summary className="cursor-pointer font-display text-xl">
              Review a real private journey to {dest.label.split(",")[0]}
            </summary>
            <PrivateJourneyPanel destination={dest.label.slice(0, 160)} />
          </details>
          <div className="card-soft space-y-3 p-4">
            <h2 className="text-lg font-semibold">Start a local journey demo</h2>
            {trip ? (
              <p className="text-sm">
                You already have an active journey.{" "}
                <button className="underline" onClick={() => nav({ to: "/trip" })}>
                  Open it
                </button>
              </p>
            ) : (
              <>
                <label className="block text-sm">
                  Share with
                  <select
                    value={guardian}
                    onChange={(e) => setGuardian(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
                  >
                    <option value="">Don't share this trip</option>
                    {accepted.map((c) => (
                      <option key={c.id} value={c.guardianId}>
                        {profileById(c.guardianId)?.name} ({c.relation})
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-sm">
                  From <strong>{origin.label}</strong> to <strong>{dest.label}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Progress along the route is simulated in this demo — it is not live GPS tracking.
                  Sharing stops automatically when you end the trip.
                </p>
                <Button
                  className="w-full rounded-full"
                  size="lg"
                  disabled={!sel}
                  onClick={() => {
                    if (!sel) return;
                    startTrip(
                      sel,
                      dest.label.split(",")[0] ?? dest.label,
                      guardian || null,
                      locMode,
                    );
                    toast.success("Local demo journey started");
                    nav({ to: "/trip" });
                  }}
                >
                  Start demo journey · {sel?.label ?? "no route"}
                </Button>
              </>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {focus ? "Selected report" : `Reports along ${sel?.label ?? "route"}`}
              </h2>
              {focus && (
                <button className="text-sm underline" onClick={() => setFocus(null)}>
                  Show route reports
                </button>
              )}
            </div>
            <div className="space-y-3">
              {shown.length ? (
                shown.map((r) => <ReportCard key={r.id} r={r} />)
              ) : (
                <p className="text-sm text-muted-foreground">
                  No visible reports along this route in the demo data. That doesn't mean it's
                  risk-free.
                </p>
              )}
            </div>
          </div>
        </div>
      </BalancedColumns>
    </div>
  );
}

function PlaceSearch({
  label,
  value,
  near,
  onPick,
  pinActive,
  onPin,
  extra,
  initialQuery = "",
}: {
  label: string;
  value: Place;
  near: LatLng;
  onPick: (p: Place) => void;
  pinActive: boolean;
  onPin: () => void;
  extra?: ReactNode;
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  useEffect(() => setQ(initialQuery), [initialQuery]);
  const search = async () => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setBusy(true);
    setErr(null);
    setResults([]);
    try {
      const found = await geocode(q, c.signal, near);
      if (!c.signal.aborted && ctrl.current === c) setResults(found);
    } catch (e) {
      if (
        !c.signal.aborted &&
        ctrl.current === c &&
        !(e instanceof GeoError && e.kind === "aborted")
      )
        setErr(e instanceof Error ? e.message : "Search failed");
    } finally {
      if (ctrl.current === c) setBusy(false);
    }
  };
  return (
    <div className="card-soft p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <p className="truncate text-xs font-medium" title={value.label}>
          {value.label}
        </p>
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Place, city or latitude, longitude"
          aria-label={`Search ${label.toLowerCase()} place`}
          className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm"
        />
        <Button
          size="sm"
          type="submit"
          disabled={busy || q.trim().length < 3}
          aria-label={`Search ${label}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>
      {err && (
        <p className="mt-1 text-xs text-coral" role="alert">
          {err}
        </p>
      )}
      {results.length > 0 && (
        <ul className="mt-2 divide-y rounded-xl border bg-background text-sm">
          {results.map((r) => (
            <li key={`${r.at[0]},${r.at[1]}`}>
              <button
                className="w-full px-3 py-2 text-left hover:bg-accent"
                onClick={() => {
                  onPick(r);
                  setResults([]);
                  setQ("");
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={pinActive ? "default" : "ghost"}
          className="rounded-full"
          onClick={onPin}
          aria-pressed={pinActive}
        >
          <MapPin className="h-3.5 w-3.5" /> {pinActive ? "Tap map…" : "Pin on map"}
        </Button>
        {extra}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Search on submit. Coordinates also work without place search, e.g. 51.5074, -0.1278.
      </p>
    </div>
  );
}
