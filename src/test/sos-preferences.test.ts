import { beforeEach, describe, it, expect } from "vitest";
import { getState, resetDemo, setState } from "@/lib/cocoon/store";
import {
  saveSosPreferences,
  requestSOS,
  setFailNext,
  retryFailed,
  setRole,
  startTrip,
  recipientRespond,
} from "@/lib/cocoon/actions";
import { planRoutes } from "@/lib/cocoon/routing";
import { ORIGIN, DESTINATIONS } from "@/lib/cocoon/seed";
import { DEFAULT_SOS_PREFERENCES } from "@/lib/cocoon/sos-policy";
import { parseSavedDemo } from "@/lib/cocoon/persistence";
beforeEach(() => resetDemo());
describe("SOS recipient preferences", () => {
  it("includes multiple accepted guardians instead of silently picking only one", () => {
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) => ({ ...c, status: "accepted" as const })),
    }));
    requestSOS({ authoriseResponders: false });
    expect(
      getState()
        .recipients.map((r) => r.profileId)
        .sort(),
    ).toEqual(["u-kabir", "u-meera"]);
  });
  it("does not leak SOS or responder updates to an excluded journey guardian", () => {
    const route = planRoutes(ORIGIN.at, DESTINATIONS[0]!.at, [])[0]!;
    startTrip(route, DESTINATIONS[0]!.label, "u-meera", "simulated");
    saveSosPreferences({ ...DEFAULT_SOS_PREFERENCES, guardianIds: [] });
    requestSOS({ authoriseResponders: true });
    const inc = getState().incidents[0]!,
      rc = getState().recipients.find((r) => r.kind === "responder")!;
    setRole("responder");
    setState((s) => ({ ...s, actorIds: { ...s.actorIds, responder: rc.profileId } }));
    recipientRespond(inc.id, "responder", "accepted");
    expect(
      getState().notifications.some(
        (n) => n.type === "sos_confirmed" || n.type === "responder_ack",
      ),
    ).toBe(false);
  });
  it("sends to all selected accepted guardians, never invited contacts", () => {
    saveSosPreferences({ ...DEFAULT_SOS_PREFERENCES, guardianIds: ["u-meera", "u-kabir"] });
    requestSOS({ authoriseResponders: false, note: "Fictional test request" });
    expect(getState().recipients.map((r) => r.profileId)).toEqual(["u-meera"]);
    expect(getState().incidents[0]?.note).toBe("Fictional test request");
    expect(getState().incidents[0]?.locationSource).toBe("sample");
  });
  it("respects an explicit empty guardian selection without silently falling back", () => {
    saveSosPreferences({ ...DEFAULT_SOS_PREFERENCES, guardianIds: [] });
    requestSOS({ authoriseResponders: false });
    expect(getState().recipients).toHaveLength(0);
    expect(getState().incidents[0]?.status).toBe("notification_pending");
  });
  it("rechecks revoked consent before retrying failed delivery", () => {
    setFailNext(true);
    requestSOS({ authoriseResponders: false });
    const id = getState().incidents[0]!.id;
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) => ({ ...c, status: "revoked" as const })),
    }));
    retryFailed(id);
    expect(getState().recipients[0]?.status).toBe("failed");
  });
  it("records unavailable channel intent without pretending to notify authorities or nearby users", () => {
    saveSosPreferences({
      ...DEFAULT_SOS_PREFERENCES,
      guardianIds: [],
      authorities: true,
      nearby: true,
    });
    requestSOS({ authoriseResponders: false });
    expect(getState().recipients).toHaveLength(0);
    expect(
      getState().incidents[0]?.events.some((e) => e.text.includes("No authority was contacted")),
    ).toBe(true);
    expect(
      getState().incidents[0]?.events.some((e) => e.text.includes("No nearby user was contacted")),
    ).toBe(true);
  });
  it("keeps repeated activation idempotent while an incident is open", () => {
    requestSOS({ authoriseResponders: true });
    const count = getState().recipients.length;
    requestSOS({ authoriseResponders: true });
    expect(getState().incidents).toHaveLength(1);
    expect(getState().recipients).toHaveLength(count);
  });
  it("prevents other roles editing recipient preferences and migrates old saves", () => {
    setRole("guardian");
    expect(() => saveSosPreferences(DEFAULT_SOS_PREFERENCES)).toThrow(/traveller/);
    const old = { ...getState() } as Record<string, unknown>;
    delete old["sosPreferences"];
    expect(parseSavedDemo(old)?.sosPreferences).toEqual({});
  });
});
