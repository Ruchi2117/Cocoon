import { describe, expect, it } from "vitest";
import { emergencyNote, emergencyPhoneHref, locationNote } from "./emergency-note";
import { previewReferral, readReferral, referralCredits } from "./referral-demo";
describe("emergency note boundaries", () => {
  it("does not invent a location", () => {
    expect(emergencyNote("Call me", null)).toContain("Location not included");
  });
  it("includes accuracy and snapshot context only for valid coordinates", () => {
    const text = locationNote({
      latitude: 1.23456789,
      longitude: 2.3456789,
      accuracy: 37,
      timestamp: 1000,
    });
    expect(text).toContain("1.234568, 2.345679");
    expect(text).toContain("±37 m");
    expect(text).toContain("not live tracking");
    expect(locationNote({ latitude: 95, longitude: 0, accuracy: 1, timestamp: 1000 })).toBe(
      "Location unavailable.",
    );
  });
  it("allows deliberate short phone numbers but rejects dial codes and scripts", () => {
    expect(emergencyPhoneHref("911")).toBe("tel:911");
    expect(emergencyPhoneHref("+44 (20) 1234 5678")).toBe("tel:+442012345678");
    expect(emergencyPhoneHref("*123#")).toBeNull();
    expect(emergencyPhoneHref("javascript:alert(1)")).toBeNull();
  });
});
describe("referral concept ledger", () => {
  it("caps repeat sample joins at three without awarding for creating a code", () => {
    let value = { code: "COCOON-ABCD1234", joins: [] as string[] };
    expect(referralCredits(value)).toBe(0);
    for (let i = 0; i < 20; i++) value = previewReferral(value);
    expect(referralCredits(value)).toBe(30);
    expect(new Set(value.joins).size).toBe(3);
  });
  it("rejects malformed saved state and deduplicates sample joins", () => {
    expect(readReferral("null")).toEqual({ code: "", joins: [] });
    expect(
      readReferral('{"code":"COCOON-ABCD1234","joins":["preview-1","preview-1","someone"]}').joins,
    ).toEqual(["preview-1"]);
    expect(previewReferral({ code: "", joins: [] })).toEqual({ code: "", joins: [] });
  });
});
