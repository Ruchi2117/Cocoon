import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, Layers, LocateFixed, RefreshCw } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  filterMapReports,
  reportAreaPoint,
  reportKindLabel,
  type ReportFilters,
} from "@/lib/cocoon/report-context";
import type { LatLng, SafetyReport } from "@/lib/cocoon/types";
import type { ConcernZone } from "@/lib/cocoon/route-analysis";

export interface MapRoute {
  id: string;
  path: LatLng[];
  selected: boolean;
  /** Illustrative (non street-accurate) paths render dashed. */
  dashed?: boolean | undefined;
  label?: string | undefined;
  onSelect?: () => void | undefined;
}
interface Props {
  concernZones?: ConcernZone[] | undefined;
  routes?: MapRoute[] | undefined;
  reports?: Omit<SafetyReport, "reporterId">[] | undefined;
  origin?: LatLng | undefined;
  destination?: LatLng | undefined;
  current?: LatLng | null | undefined;
  onReportClick?: (id: string) => void | undefined;
  onMapClick?: (p: LatLng) => void | undefined;
  className?: string | undefined;
  originLabel?: string | undefined;
  destinationLabel?: string | undefined;
  focusPoint?: LatLng | null | undefined;
}

const esc = (t: string) =>
  t.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

const css = (v: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#5a2a4a";

/** Leaflet renders tiles and overlays only; routes come from the routing module. */
export default function CocoonMap({
  concernZones = [],
  routes = [],
  reports = [],
  origin,
  destination,
  current,
  onReportClick,
  onMapClick,
  className,
  originLabel,
  destinationLabel,
  focusPoint,
}: Props) {
  const [tileError, setTileError] = useState(false);
  const [showReports, setShowReports] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showAreas, setShowAreas] = useState(true);
  const [filters, setFilters] = useState<ReportFilters>({
    days: "all",
    kind: "all",
    status: "all",
  });
  const visibleReports = useMemo(() => filterMapReports(reports, filters), [reports, filters]);
  const reportMarkers = useRef(new Map<string, L.CircleMarker>());
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const tiles = useRef<L.TileLayer | null>(null);
  const fitKey = useRef("");
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView(
      [28.6905, 77.2095],
      15,
    );
    const tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    tileLayer.on("tileerror", () => setTileError(true));
    tiles.current = tileLayer;
    m.on("click", (e) => clickRef.current?.([e.latlng.lat, e.latlng.lng]));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (map.current === m) m.invalidateSize({ animate: false });
      });
    });
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      m.stop();
      tileLayer.off();
      m.off();
      m.remove();
      map.current = null;
      layer.current = null;
      tiles.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    reportMarkers.current.clear();
    const plum = css("--plum");
    const lav = css("--lavender");
    const coral = css("--coral");
    const sage = css("--sage");
    concernZones.forEach((zone) => {
      L.circle(zone.at, {
        radius: 220,
        color: zone.demo ? "#9d6a93" : "#bc2847",
        weight: 2,
        dashArray: zone.demo ? "5 6" : undefined,
        fillColor: "#c42646",
        fillOpacity: 0.08 + Math.min(0.22, zone.units * 0.035),
      })
        .bindTooltip(
          esc(
            `${zone.demo ? "Synthetic demo" : "Reported-concern"} zone · ${zone.count} observation(s) · coarse illustrative cell, not crime likelihood`,
          ),
        )
        .addTo(g);
    });
    [...routes]
      .sort((a, b) => Number(a.selected) - Number(b.selected))
      .forEach((r) => {
        const line = L.polyline(r.path, {
          color: r.selected
            ? plum
            : (["#397da2", "#946bb1", "#b97836"][routes.indexOf(r) % 3] ?? lav),
          weight: r.selected ? 7 : 5,
          opacity: r.selected ? 0.95 : 0.8,
          lineCap: "round",
          dashArray: r.dashed ? "2 10" : undefined,
        });
        if (r.label) line.bindTooltip(esc(r.label), { sticky: true });
        if (r.onSelect)
          line.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            r.onSelect?.();
          });
        line.addTo(g);
      });
    (showReports ? visibleReports : []).forEach((r) => {
      const area = reportAreaPoint(r.location);
      if (showAreas)
        L.circle(area, {
          radius: 100,
          color: r.demo ? "#805e74" : "#a75c59",
          weight: 1,
          dashArray: "4 6",
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(g);
      const positive = r.category === "well_lit_busy" || r.category === "police_presence";
      const c = L.circleMarker(area, {
        radius: 8,
        color: "#fff",
        weight: 2,
        fillColor: positive ? sage : r.sourceType === "external_source" ? plum : coral,
        fillOpacity: 0.95,
      });
      c.bindTooltip(
        esc(`${reportKindLabel(r.category)} · ${r.demo ? "Demo" : "Community"} · approximate area`),
      );
      const source =
        r.sourceUrl && /^https:\/\//i.test(r.sourceUrl)
          ? `<br/><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(r.sourceName || "Attributed source")} ↗</a>`
          : r.sourceName
            ? `<br/>Source stated: ${esc(r.sourceName)}`
            : "";
      c.bindPopup(
        `<strong>${esc(reportKindLabel(r.category))}</strong><br/>${esc(r.locationLabel)}<br/><span style="font-size:12px">${esc(r.description)}</span><br/><em style="font-size:11px">${r.demo ? "Synthetic demo data" : "Community report"} · ${esc(r.verification.replaceAll("_", " "))} · ${esc(new Date(r.eventDate || r.submittedAt).toLocaleDateString())}</em><br/><small>Rounded pin · 100 m illustration, not an incident boundary. Not a safety rating.</small>${source}`,
        { maxWidth: 240 },
      );
      c.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onReportClick?.(r.id);
      });
      c.addTo(g);
      reportMarkers.current.set(r.id, c);
    });
    if (origin)
      L.circleMarker(origin, {
        radius: 7,
        color: plum,
        weight: 3,
        fillColor: "#fff",
        fillOpacity: 1,
      })
        .bindTooltip(esc(originLabel ?? "Start"), {
          permanent: true,
          direction: "top",
          className: "cocoon-tip",
        })
        .addTo(g);
    if (destination)
      L.circleMarker(destination, {
        radius: 9,
        color: "#fff",
        weight: 3,
        fillColor: plum,
        fillOpacity: 1,
      })
        .bindTooltip(esc(destinationLabel ?? "Destination"), {
          permanent: true,
          direction: "top",
          className: "cocoon-tip cocoon-tip-dest",
        })
        .addTo(g);
    if (current)
      L.circleMarker(current, {
        radius: 10,
        color: plum,
        weight: 3,
        fillColor: lav,
        fillOpacity: 1,
      })
        .bindTooltip("Latest shared location (simulated)")
        .addTo(g);
    const pts: LatLng[] = routes.flatMap((r) => r.path);
    if (origin) pts.push(origin);
    if (destination) pts.push(destination);
    if (current) pts.push(current);
    // Fit only when geometry changes, not on every report/selection re-render.
    const key = JSON.stringify([routes.map((r) => [r.id, r.path]), origin, destination]);
    if (pts.length > 1 && key !== fitKey.current) {
      fitKey.current = key;
      m.stop();
      m.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 17, animate: false });
    } else if (pts.length === 1 && key !== fitKey.current) {
      fitKey.current = key;
      m.setView(pts[0]!, 16, { animate: false });
    }
  }, [
    routes,
    reports,
    origin,
    destination,
    current,
    onReportClick,
    originLabel,
    destinationLabel,
    showReports,
    visibleReports,
    concernZones,
    showAreas,
  ]);

  useEffect(() => {
    if (focusPoint && map.current) {
      map.current.stop();
      map.current.setView(focusPoint, 17, { animate: false });
    }
  }, [focusPoint]);
  useEffect(() => {
    if (!expanded) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [expanded]);

  const refit = () => {
    const points = routes.flatMap((r) => r.path);
    if (origin) points.push(origin);
    if (destination) points.push(destination);
    if (points.length && map.current) {
      map.current.stop();
      map.current.fitBounds(L.latLngBounds(points), {
        padding: [48, 48],
        maxZoom: 17,
        animate: false,
      });
    }
  };

  return (
    <div
      className={`cocoon-map-frame ${expanded ? "map-expanded" : "relative"} ${className ?? ""}`}
    >
      <div
        ref={el}
        className="absolute inset-0"
        role="region"
        aria-label="Interactive walking map"
      />
      <div className="map-tools" aria-label="Map controls">
        <button onClick={refit} title="Fit route" aria-label="Fit route">
          <LocateFixed size={18} />
        </button>
        <button
          onClick={() => setShowReports(!showReports)}
          aria-pressed={showReports}
          title="Toggle report markers"
          aria-label="Toggle report markers"
        >
          <Layers size={18} />
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          aria-pressed={expanded}
          title={expanded ? "Close expanded map" : "Expand map"}
          aria-label={expanded ? "Close expanded map" : "Expand map"}
        >
          <Expand size={18} />
        </button>
      </div>
      <details className="map-report-context">
        <summary>{showReports ? visibleReports.length : 0} report pins · context & filters</summary>
        <div className="map-context-body">
          {!showReports && (
            <p>Report markers are hidden. Turn on “Toggle report markers” to show these results.</p>
          )}
          <p>
            Report pins are rounded. The optional 100 m circles are illustrations, not event
            boundaries or a safety rating. Community-confirmed is not official verification.
          </p>
          <div className="map-context-fields">
            <label>
              When
              <select
                value={filters.days}
                onChange={(e) =>
                  setFilters({ ...filters, days: e.target.value as ReportFilters["days"] })
                }
              >
                <option value="all">All dates</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </label>
            <label>
              Type
              <select
                value={filters.kind}
                onChange={(e) =>
                  setFilters({ ...filters, kind: e.target.value as ReportFilters["kind"] })
                }
              >
                <option value="all">All reports</option>
                <option value="concern">Concerns</option>
                <option value="positive">Positive observations</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value as ReportFilters["status"] })
                }
              >
                <option value="all">All statuses</option>
                <option value="unverified">Unverified</option>
                <option value="community_confirmed">Community-confirmed</option>
                <option value="source_attributed">Source-attributed</option>
              </select>
            </label>
          </div>
          <label className="map-area-toggle">
            <input
              type="checkbox"
              checked={showAreas}
              onChange={(e) => setShowAreas(e.target.checked)}
            />{" "}
            Show illustrative areas
          </label>
          {!showReports && <p>Report markers are hidden. Use the layers control to show them.</p>}
          {visibleReports.some((r) => r.demo) && (
            <p>
              <strong>Demo records are included.</strong> They are fictional examples, not live
              incidents.
            </p>
          )}
          <ul aria-label="Reports on this map">
            {visibleReports.slice(0, 30).map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    map.current?.setView(reportAreaPoint(r.location), 16, { animate: false });
                    reportMarkers.current.get(r.id)?.openPopup();
                    onReportClick?.(r.id);
                  }}
                >
                  <strong>
                    {reportKindLabel(r.category)} · {r.demo ? "Demo" : "Community"}
                  </strong>
                  <span>{r.locationLabel}</span>
                  <small>
                    {r.eventDate || r.submittedAt.slice(0, 10)} ·{" "}
                    {r.verification.replaceAll("_", " ")} ·{" "}
                    {r.sourceType === "external_source"
                      ? "External-style report"
                      : "Community submission"}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {!visibleReports.length && (
            <p>
              No reports match these filters. This does not establish that an area is free of
              incidents.
            </p>
          )}
        </div>
      </details>
      {tileError && (
        <div className="map-network-note" role="status">
          <span>Some map tiles could not load. Route details remain available.</span>
          <button
            onClick={() => {
              setTileError(false);
              tiles.current?.redraw();
            }}
          >
            <RefreshCw size={13} /> Retry tiles
          </button>
        </div>
      )}
    </div>
  );
}
