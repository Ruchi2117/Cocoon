import { describe, it, expect } from "vitest";
import { emergencyDraftInput, inappSOSInput } from "./inapp-schema";
const input = {
  requestKey: "11111111-1111-4111-8111-111111111111",
  recipientIds: ["22222222-2222-4222-8222-222222222222"],
  channel: "in_app",
  note: "",
  location: null,
  locationConsent: false,
  content: {
    introduction: "",
    helpInstructions: "",
    includeDraft: false,
    senderName: "Traveller",
    preparedAt: "2026-10-17T17:40:00Z",
  },
};
describe("explicit in-app-only SOS", () => {
  it("requires reviewed content and rejects extra scraped media/transcript fields", () => {
    const { content: _content, ...missing } = input;
    expect(inappSOSInput.safeParse(missing).success).toBe(false);
    expect(
      inappSOSInput.safeParse({
        ...input,
        content: { ...input.content, transcript: "Not permitted" },
      }).success,
    ).toBe(false);
  });
  it("limits optional introduction to 300 characters", () => {
    expect(
      emergencyDraftInput.safeParse({
        introduction: "x".repeat(300),
        helpInstructions: "",
        preferredRecipientIds: [],
      }).success,
    ).toBe(true);
    expect(
      emergencyDraftInput.safeParse({
        introduction: "x".repeat(301),
        helpInstructions: "",
        preferredRecipientIds: [],
      }).success,
    ).toBe(false);
  });
  it("limits optional instructions to 500 characters", () => {
    expect(
      emergencyDraftInput.safeParse({
        introduction: "",
        helpInstructions: "x".repeat(500),
        preferredRecipientIds: [],
      }).success,
    ).toBe(true);
    expect(
      emergencyDraftInput.safeParse({
        introduction: "",
        helpInstructions: "x".repeat(501),
        preferredRecipientIds: [],
      }).success,
    ).toBe(false);
  });
  it("omitting the draft rejects introduction or help hidden in the payload", () => {
    expect(
      inappSOSInput.safeParse({ ...input, content: { ...input.content, introduction: "Hidden" } })
        .success,
    ).toBe(false);
    expect(
      inappSOSInput.safeParse({
        ...input,
        content: { ...input.content, helpInstructions: "Hidden" },
      }).success,
    ).toBe(false);
  });
  it("rejects duplicate preferred or SOS recipients", () => {
    const recipientIds = [input.recipientIds[0], input.recipientIds[0]];
    expect(inappSOSInput.safeParse({ ...input, recipientIds }).success).toBe(false);
    expect(
      emergencyDraftInput.safeParse({
        introduction: "",
        helpInstructions: "",
        preferredRecipientIds: recipientIds,
      }).success,
    ).toBe(false);
  });
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
