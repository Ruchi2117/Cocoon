import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { distanceToPathKm, validPoint } from "./geometry";
import type { SafetyReport } from "./types";

describe("walking geometry", () => {
  it("finds a report beside a long segment, not only its endpoints", () => {
    expect(
      distanceToPathKm(
        [0.0005, 0.05],
        [
          [0, 0],
          [0, 0.1],
        ],
      ),
    ).toBeLessThan(0.06);
    expect(
      distanceToPathKm(
        [0.1, 0.05],
        [
          [0, 0],
          [0, 0.1],
        ],
      ),
    ).toBeGreaterThan(10);
  });
  it("rejects invalid geographic coordinates", () => {
    expect(validPoint([91, 0])).toBe(false);
    expect(validPoint([0, NaN])).toBe(false);
    expect(validPoint([28, 77])).toBe(true);
  });
});
describe("map providers", () => {
  it("accepts valid typed coordinates without any provider call", async () => {
    const { geocode } = await import("./geo");
    expect((await geocode("51.5074, -0.1278"))[0]?.at).toEqual([51.5074, -0.1278]);
    expect(fetch).not.toHaveBeenCalled();
    await expect(geocode("91, 0")).rejects.toMatchObject({ kind: "empty" });
  });
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it("never requests an invalid, identical or overly distant route", async () => {
    const { liveWalkingRoutes } = await import("./geo");
    await expect(liveWalkingRoutes([0, 0], [0, 0], [])).rejects.toMatchObject({ kind: "empty" });
    await expect(liveWalkingRoutes([91, 0], [0, 0], [])).rejects.toMatchObject({ kind: "empty" });
    await expect(liveWalkingRoutes([0, 0], [20, 20], [])).rejects.toMatchObject({ kind: "empty" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not fetch when cancellation happened before the call", async () => {
    const { geocode } = await import("./geo");
    const c = new AbortController();
    c.abort();
    await expect(geocode("London", c.signal)).rejects.toMatchObject({ kind: "aborted" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("validates Photon coordinates, deduplicates results and caches repeated searches", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        features: [
          {
            geometry: { coordinates: [-0.12, 51.5] },
            properties: { name: "Westminster", city: "London", country: "United Kingdom" },
          },
          { geometry: { coordinates: [-0.12, 51.5] }, properties: { name: "duplicate" } },
          { geometry: { coordinates: [500, 500] }, properties: { name: "invalid" } },
        ],
      }),
    );
    const { geocode } = await import("./geo");
    const a = await geocode("Westminster London");
    expect(a).toHaveLength(1);
    expect(a[0]?.at).toEqual([51.5, -0.12]);
    expect(await geocode("Westminster London")).toEqual(a);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed provider payloads", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ unexpected: true }));
    const { geocode } = await import("./geo");
    await expect(geocode("London")).rejects.toMatchObject({ kind: "network" });
  });
  it("returns provider walking steps and recomputes report visibility on cache hits", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        code: "Ok",
        routes: [
          {
            distance: 1100,
            duration: 800,
            geometry: {
              coordinates: [
                [0, 0],
                [0.01, 0],
              ],
            },
            legs: [
              {
                steps: [
                  {
                    distance: 1100,
                    name: "High Street",
                    maneuver: { type: "depart", location: [0, 0] },
                  },
                  { distance: 0, name: "", maneuver: { type: "arrive", location: [0.01, 0] } },
                ],
              },
            ],
          },
        ],
      }),
    );
    const { liveWalkingRoutes } = await import("./geo");
    const report = { id: "r1", location: [0.0005, 0.005], moderation: "visible" } as SafetyReport;
    const a = await liveWalkingRoutes([0, 0], [0, 0.01], [report]);
    expect(a[0]?.steps?.[0]?.instruction).toBe("Start walking on High Street");
    expect(a[0]?.nearbyReportIds).toEqual(["r1"]);
    const b = await liveWalkingRoutes([0, 0], [0, 0.01], [{ ...report, moderation: "hidden" }]);
    expect(b[0]?.nearbyReportIds).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("handles rate-limit responses without inventing routes", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("busy", { status: 429 }));
    const { liveWalkingRoutes } = await import("./geo");
    await expect(liveWalkingRoutes([0, 0], [0, 0.01], [])).rejects.toMatchObject({
      kind: "throttled",
    });
  });
});
