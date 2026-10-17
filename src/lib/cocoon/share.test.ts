import { describe, expect, it } from "vitest";
import { buildMessage, intlDigits, whatsappUrl } from "./share";
import { COUNTRIES, countryByCode } from "./locale";

describe("share", () => {
  const now = new Date("2026-10-16T12:00:00Z");
  it("excludes location by default", () => {
    const m = buildMessage({ kind: "trip", destination: "Library", etaMinutes: 10, now });
    expect(m).not.toMatch(/openstreetmap|snapshot/i);
    expect(m).toMatch(/Library/);
  });
  it("adds labelled snapshot only when supplied", () => {
    const m = buildMessage({
      kind: "check_in",
      destination: "X",
      etaMinutes: 5,
      now,
      location: { at: [51.5, -0.12], takenAt: now, accuracy: "±20 m" },
    });
    expect(m).toMatch(/not live tracking/);
    expect(m).toContain("https://www.openstreetmap.org/?mlat=51.50000&mlon=-0.12000");
  });
  it("encodes text for wa.me", () => {
    const u = whatsappUrl("Hi & bye #1\n?", null);
    expect(u).toBe("https://wa.me/?text=Hi%20%26%20bye%20%231%0A%3F");
    expect(decodeURIComponent(u.split("text=")[1]!)).toBe("Hi & bye #1\n?");
  });
  it("validates international numbers", () => {
    expect(intlDigits("+44 7700 900123")).toBe("447700900123");
    expect(intlDigits("+1 (415) 555-0100")).toBe("14155550100");
    expect(intlDigits("0091 98765 43210")).toBe("919876543210");
    expect(intlDigits("98765 43210")).toBeNull();
    expect(intlDigits("+0123456789")).toBeNull();
    expect(whatsappUrl("a", "98765")).toBe("https://wa.me/?text=a");
    expect(whatsappUrl("a", "+44 7700 900123")).toBe("https://wa.me/447700900123?text=a");
  });
  it("scopes authority numbers to their country only", () => {
    expect(countryByCode("IN")!.authorities.map((a) => a.number)).toEqual(["112", "14490"]);
    expect(countryByCode("US")!.authorities.map((a) => a.number)).toEqual(["911"]);
    expect(countryByCode("GB")!.authorities.map((a) => a.number)).toEqual(["999"]);
    expect(countryByCode("AU")!.authorities.map((a) => a.number)).toEqual(["000"]);
    expect(countryByCode("NP")!.authorities).toEqual([]);
    expect(
      COUNTRIES.filter((c) => c.code !== "IN").every(
        (c) => !c.authorities.some((a) => a.number === "14490"),
      ),
    ).toBe(true);
    expect(countryByCode(null)).toBeNull();
  });
});
