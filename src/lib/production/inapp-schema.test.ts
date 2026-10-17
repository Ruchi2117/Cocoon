import { describe, it, expect } from "vitest";
import { inappSOSInput } from "./inapp-schema";
const input = {
  requestKey: "11111111-1111-4111-8111-111111111111",
  recipientIds: ["22222222-2222-4222-8222-222222222222"],
  channel: "in_app",
  note: "",
  location: null,
  locationConsent: false,
};
describe("explicit in-app-only SOS", () => {
  it("accepts in-app SOS without a phone or WhatsApp consent", () =>
    expect(inappSOSInput.safeParse(input).success).toBe(true));
  it("rejects an external channel", () =>
    expect(inappSOSInput.safeParse({ ...input, channel: "whatsapp" }).success).toBe(false));
  it("requires selected recipients", () =>
    expect(inappSOSInput.safeParse({ ...input, recipientIds: [] }).success).toBe(false));
  it("limits confirmed recipients to five", () =>
    expect(
      inappSOSInput.safeParse({ ...input, recipientIds: Array(6).fill(input.recipientIds[0]) })
        .success,
    ).toBe(false));
});

