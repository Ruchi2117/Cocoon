import { describe, it, expect } from "vitest";
import { sameOrigin, validateLocation, sosInput, VOICE_LIMITS, boundedBody } from "./security";
import { productionVoiceConfigured } from "./voice-service";
describe("production consent boundaries", () => {
  it("rejects oversized voice bodies before buffering", async () => {
    await expect(
      boundedBody(new Request("https://cocoon.example", { method: "POST", body: "123456789" }), 8),
    ).rejects.toThrow("Too large");
  });
  it("rejects cross-origin voice creation", () =>
    expect(
      sameOrigin(
        new Request("https://cocoon.example/api/companion/voice", {
          headers: { Origin: "https://other.example" },
        }),
      ),
    ).toBe(false));
  it("rejects a missing voice origin", () =>
    expect(sameOrigin(new Request("https://cocoon.example/api/companion/voice"))).toBe(false));
  it("rejects location without explicit consent", () =>
    expect(() =>
      validateLocation({ latitude: 1, longitude: 2, accuracy: 3, timestamp: 1000 }, false, 1000),
    ).toThrow("consent"));
  it("rejects a stale location older than two minutes", () =>
    expect(() =>
      validateLocation({ latitude: 1, longitude: 2, accuracy: 3, timestamp: 1000 }, true, 121001),
    ).toThrow("fresh"));
  it("accepts a current consented one-time location", () =>
    expect(
      validateLocation({ latitude: 1, longitude: 2, accuracy: 3, timestamp: 1000 }, true, 1000)
        ?.accuracy,
    ).toBe(3));
  it("rejects authority or nearby broadcast channels", () =>
    expect(
      sosInput.safeParse({
        requestKey: crypto.randomUUID(),
        recipientIds: [crypto.randomUUID()],
        channel: "authorities",
        note: "",
        location: null,
        locationConsent: false,
      }).success,
    ).toBe(false));
  it("rejects SOS with no selected recipient", () =>
    expect(
      sosInput.safeParse({
        requestKey: crypto.randomUUID(),
        recipientIds: [],
        channel: "whatsapp",
        note: "",
        location: null,
        locationConsent: false,
      }).success,
    ).toBe(false));
  it("requires durable cleanup before enabling production voice", () =>
    expect(
      productionVoiceConfigured({
        OPENAI_API_KEY: "mock",
        COCOON_REALTIME_MODEL: "mock",
        COCOON_REALTIME_VOICE: "mock",
        COCOON_VOICE_ENABLED: "true",
      }),
    ).toBe(false));
  it("bounds one voice connection to ten minutes", () => expect(VOICE_LIMITS.seconds).toBe(600));
});

