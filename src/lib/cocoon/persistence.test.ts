import { beforeEach, describe, expect, it } from "vitest";
import { makeSeed } from "./seed";
import { parseSavedDemo } from "./persistence";
import { getState, resetDemo, setTabRole, setTabActor } from "./store";
import { startTrip } from "./actions";
import { planRoutes } from "./routing";
import { DESTINATIONS, ORIGIN } from "./seed";
describe("demo persistence boundary", () => {
  beforeEach(() => resetDemo());
  it("loads valid demo state but rejects broken record shapes", () => {
    const s = makeSeed();
    expect(parseSavedDemo(s)?.version).toBe(1);
    expect(parseSavedDemo({ ...s, reports: [{ id: "missing-fields" }] })).toBeNull();
    expect(parseSavedDemo({ ...s, companion: { name: "invalid" } })).toBeNull();
    expect(parseSavedDemo({ version: 1 })).toBeNull();
  });
  it("retains this tab's role and identity when another tab changes shared data", () => {
    setTabRole("guardian");
    setTabActor("guardian", "u-kabir");
    const other = {
      ...makeSeed(),
      role: "traveller",
      actorIds: { ...makeSeed().actorIds, guardian: "u-meera" },
    };
    localStorage.setItem("cocoon-demo-v1", JSON.stringify(other));
    window.dispatchEvent(new StorageEvent("storage", { key: "cocoon-demo-v1" }));
    expect(getState().role).toBe("guardian");
    expect(getState().actorIds.guardian).toBe("u-kabir");
  });
  it("rejects corrupted optional route metadata before it can reach the journey UI", () => {
    const route = planRoutes(ORIGIN.at, DESTINATIONS[0]!.at, getState().reports)[0]!;
    startTrip(route, "Metro", "u-meera", "simulated");
    const s = getState();
    expect(s.trips.length).toBeGreaterThan(0);
    expect(parseSavedDemo(s)).not.toBeNull();
    expect(
      parseSavedDemo({ ...s, trips: s.trips.map((trip) => ({ ...trip, routeSteps: "broken" })) }),
    ).toBeNull();
    expect(
      parseSavedDemo({ ...s, trips: s.trips.map((trip) => ({ ...trip, routeDistanceKm: -1 })) }),
    ).toBeNull();
  });
  it("recovers malformed demo storage without changing the personal Safety Kit", () => {
    localStorage.setItem("cocoon-kit-v1", JSON.stringify({ trustedName: "My contact" }));
    localStorage.setItem("cocoon-demo-v1", '{"version":1}');
    window.dispatchEvent(new StorageEvent("storage", { key: "cocoon-demo-v1" }));
    expect(getState().reports.length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem("cocoon-kit-v1")!)).toEqual({
      trustedName: "My contact",
    });
  });
});
