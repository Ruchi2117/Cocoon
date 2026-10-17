import { XMLParser, XMLValidator } from "fast-xml-parser";

export type NewsRegion = "global" | "india";
export interface SafetyHeadline {
  title: string;
  url: string;
  publisher: string;
  publishedAt: string;
}
export interface NewsResult {
  items: SafetyHeadline[];
  fetchedAt: string;
  stale: boolean;
  unavailable: boolean;
}
const publishers = new Set([
  "BBC",
  "BBC News",
  "Reuters",
  "AP News",
  "The Associated Press",
  "The Guardian",
  "The Indian Express",
  "The Hindu",
  "NDTV",
  "Hindustan Times",
  "Al Jazeera",
  "Al Jazeera English",
  "NPR",
  "UN News",
]);
const scalar = (v: unknown): string =>
  typeof v === "string"
    ? v
    : typeof v === "object" && v !== null && "#text" in v
      ? scalar(v["#text"])
      : "";
/** Only plain headline metadata is retained; publisher HTML/descriptions are never rendered. */
export function parseSafetyNews(xml: string, now = Date.now()): SafetyHeadline[] {
  if (xml.length > 500000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new Error("Invalid news feed");
  const parsed = new XMLParser({
    ignoreAttributes: false,
    processEntities: true,
    htmlEntities: true,
    parseTagValue: false,
  }).parse(xml);
  const raw: unknown = parsed?.rss?.channel?.item;
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : [raw];
  const seen = new Set<string>();
  return items
    .flatMap((value: unknown): SafetyHeadline[] => {
      if (!value || typeof value !== "object") return [];
      const item = value as Record<string, unknown>;
      const publisher = scalar(item["source"]).trim();
      let title = scalar(item["title"])
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (title.endsWith(` - ${publisher}`)) title = title.slice(0, -publisher.length - 3);
      const url = scalar(item["link"]);
      const date = Date.parse(scalar(item["pubDate"]));
      let validUrl = false;
      try {
        const u = new URL(url);
        validUrl =
          u.protocol === "https:" &&
          u.hostname === "news.google.com" &&
          !u.username &&
          !u.password &&
          u.pathname.startsWith("/rss/articles/");
      } catch {
        /* discard */
      }
      if (
        !validUrl ||
        !publishers.has(publisher) ||
        title.length < 15 ||
        title.length > 260 ||
        !Number.isFinite(date) ||
        date > now + 3600000 ||
        now - date > 31 * 86400000 ||
        !/safety|assault|harassment|consent|rape|gender.based|sexual violence|spiking|stalking/i.test(
          title,
        ) ||
        seen.has(title.toLowerCase())
      )
        return [];
      seen.add(title.toLowerCase());
      return [{ title, url, publisher, publishedAt: new Date(date).toISOString() }];
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 12);
}
const cache = new Map<NewsRegion, NewsResult>();
const pending = new Map<NewsRegion, Promise<NewsResult>>();
export async function fetchSafetyNews(region: NewsRegion): Promise<NewsResult> {
  const saved = cache.get(region);
  if (saved && Date.now() - Date.parse(saved.fetchedAt) < 5 * 60000) return saved;
  const existing = pending.get(region);
  if (existing) return existing;
  const task = (async (): Promise<NewsResult> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const query =
        region === "india"
          ? '("women safety" OR "campus safety" OR "sexual assault" OR "sexual harassment" OR "LPU") India when:30d'
          : '("campus safety" OR "sexual assault" OR "gender-based violence" OR "consent education") when:30d';
      const response = await fetch(
        `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-${region === "india" ? "IN" : "US"}&gl=${region === "india" ? "IN" : "US"}&ceid=${region === "india" ? "IN" : "US"}:en`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error("News unavailable");
      // Bound the stream before parsing, including responses without Content-Length.
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No feed");
      const decoder = new TextDecoder();
      let xml = "";
      let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 500000) {
          await reader.cancel();
          throw new Error("Feed too large");
        }
        xml += decoder.decode(chunk.value, { stream: true });
      }
      xml += decoder.decode();
      const result = {
        items: parseSafetyNews(xml),
        fetchedAt: new Date().toISOString(),
        stale: false,
        unavailable: false,
      };
      cache.set(region, result);
      return result;
    } catch {
      return saved && Date.now() - Date.parse(saved.fetchedAt) < 24 * 3600000
        ? { ...saved, stale: true, unavailable: true }
        : { items: [], fetchedAt: "", stale: false, unavailable: true };
    } finally {
      clearTimeout(timer);
      pending.delete(region);
    }
  })();
  pending.set(region, task);
  return task;
}
