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
  /** Publishers whose feed answered this time (may be fewer than configured). */
  sources?: string[];
}

/** A fixed, server-only feed. URLs are never taken from the request. */
export interface FeedSource {
  id: string;
  url: string;
  /** "google" = Google News search with a publisher allowlist; otherwise a single named publisher. */
  publisher: string | "google";
  /** Hostnames article links must resolve to (exact or subdomain). */
  hosts: string[];
}

const googlePublishers = new Set([
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

const google = (region: NewsRegion): FeedSource => {
  const q =
    region === "india"
      ? '("women safety" OR "campus safety" OR "sexual assault" OR "sexual harassment" OR "LPU") India when:30d'
      : '("campus safety" OR "sexual assault" OR "gender-based violence" OR "consent education") when:30d';
  const c = region === "india" ? "IN" : "US";
  return {
    id: `google-${region}`,
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-${c}&gl=${c}&ceid=${c}:en`,
    publisher: "google",
    hosts: ["news.google.com"],
  };
};

/** At most 6 per region (runtime allows 6 concurrent outbound requests per invocation). */
export const FEEDS: Record<NewsRegion, FeedSource[]> = {
  global: [
    {
      id: "guardian-vawg",
      url: "https://www.theguardian.com/society/violence-against-women-and-girls/rss",
      publisher: "The Guardian",
      hosts: ["theguardian.com"],
    },
    {
      id: "guardian-society",
      url: "https://www.theguardian.com/society/rss",
      publisher: "The Guardian",
      hosts: ["theguardian.com"],
    },
    {
      id: "un-women",
      url: "https://news.un.org/feed/subscribe/en/news/topic/women/feed/rss.xml",
      publisher: "UN News",
      hosts: ["news.un.org"],
    },
    {
      id: "bbc-world",
      url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      publisher: "BBC News",
      hosts: ["bbc.co.uk", "bbc.com"],
    },
    {
      id: "aljazeera",
      url: "https://www.aljazeera.com/xml/rss/all.xml",
      publisher: "Al Jazeera",
      hosts: ["aljazeera.com"],
    },
    google("global"),
  ],
  india: [
    {
      id: "bbc-india",
      url: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml",
      publisher: "BBC News",
      hosts: ["bbc.co.uk", "bbc.com"],
    },
    {
      id: "guardian-india",
      url: "https://www.theguardian.com/world/india/rss",
      publisher: "The Guardian",
      hosts: ["theguardian.com"],
    },
    {
      id: "hindu-national",
      url: "https://www.thehindu.com/news/national/feeder/default.rss",
      publisher: "The Hindu",
      hosts: ["thehindu.com"],
    },
    {
      id: "ndtv-india",
      url: "https://feeds.feedburner.com/ndtvnews-india-news",
      publisher: "NDTV",
      hosts: ["ndtv.com"],
    },
    {
      id: "ht-india",
      url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
      publisher: "Hindustan Times",
      hosts: ["hindustantimes.com"],
    },
    google("india"),
  ],
};

/** Publisher-section feeds are broad, so they need specific terms (not bare "safety"). */
const TOPIC =
  /sexual(ly)? (assault|harass|violence|abuse|misconduct)|\brap(e|ed|es|ist)\b|molest|stalk(ing|er)|spiking|consent|gender.based violence|violence against women|wom[ae]n'?s? safety|campus safety|domestic (violence|abuse)|femicide|\bposh\b|pocso|acid attack|dowry/i;
/** Google search results are already topic-scoped by the query. */
const GOOGLE_TOPIC =
  /safety|assault|harassment|consent|rape|gender.based|sexual violence|spiking|stalking/i;
const MAX_BYTES = 500000;

const scalar = (v: unknown): string =>
  typeof v === "string"
    ? v
    : typeof v === "number"
      ? String(v)
      : typeof v === "object" && v !== null && "#text" in v
        ? scalar((v as Record<string, unknown>)["#text"])
        : "";

const hostAllowed = (url: string, hosts: string[]) => {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
    return hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
};

/** Parse one fixed feed. Only plain headline metadata is retained; no descriptions, HTML or images. */
export function parseFeed(xml: string, source: FeedSource, now = Date.now()): SafetyHeadline[] {
  if (
    xml.length > MAX_BYTES ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) ||
    XMLValidator.validate(xml) !== true
  )
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
  const out: SafetyHeadline[] = [];
  for (const value of items) {
    if (!value || typeof value !== "object") continue;
    const item = value as Record<string, unknown>;
    const publisher =
      source.publisher === "google" ? scalar(item["source"]).trim() : source.publisher;
    let title = scalar(item["title"])
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (source.publisher === "google" && title.endsWith(` - ${publisher}`))
      title = title.slice(0, -publisher.length - 3);
    const url = scalar(item["link"]).trim();
    const date = Date.parse(scalar(item["pubDate"]) || scalar(item["dc:date"]));
    const validUrl =
      hostAllowed(url, source.hosts) &&
      (source.publisher !== "google" || new URL(url).pathname.startsWith("/rss/articles/"));
    if (
      !validUrl ||
      (source.publisher === "google" && !googlePublishers.has(publisher)) ||
      title.length < 15 ||
      title.length > 260 ||
      !Number.isFinite(date) ||
      date > now + 3600000 ||
      now - date > 31 * 86400000 ||
      !(source.publisher === "google" ? GOOGLE_TOPIC : TOPIC).test(title)
    )
      continue;
    out.push({ title, url, publisher, publishedAt: new Date(date).toISOString() });
  }
  return out;
}

/** Merge, deduplicate by normalised title and URL, newest first, capped at 12. */
export function mergeHeadlines(lists: SafetyHeadline[][]): SafetyHeadline[] {
  const seen = new Set<string>();
  return lists
    .flat()
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter((h) => {
      const key = h.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      if (seen.has(key) || seen.has(h.url)) return false;
      seen.add(key);
      seen.add(h.url);
      return true;
    })
    .slice(0, 12);
}

/** Back-compatible Google News parser. */
export function parseSafetyNews(xml: string, now = Date.now()): SafetyHeadline[] {
  return mergeHeadlines([parseFeed(xml, google("global"), now)]);
}

async function readFeed(source: FeedSource, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
        "User-Agent": "CocoonSafetyNews/1.0 (+https://coco-safe-routes.lovable.app)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No feed");
    const decoder = new TextDecoder();
    let xml = "";
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Feed too large");
      }
      xml += decoder.decode(chunk.value, { stream: true });
    }
    return xml + decoder.decode();
  } finally {
    clearTimeout(timer);
  }
}

const cache = new Map<NewsRegion, NewsResult>();
const pending = new Map<NewsRegion, Promise<NewsResult>>();
export async function fetchSafetyNews(
  region: NewsRegion,
  feeds: FeedSource[] = FEEDS[region],
): Promise<NewsResult> {
  const saved = cache.get(region);
  if (saved && Date.now() - Date.parse(saved.fetchedAt) < 5 * 60000) return saved;
  const existing = pending.get(region);
  if (existing) return existing;
  const task = (async (): Promise<NewsResult> => {
    try {
      const settled = await Promise.allSettled(
        feeds.slice(0, 6).map(async (f) => ({ f, items: parseFeed(await readFeed(f, 7000), f) })),
      );
      const ok = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
      if (ok.length === 0) throw new Error("All feeds failed");
      const result: NewsResult = {
        items: mergeHeadlines(ok.map((o) => o.items)),
        fetchedAt: new Date().toISOString(),
        stale: false,
        unavailable: false,
        sources: [
          ...new Set(ok.map((o) => (o.f.publisher === "google" ? "Google News" : o.f.publisher))),
        ],
      };
      cache.set(region, result);
      return result;
    } catch {
      return saved && Date.now() - Date.parse(saved.fetchedAt) < 24 * 3600000
        ? { ...saved, stale: true, unavailable: true }
        : { items: [], fetchedAt: "", stale: false, unavailable: true };
    } finally {
      pending.delete(region);
    }
  })();
  pending.set(region, task);
  return task;
}
