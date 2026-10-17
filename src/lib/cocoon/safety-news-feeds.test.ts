import { afterEach, describe, expect, it, vi } from "vitest";
import { FEEDS, mergeHeadlines, parseFeed, type FeedSource } from "./safety-news";

const now = Date.parse("2026-10-17T12:00:00Z");
const guardian: FeedSource = {
  id: "g",
  url: "https://www.theguardian.com/x/rss",
  publisher: "The Guardian",
  hosts: ["theguardian.com"],
};
const hindu: FeedSource = {
  id: "h",
  url: "https://www.thehindu.com/x.rss",
  publisher: "The Hindu",
  hosts: ["thehindu.com"],
};
const item = (title: string, link: string, date = "Sat, 17 Oct 2026 09:00:00 GMT") =>
  `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate><description><![CDATA[<img src=x onerror=alert(1)>body text]]></description></item>`;
const rss = (s: string) => `<rss version="2.0"><channel>${s}</channel></rss>`;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("publisher feeds", () => {
  it("only fixed https publisher URLs with at most 6 feeds per region", () => {
    for (const region of ["global", "india"] as const) {
      expect(FEEDS[region].length).toBeLessThanOrEqual(6);
      expect(new Set(FEEDS[region].map((f) => f.publisher)).size).toBeGreaterThanOrEqual(4);
      for (const f of FEEDS[region]) expect(new URL(f.url).protocol).toBe("https:");
    }
  });

  it("keeps on-topic metadata with the feed's own publisher and drops descriptions", () => {
    const out = parseFeed(
      rss(
        item(
          "Students protest university response to sexual assault case",
          "https://www.theguardian.com/a",
        ),
      ),
      guardian,
      now,
    );
    expect(out).toEqual([
      {
        title: "Students protest university response to sexual assault case",
        url: "https://www.theguardian.com/a",
        publisher: "The Guardian",
        publishedAt: "2026-10-17T09:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(out)).not.toContain("body text");
  });

  it("rejects off-topic, foreign-host, lookalike, http, old and future items", () => {
    const out = parseFeed(
      rss(
        item("Stakeholders sensitised to food safety norms", "https://www.thehindu.com/a") +
          item("Sexual harassment complaint filed at campus", "https://evil.test/a") +
          item("Sexual harassment complaint filed at campus", "https://thehindu.com.evil.test/a") +
          item("Sexual harassment complaint filed at campus", "http://www.thehindu.com/a") +
          item("Sexual harassment complaint filed at campus", "javascript:alert(1)") +
          item(
            "Sexual harassment complaint filed old",
            "https://www.thehindu.com/b",
            "Wed, 01 Jan 2025 00:00:00 GMT",
          ) +
          item(
            "Sexual harassment complaint filed future",
            "https://www.thehindu.com/c",
            "Tue, 01 Jan 2030 00:00:00 GMT",
          ),
      ),
      hindu,
      now,
    );
    expect(out).toEqual([]);
  });

  it("deduplicates across publishers, sorts newest first and caps at 12", () => {
    const a = {
      title: "Rape case: court hears bail plea",
      url: "https://a/1",
      publisher: "A",
      publishedAt: "2026-10-16T00:00:00Z",
    };
    const b = { ...a, url: "https://b/1", publisher: "B", publishedAt: "2026-10-17T00:00:00Z" };
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...a,
      title: `Stalking story number ${i}`,
      url: `https://c/${i}`,
    }));
    expect(mergeHeadlines([[a], [b]])).toEqual([b]);
    expect(mergeHeadlines([many])).toHaveLength(12);
  });
});

describe("fetchSafetyNews multi-source", () => {
  const load = async () => {
    vi.resetModules();
    return import("./safety-news");
  };
  const feeds: FeedSource[] = [guardian, hindu];

  it("shows working feeds when another source fails, timestamped and attributed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("guardian")
          ? new Response(
              rss(item("Domestic violence charity warns of rise", "https://www.theguardian.com/z")),
            )
          : Promise.reject(new Error("blocked")),
      ),
    );
    const { fetchSafetyNews } = await load();
    const r = await fetchSafetyNews("global", feeds);
    expect(r.unavailable).toBe(false);
    expect(r.stale).toBe(false);
    expect(r.sources).toEqual(["The Guardian"]);
    expect(r.fetchedAt).toBe(new Date(now).toISOString());
    expect(r.items[0]?.publisher).toBe("The Guardian");
  });

  it("reports an honest empty list (not unavailable) when feeds answer with no matches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(rss(""))),
    );
    const { fetchSafetyNews } = await load();
    const r = await fetchSafetyNews("india", feeds);
    expect(r).toMatchObject({ items: [], unavailable: false, stale: false });
  });

  it("treats non-200, oversized and DOCTYPE feeds as failures", async () => {
    const big = "x".repeat(500001);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("guardian")
          ? new Response(big)
          : new Response('<!DOCTYPE x [<!ENTITY a "b">]><rss/>', { status: 200 }),
      ),
    );
    const { fetchSafetyNews } = await load();
    expect(await fetchSafetyNews("global", feeds)).toEqual({
      items: [],
      fetchedAt: "",
      stale: false,
      unavailable: true,
    });
  });

  it("times out a hung feed without blocking the others", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init: RequestInit) =>
        url.includes("guardian")
          ? Promise.resolve(
              new Response(
                rss(item("Consent education expands in schools", "https://www.theguardian.com/q")),
              ),
            )
          : new Promise((_, reject) =>
              init.signal?.addEventListener("abort", () => reject(new Error("abort"))),
            ),
      ),
    );
    const { fetchSafetyNews } = await load();
    const p = fetchSafetyNews("global", feeds);
    await vi.advanceTimersByTimeAsync(7100);
    const r = await p;
    expect(r.items).toHaveLength(1);
    expect(r.unavailable).toBe(false);
  });

  it("coalesces concurrent requests, caches 5 minutes, isolates regions and goes stale on total failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const f = vi.fn(
      async () =>
        new Response(
          rss(item("Stalking case prompts campus review", "https://www.theguardian.com/s")),
        ),
    );
    vi.stubGlobal("fetch", f);
    const { fetchSafetyNews } = await load();
    const [a, b] = await Promise.all([
      fetchSafetyNews("global", [guardian]),
      fetchSafetyNews("global", [guardian]),
    ]);
    expect(a).toBe(b);
    expect(f).toHaveBeenCalledTimes(1);
    await fetchSafetyNews("global", [guardian]);
    expect(f).toHaveBeenCalledTimes(1);
    vi.setSystemTime(now + 6 * 60000);
    f.mockRejectedValue(new Error("down"));
    const stale = await fetchSafetyNews("global", [guardian]);
    expect(stale).toEqual({ ...a, stale: true, unavailable: true });
    expect((await fetchSafetyNews("india", [guardian])).items).toEqual([]);
  });
});
