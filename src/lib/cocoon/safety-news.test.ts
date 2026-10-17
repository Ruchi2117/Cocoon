import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSafetyNews } from "./safety-news";
const now = Date.parse("2026-10-16T12:00:00Z");
const item = (
  title = "Campus safety reforms follow assault allegations",
  source = "BBC News",
  link = "https://news.google.com/rss/articles/example",
  date = "Fri, 16 Oct 2026 10:00:00 GMT",
) =>
  `<item><title><![CDATA[${title} - ${source}]]></title><link>${link}</link><source url="https://www.bbc.com">${source}</source><pubDate>${date}</pubDate><description><![CDATA[<img src=x onerror=alert(1)>Private details must not be rendered]]></description></item>`;
const rss = (items: string) => `<rss version="2.0"><channel>${items}</channel></rss>`;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("safety news boundary", () => {
  it("keeps source/date/link metadata without including descriptions or HTML", () => {
    const articles = parseSafetyNews(
      rss(item("<b>Campus safety</b> reforms follow allegations")),
      now,
    );
    expect(articles).toEqual([
      {
        title: "Campus safety reforms follow allegations",
        publisher: "BBC News",
        url: "https://news.google.com/rss/articles/example",
        publishedAt: "2026-10-16T10:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(articles)).not.toContain("Private details");
  });
  it("rejects unapproved publishers, unsafe links, old/future dates and unrelated headlines", () => {
    expect(
      parseSafetyNews(
        rss(
          item(undefined, "Anonymous blog") +
            item(undefined, undefined, "javascript:alert(1)") +
            item(undefined, undefined, "https://news.google.com.evil.test/rss/articles/fake") +
            item(undefined, undefined, undefined, "Tue, 01 Jan 2030 00:00:00 GMT") +
            item(undefined, undefined, undefined, "Wed, 01 Jan 2025 00:00:00 GMT") +
            item("Sports team wins championship"),
        ),
        now,
      ),
    ).toEqual([]);
  });
  it("deduplicates stories and handles single-item and empty feeds", () => {
    expect(parseSafetyNews(rss(item() + item()), now)).toHaveLength(1);
    expect(parseSafetyNews(rss(""), now)).toEqual([]);
  });
  it("rejects entity declarations, invalid XML and oversized inputs", () => {
    expect(() =>
      parseSafetyNews('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///secret">]><rss>&x;</rss>'),
    ).toThrow();
    expect(() => parseSafetyNews("<rss>")).toThrow();
    expect(() => parseSafetyNews("x".repeat(500001))).toThrow();
  });
  it("uses a shared cached fetch and returns a clearly stale last-good list on failure", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const fetchMock = vi.fn().mockResolvedValue(new Response(rss(item())));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchSafetyNews } = await import("./safety-news");
    const googleOnly = (await import("./safety-news")).FEEDS.india.filter(
      (f) => f.publisher === "google",
    );
    const first = await fetchSafetyNews("india", googleOnly);
    expect(first.items).toHaveLength(1);
    expect(first.unavailable).toBe(false);
    await fetchSafetyNews("india", googleOnly);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(now + 6 * 60000);
    fetchMock.mockRejectedValue(new Error("offline"));
    const stale = await fetchSafetyNews("india", googleOnly);
    expect(stale).toEqual({ ...first, stale: true, unavailable: true });
    expect((await fetchSafetyNews("global")).items).toEqual([]);
    vi.setSystemTime(now + 25 * 3600000);
    expect((await fetchSafetyNews("india", googleOnly)).items).toEqual([]);
  });
});
