import { describe, expect, it } from "vitest";
import { journeyInput } from "./journey-schema";
const base = {
  requestKey: "10101010-1010-4010-8010-101010101010",
  action: "start",
  destination: "Library",
  recipientIds: ["20202020-2020-4020-8020-202020202020"],
  expectedAt: "2026-10-17T20:00:00Z",
  note: "",
  location: null,
  locationConsent: false,
};
describe("private journey input", () => {
  it("requires destination, selected recipients and deadline", () => {
    expect(journeyInput.safeParse({ ...base, recipientIds: [] }).success).toBe(false);
    expect(journeyInput.safeParse({ ...base, destination: "" }).success).toBe(false);
    expect(journeyInput.safeParse({ ...base, expectedAt: undefined }).success).toBe(false);
  });
  it("requires an owned journey reference for lifecycle actions", () => {
    expect(journeyInput.safeParse({ ...base, action: "check_in" }).success).toBe(false);
  });
  it("rejects client actor/role authorization and non-in-app channels", () => {
    expect(journeyInput.safeParse({ ...base, role: "traveller" }).success).toBe(false);
    expect(journeyInput.safeParse({ ...base, channel: "whatsapp" }).success).toBe(false);
  });
  it("limits notes to 500 and selected recipients to five", () => {
    expect(journeyInput.safeParse({ ...base, note: "n".repeat(501) }).success).toBe(false);
    expect(
      journeyInput.safeParse({ ...base, recipientIds: Array(6).fill(base.recipientIds[0]) })
        .success,
    ).toBe(false);
  });
});
