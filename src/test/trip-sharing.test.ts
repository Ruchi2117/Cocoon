import { beforeEach, describe, expect, it } from "vitest";
import { getState, resetDemo, setState } from "@/lib/cocoon/store";
import {
  advanceTrip,
  startTrip,
  stopTripSharing,
  resumeTripSharing,
  setRole,
} from "@/lib/cocoon/actions";
import { DESTINATIONS, ORIGIN } from "@/lib/cocoon/seed";
import { planRoutes } from "@/lib/cocoon/routing";
import { pointAt } from "@/lib/cocoon/routing";
import { tripsVisibleTo } from "@/lib/cocoon/access";
import {
  requestSOS,
  checkIn,
  endTrip,
  sendConcern,
  setFailNext,
  closeIncident,
} from "@/lib/cocoon/actions";
describe("trip control", () => {
  it("reports failed simulated delivery rather than claiming success", () => {
    start();
    setFailNext(true);
    expect(sendConcern("Please call me")).toBe("failed");
    expect(getState().notifications[0]?.delivery).toBe("failed");
    stopTripSharing();
    expect(checkIn()).toBe("not-shared");
  });
  it("lets the traveller resolve an SOS with no delivered recipients", () => {
    setState((s) => ({ ...s, contacts: [] }));
    requestSOS({ authoriseResponders: false });
    const inc = getState().incidents[0]!;
    expect(inc.status).toBe("notification_pending");
    closeIncident(inc.id, "resolved", "I am safe now");
    expect(getState().incidents[0]?.status).toBe("resolved");
  });
  it("interpolates simulated progress by distance on uneven route segments", () => {
    const p = pointAt(
      [
        [0, 0],
        [0, 0.001],
        [0, 0.1],
      ],
      0.5,
    );
    expect(p[1]).toBeCloseTo(0.05, 5);
    expect(
      pointAt(
        [
          [0, 0],
          [0, 0.1],
        ],
        -1,
      ),
    ).toEqual([0, 0]);
    expect(() => pointAt([], 0.5)).toThrow();
  });
  beforeEach(() => resetDemo());
  const start = () => {
    const r = planRoutes(ORIGIN.at, DESTINATIONS[0]!.at, getState().reports)[0]!;
    startTrip({ ...r, minutes: 20 }, "Library", "u-meera", "manual");
  };
  it("keeps ETA proportional to total progress rather than compounding reductions", () => {
    start();
    advanceTrip(0.25);
    expect(getState().trips[0]?.etaMinutes).toBe(15);
    advanceTrip(0.25);
    expect(getState().trips[0]?.etaMinutes).toBe(10);
    advanceTrip(0.5);
    expect(getState().trips[0]?.etaMinutes).toBe(0);
  });
  it("stops guardian access immediately without ending the trip", () => {
    start();
    expect(tripsVisibleTo(getState(), "guardian")).toHaveLength(1);
    stopTripSharing();
    expect(tripsVisibleTo(getState(), "guardian")).toHaveLength(0);
    expect(getState().trips[0]?.status).toBe("active");
    resumeTripSharing();
    expect(tripsVisibleTo(getState(), "guardian")).toHaveLength(1);
  });
  it("does not resume sharing with a revoked contact", () => {
    start();
    stopTripSharing();
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) => ({ ...c, status: "revoked" as const })),
    }));
    resumeTripSharing();
    expect(getState().trips[0]?.sharing).toBe("stopped");
  });
  it("does not let another role toggle traveller consent", () => {
    start();
    setRole("guardian");
    stopTripSharing();
    expect(getState().trips[0]?.sharing).toBe("active");
  });
  it("rejects traveller mutations while acting as a different role", () => {
    start();
    setRole("responder");
    requestSOS({ authoriseResponders: true });
    advanceTrip(0.5);
    endTrip();
    checkIn();
    expect(getState().incidents).toHaveLength(0);
    expect(getState().trips[0]?.progress).toBe(0);
    expect(getState().trips[0]?.status).toBe("active");
  });
});
