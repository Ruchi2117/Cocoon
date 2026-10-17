/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- test file: indexed access is asserted by the tests themselves
import { beforeEach, describe, expect, it } from "vitest";
import { getState, resetDemo, setState } from "@/lib/cocoon/store";
import * as A from "@/lib/cocoon/actions";
import { incidentsVisibleTo, tripsVisibleTo, publicReports } from "@/lib/cocoon/access";
import { planRoutes } from "@/lib/cocoon/routing";
import { DESTINATIONS, ORIGIN } from "@/lib/cocoon/seed";

const role = (r: "traveller" | "guardian" | "responder" | "moderator") => A.setRole(r);
function start() {
  const routes = planRoutes(ORIGIN.at, DESTINATIONS[0].at, getState().reports);
  A.startTrip(routes[2], DESTINATIONS[0].label, "u-meera", "simulated");
}

describe("Cocoon demo flow", () => {
  beforeEach(() => resetDemo());

  it("produces three deterministic routes", () => {
    const a = planRoutes(ORIGIN.at, DESTINATIONS[0].at, getState().reports);
    const b = planRoutes(ORIGIN.at, DESTINATIONS[0].at, getState().reports);
    expect(a.map((r) => r.kind)).toEqual(["fastest", "balanced", "safety"]);
    expect(a[0].minutes).toBe(b[0].minutes);
  });

  it("shares trip only with the authorised guardian and stops on end", () => {
    start();
    expect(tripsVisibleTo(getState(), "guardian")).toHaveLength(1);
    setState((s) => ({ ...s, actorIds: { ...s.actorIds, guardian: "u-kabir" } }));
    expect(tripsVisibleTo(getState(), "guardian")).toHaveLength(0);
    expect(tripsVisibleTo(getState(), "responder")).toHaveLength(0);
    setState((s) => ({ ...s, actorIds: { ...s.actorIds, guardian: "u-meera" } }));
    A.endTrip();
    expect(tripsVisibleTo(getState(), "guardian")).toHaveLength(0);
  });

  it("runs the SOS lifecycle across roles on one incident", () => {
    start();
    A.requestSOS({ authoriseResponders: false });
    let inc = getState().incidents[0];
    expect(inc.status).toBe("notified");
    expect(incidentsVisibleTo(getState(), "responder")).toHaveLength(0);
    role("guardian");
    A.recipientRespond(inc.id, "guardian", "acknowledged");
    expect(getState().incidents[0].status).toBe("acknowledged");
    role("traveller");
    A.escalateToResponders();
    expect(incidentsVisibleTo(getState(), "responder")).toHaveLength(1);
    expect(getState().recipients.some((r) => r.profileId === "u-farah")).toBe(false); // unavailable
    role("responder");
    A.recipientRespond(inc.id, "responder", "accepted");
    A.responderAssist(inc.id);
    expect(getState().incidents[0].status).toBe("assistance_in_progress");
    role("traveller");
    A.closeIncident(inc.id, "resolved", "safe");
    inc = getState().incidents[0];
    expect(inc.status).toBe("resolved");
    A.closeIncident(inc.id, "cancelled", "x");
    expect(getState().incidents[0].status).toBe("resolved"); // invalid transition rejected
  });

  it("handles failed delivery, no response and cancellation", () => {
    start();
    A.setFailNext(true);
    A.requestSOS({ authoriseResponders: false });
    const inc = getState().incidents[0];
    expect(inc.status).toBe("notification_pending");
    expect(getState().recipients[0].status).toBe("failed");
    role("guardian");
    A.recipientRespond(inc.id, "guardian", "acknowledged");
    expect(getState().incidents[0].status).toBe("notification_pending"); // cannot ack undelivered
    role("traveller");
    A.retryFailed(inc.id);
    expect(getState().incidents[0].status).toBe("notified");
    A.markNoResponse(inc.id);
    expect(getState().recipients.find((r) => r.incidentId === inc.id)!.status).toBe("no_response");
    A.closeIncident(inc.id, "cancelled", "mistake");
    expect(getState().incidents[0].status).toBe("cancelled");
  });

  it("hides reporter identity and supports moderation", () => {
    expect(publicReports(getState(), "traveller").every((r) => !("reporterId" in r))).toBe(true);
    role("moderator");
    A.moderateReport("r1", "hidden");
    expect(publicReports(getState(), "traveller").some((r) => r.id === "r1")).toBe(false);
    A.moderateReport("r1", "visible");
    expect(publicReports(getState(), "traveller").some((r) => r.id === "r1")).toBe(true);
  });
});
