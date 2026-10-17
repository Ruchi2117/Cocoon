import { describe, expect, it } from "vitest";
import { demoProvider, emergencyGuidance, isExplicitSos, type CompanionContext } from "./companion";
const ctx: CompanionContext = {
  settings: {
    name: "Arjun",
    voiceURI: null,
    style: "calm",
    chattiness: 2,
    speak: false,
    memories: [],
  },
  trip: null,
  guardianName: null,
  incidentOpen: false,
  history: [],
  country: null,
};
describe("companion intent and country context", () => {
  it("never assumes India's emergency number for an unknown country", () => {
    expect(emergencyGuidance(null)).not.toMatch(/112|India/);
    expect(emergencyGuidance("US")).not.toMatch(/112|India/);
    expect(emergencyGuidance("IN")).toContain("112");
  });
  it("recognizes deliberate SOS but not a cancellation or negated danger", () => {
    expect(isExplicitSos("send SOS now")).toBe(true);
    expect(isExplicitSos("I'm in danger")).toBe(true);
    expect(isExplicitSos("I'm not in danger")).toBe(false);
    expect(isExplicitSos("don't send SOS")).toBe(false);
  });
  it("offers check-in only with an active trip", async () => {
    const r = await demoProvider.reply("I'm okay", ctx);
    expect(r.actions).toEqual([]);
    expect(r.text).toContain("Start a journey");
  });
  it("keeps conversational help distinct from an unsafe situation", async () => {
    const r = await demoProvider.reply("help me choose a song", ctx);
    expect(r.actions).toBeUndefined();
    expect(r.text).toContain("music");
  });
  it("does not invent live weather or driver verification", async () => {
    expect((await demoProvider.reply("will it rain?", ctx)).text).toContain(
      "don't have live weather",
    );
    expect((await demoProvider.reply("I am taking a taxi", ctx)).text).toContain(
      "doesn't verify drivers",
    );
  });
  it("offers safety actions without claiming they ran", async () => {
    const r = await demoProvider.reply("someone is following me", ctx);
    expect(r.actions).toContain("sos");
    expect(r.text).not.toContain("dispatched");
  });
});
