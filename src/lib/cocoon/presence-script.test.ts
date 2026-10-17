import { describe, it, expect } from "vitest";
import { INTENTS, roomProvider, type PresenceIntent } from "./presence-script";
describe("guided scripted companion, no private access", () => {
  it.each(["company", "ground", "next"] as PresenceIntent[])(
    "%s has distinct guidance without immediately repeated fallback",
    async (intent) => {
      const replies = [];
      for (let turn = 0; turn < 4; turn++)
        replies.push((await roomProvider.reply("something", { intent, turn, country: null })).text);
      expect(new Set(replies).size).toBe(4);
      expect(INTENTS[intent].reminder.length).toBeGreaterThan(20);
    },
  );
  it("concern suggests explicit SOS only, no inferred dispatch or invented country", async () => {
    const r = await roomProvider.reply("someone is following me", {
      intent: "next",
      turn: 0,
      country: null,
    });
    expect(r.actions).toEqual(["sos", "kit"]);
    expect(r.text).not.toContain("112");
    expect(r.text).toContain("cannot assess danger or dispatch");
  });
  it("journey request is navigation, not a private mutation or read", async () => {
    const r = await roomProvider.reply("check in on my journey", {
      intent: "next",
      turn: 0,
      country: null,
    });
    expect(r.actions).toEqual(["journey", "sos"]);
    expect(r.text).toContain("don’t read private account");
  });
  it("recording stays deliberate separate manual action", async () => {
    const r = await roomProvider.reply("record a video", {
      intent: "company",
      turn: 0,
      country: null,
    });
    expect(r.actions).toEqual(["recording"]);
    expect(r.text).toContain("choose a local recorder");
  });
});
