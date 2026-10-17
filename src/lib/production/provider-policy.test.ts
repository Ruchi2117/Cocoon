import { describe, expect, it, vi } from "vitest";
import { PROVIDER_POLICY } from "./provider-policy";
import { productionVoiceConfigured, expireVoiceSessions } from "./voice-service";
import { dispatchProduction } from "./dispatch";

describe("zero-payment release", () => {
  it("keeps natural voice disabled even with credentials and activation flags", () => {
    expect(
      productionVoiceConfigured({
        OPENAI_API_KEY: "mock-only",
        COCOON_REALTIME_MODEL: "mock",
        COCOON_REALTIME_VOICE: "mock",
        COCOON_VOICE_ENABLED: "true",
        COCOON_DURABLE_SCHEDULER_READY: "true",
      }),
    ).toBe(false);
  });
  it("locks WhatsApp activation independently of environment configuration", () => {
    expect(PROVIDER_POLICY.whatsapp).toBe(false);
    expect(Object.isFrozen(PROVIDER_POLICY)).toBe(true);
  });
  it("keeps Gemini Live unavailable for personal or sensitive safety conversations", () => {
    expect(PROVIDER_POLICY.geminiLive).toBe(false);
  });
  it("does not allow runtime activation of free-tier Gemini", () => {
    expect(Reflect.set(PROVIDER_POLICY, "geminiLive", true)).toBe(false);
    expect(PROVIDER_POLICY.geminiLive).toBe(false);
  });
  it("refuses dispatch and voice provider cleanup without any network call", async () => {
    const fetchMock = vi.fn(() => {
      throw new Error("Network forbidden in this test");
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      expect(await dispatchProduction("https://cocoon.example")).toMatchObject({ ran: false });
      await expireVoiceSessions();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

