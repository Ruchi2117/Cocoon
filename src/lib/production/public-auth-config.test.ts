import { describe, expect, it } from "vitest";
import publicAuth from "./public-auth-config.json";
describe("reproducible public-only hosting configuration", () => {
  it("uses a hosted HTTPS origin, not localhost or preview proxy", () => {
    const url = new URL(publicAuth.url);
    expect(url.protocol).toBe("https:");
    expect(url.hostname.endsWith(".supabase.co")).toBe(true);
    expect(url.pathname).toBe("/");
  });
  it("contains only a publishable key and public URL, never privileged credentials", () => {
    expect(Object.keys(publicAuth).sort()).toEqual(["publishableKey", "url"]);
    expect(publicAuth.publishableKey.startsWith("sb_publishable_")).toBe(true);
    expect(publicAuth.publishableKey.startsWith("sb_secret_")).toBe(false);
  });
});
