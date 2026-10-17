import { z } from "zod";
import type { LatLng, SafetyReport } from "./types";
import { distanceKm, type RouteOption } from "./routing";
import { distanceToPathKm, validPoint } from "./geometry";

/** Explicit-submit Photon search + FOSSGIS walking routes. Cached and throttled demo-grade
 * public services. Use contracted/self-hosted endpoints before a public rollout. */
export interface Place {
  label: string;
  at: LatLng;
}
export class GeoError extends Error {
  constructor(
    public kind: "network" | "timeout" | "empty" | "throttled" | "aborted",
    msg: string,
  ) {
    super(msg);
  }
}
let lastSearch = 0,
  lastRoute = 0;
const placesCache = new Map<string, Place[]>();
const routeCache = new Map<string, { at: number; routes: RouteOption[] }>();
async function jsonFetch(url: string, signal?: AbortSignal, ms = 10000): Promise<unknown> {
  if (signal?.aborted) throw new GeoError("aborted", "Cancelled");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), ms);
  const onAbort = () => ctrl.abort("aborted");
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!r.ok)
      throw new GeoError(
        r.status === 429 ? "throttled" : "network",
        r.status === 429
          ? "The map service is busy. Please wait before retrying."
          : `Map service responded ${r.status}.`,
      );
    const body: unknown = await r.json();
    if (signal?.aborted) throw new GeoError("aborted", "Cancelled");
    return body;
  } catch (e) {
    if (e instanceof GeoError) throw e;
    if (ctrl.signal.aborted)
      throw new GeoError(
        ctrl.signal.reason === "timeout" ? "timeout" : "aborted",
        ctrl.signal.reason === "timeout"
          ? "The map service took too long. Try again or use map pins."
          : "Cancelled",
      );
    throw new GeoError(
      "network",
      "Couldn't reach the map service. Check your connection, or use map pins.",
    );
  } finally {
    clearTimeout(t);
    signal?.removeEventListener("abort", onAbort);
  }
}
const photonSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z.record(z.unknown()),
    }),
  ),
});
export async function geocode(q: string, signal?: AbortSignal, near?: LatLng): Promise<Place[]> {
  const query = q.trim().slice(0, 120);
  const coordinates = /^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/.exec(query);
  if (coordinates) {
    const at: LatLng = [Number(coordinates[1]), Number(coordinates[2])];
    if (!validPoint(at))
      throw new GeoError(
        "empty",
        "Latitude must be between −90 and 90; longitude between −180 and 180.",
      );
    if (signal?.aborted) throw new GeoError("aborted", "Cancelled");
    return [{ label: `Coordinates ${at[0].toFixed(4)}, ${at[1].toFixed(4)}`, at }];
  }
  if (query.length < 3)
    throw new GeoError(
      "empty",
      "Type at least 3 characters, including a city for clearer results.",
    );
  if (signal?.aborted) throw new GeoError("aborted", "Cancelled");
  const key = JSON.stringify([query.toLowerCase(), near?.map((n) => n.toFixed(2))]);
  const cached = placesCache.get(key);
  if (cached) return cached;
  if (Date.now() - lastSearch < 1100)
    throw new GeoError("throttled", "Please wait a moment before searching again.");
  lastSearch = Date.now();
  const p = new URLSearchParams({ q: query, limit: "5", lang: "en" });
  if (near && validPoint(near)) {
    p.set("lat", String(near[0]));
    p.set("lon", String(near[1]));
  }
  const parsed = photonSchema.safeParse(
    await jsonFetch(`https://photon.komoot.io/api/?${p}`, signal),
  );
  if (!parsed.success)
    throw new GeoError(
      "network",
      "The place service returned an unexpected response. Try map pins instead.",
    );
  const seen = new Set<string>();
  const results = parsed.data.features.flatMap((f) => {
    const at: LatLng = [f.geometry.coordinates[1], f.geometry.coordinates[0]];
    if (!validPoint(at)) return [];
    const fields = [
      f.properties["name"],
      f.properties["street"],
      f.properties["city"],
      f.properties["state"],
      f.properties["country"],
    ].filter((v): v is string => typeof v === "string" && !!v.trim());
    const label =
      [...new Set(fields)].join(", ") || `Point ${at[0].toFixed(4)}, ${at[1].toFixed(4)}`;
    const id = at.join(",");
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ label, at }];
  });
  if (!results.length)
    throw new GeoError("empty", "No places found. Include the city, or choose a point on the map.");
  if (placesCache.size > 30) placesCache.clear();
  placesCache.set(key, results);
  return results;
}
const stepSchema = z.object({
  distance: z.number().nonnegative(),
  name: z.string().optional(),
  maneuver: z.object({
    type: z.string(),
    modifier: z.string().optional(),
    location: z.tuple([z.number(), z.number()]),
  }),
});
const routeSchema = z.object({
  code: z.string(),
  routes: z
    .array(
      z.object({
        distance: z.number().positive(),
        duration: z.number().nonnegative(),
        geometry: z.object({ coordinates: z.array(z.tuple([z.number(), z.number()])).min(2) }),
        legs: z.array(z.object({ steps: z.array(stepSchema) })).optional(),
      }),
    )
    .optional(),
});
function instruction(s: z.infer<typeof stepSchema>) {
  const type = s.maneuver.type,
    direction = s.maneuver.modifier?.replaceAll("_", " ");
  const action =
    type === "depart"
      ? "Start walking"
      : type === "arrive"
        ? "Arrive at your destination"
        : type === "roundabout" || type === "rotary"
          ? "At the roundabout, continue"
          : direction
            ? `${type === "turn" ? "Turn" : "Continue"} ${direction}`
            : "Continue";
  return `${action}${s.name && type !== "arrive" ? ` on ${s.name}` : ""}`;
}
function withReports(routes: RouteOption[], reports: SafetyReport[]) {
  return routes.map((r) => ({
    ...r,
    nearbyReportIds: reports
      .filter(
        (rep) => rep.moderation === "visible" && distanceToPathKm(rep.location, r.path) < 0.15,
      )
      .map((rep) => rep.id),
  }));
}
export async function liveWalkingRoutes(
  from: LatLng,
  to: LatLng,
  reports: SafetyReport[],
  signal?: AbortSignal,
): Promise<RouteOption[]> {
  if (!validPoint(from) || !validPoint(to))
    throw new GeoError("empty", "Choose valid start and destination points.");
  if (signal?.aborted) throw new GeoError("aborted", "Cancelled");
  const direct = distanceKm(from, to);
  if (direct < 0.015)
    throw new GeoError(
      "empty",
      "These points are almost the same. Choose a destination a little farther away.",
    );
  if (direct > 25)
    throw new GeoError(
      "empty",
      "These points are over 25 km apart. Move both endpoints to your city for a walking route.",
    );
  const key = JSON.stringify([from, to]);
  const hit = routeCache.get(key);
  if (hit && Date.now() - hit.at < 300000) return withReports(hit.routes, reports);
  if (Date.now() - lastRoute < 1100)
    throw new GeoError("throttled", "Please wait a moment before recalculating the route.");
  lastRoute = Date.now();
  const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const data = routeSchema.safeParse(
    await jsonFetch(
      `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${coords}?overview=full&geometries=geojson&alternatives=3&steps=true`,
      signal,
      12000,
    ),
  );
  if (!data.success)
    throw new GeoError(
      "network",
      "The routing service returned incomplete route data. Please retry.",
    );
  if (data.data.code !== "Ok" || !data.data.routes?.length)
    throw new GeoError(
      "empty",
      "No walking route found. Try a nearby public street or open external directions.",
    );
  const routes: RouteOption[] = data.data.routes
    .slice(0, 3)
    .map((rt, i): RouteOption => ({
      id: `live-${i}-${from.join("-")}-${to.join("-")}`,
      kind: (["fastest", "balanced", "safety"] as const)[i]!,
      label: i === 0 ? "Suggested walk" : `Alternative ${String.fromCharCode(64 + i)}`,
      path: rt.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng),
      distanceKm: rt.distance / 1000,
      minutes: Math.max(1, Math.round(rt.duration > 0 ? rt.duration / 60 : rt.distance / 75)),
      mainRoadShare: "mixed",
      nearbyReportIds: [],
      provider: "osm-foot",
      note: "Walking route from OpenStreetMap data. Conditions and accessibility can change; not assessed for safety.",
      steps: rt.legs?.flatMap((l) =>
        l.steps.map((s) => ({
          instruction: instruction(s),
          distanceM: s.distance,
          at: [s.maneuver.location[1], s.maneuver.location[0]] as LatLng,
        })),
      ),
    }))
    .filter((r) => r.path.every(validPoint));
  if (!routes.length)
    throw new GeoError("network", "Invalid route coordinates returned by the provider.");
  if (routeCache.size > 12) routeCache.clear();
  routeCache.set(key, { at: Date.now(), routes });
  return withReports(routes, reports);
}
export function directionsUrl(from: LatLng, to: LatLng) {
  return `https://www.google.com/maps/dir/?api=1&origin=${from[0]},${from[1]}&destination=${to[0]},${to[1]}&travelmode=walking`;
}
