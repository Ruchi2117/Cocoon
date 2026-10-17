import { describe, expect, it } from "vitest";
import { localVoiceAllowed, voiceConfigured, voiceInstructions } from "./voice-policy";
describe("live voice boundary", () => {
  const env = {
    NODE_ENV: "development",
    COCOON_ENABLE_LOCAL_VOICE: "true",
    OPENAI_API_KEY: "mock-key",
    COCOON_REALTIME_MODEL: "mock-model",
    COCOON_REALTIME_VOICE: "mock-voice",
  };
  it("requires explicit enablement, loopback and matching origin", () => {
    expect(
      localVoiceAllowed("http://127.0.0.1:8080/api/companion/voice", "http://127.0.0.1:8080", env),
    ).toBe(true);
    expect(
      localVoiceAllowed("http://127.0.0.1:8080/api/companion/voice", "https://elsewhere.test", env),
    ).toBe(false);
    expect(
      localVoiceAllowed(
        "https://cocoon.example/api/companion/voice",
        "https://cocoon.example",
        env,
      ),
    ).toBe(false);
    expect(localVoiceAllowed("http://localhost:8080/api/companion/voice", null, env)).toBe(false);
    expect(
      localVoiceAllowed("http://localhost:8080/api/companion/voice", "http://localhost:8080", {
        ...env,
        COCOON_ENABLE_LOCAL_VOICE: "false",
      }),
    ).toBe(false);
  });
  it("never enables live calls in production even if environment values exist", () => {
    expect(
      localVoiceAllowed("http://localhost:8080/api/companion/voice", "http://localhost:8080", {
        ...env,
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });
  it("requires every provider setting", () => {
    expect(voiceConfigured(env)).toBe(true);
    expect(voiceConfigured({ ...env, COCOON_REALTIME_MODEL: undefined })).toBe(false);
  });
  it("does not grant the conversational model safety action tools", () => {
    const p = voiceInstructions({
      name: "Arjun",
      style: "calm",
      destination: "Library",
      eta: 12,
      sharing: true,
      emergency: "Call your local emergency number.",
    });
    expect(p).toContain("NO action tools");
    expect(p).toContain('"progress":"simulated"');
    expect(p).toContain("not a human");
  });
  it("offers concise support without surveillance or recording claims", () => {
    const p = voiceInstructions({
      name: "Maya",
      style: "calm",
      emergency: "Use your local emergency number.",
      supportMode: true,
    });
    expect(p).toContain("one question at a time");
    expect(p).toContain("help reaching a person now");
    expect(p).toContain("cannot inspect the separate local recordings");
    expect(p).toContain("Never require evidence before help");
  });
});
