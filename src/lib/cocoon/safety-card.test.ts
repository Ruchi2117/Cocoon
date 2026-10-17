import { describe, expect, it } from "vitest";
import { buildSafetyCard } from "./safety-card";
const base = {
  country: null,
  securityName: "",
  securityNumber: "",
  trustedName: "",
  trustedNumber: "",
  date: new Date("2026-10-16T12:00:00Z"),
};
describe("offline safety card", () => {
  it("never substitutes India's number for an unconfigured country", () => {
    const card = buildSafetyCard({ ...base, country: "NP" });
    expect(card).toContain("No verified directory");
    expect(card).not.toContain("112");
  });
  it("includes selected local authorities and only supplied personal contacts", () => {
    const card = buildSafetyCard({
      ...base,
      country: "GB",
      trustedName: "Demo guardian",
      trustedNumber: "+44 7700 900123",
    });
    expect(card).toContain("999");
    expect(card).toContain("Demo guardian: +44 7700 900123");
    expect(card).not.toContain("14490");
  });
  it("remains an explicit static file and does not imply emergency dispatch", () => {
    const card = buildSafetyCard(base);
    expect(card).toContain("static copy");
    expect(card).toContain("does not guarantee safety or contact emergency services");
  });
});
