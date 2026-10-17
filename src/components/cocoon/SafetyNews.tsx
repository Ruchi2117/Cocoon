import { NewsFlipbook } from "./NewsFlipbook";
import { ScrollWords } from "./ScrollWords";
import { useEffect, useState } from "react";
import { RefreshCw, Newspaper, ArrowUpRight } from "lucide-react";
import type { NewsRegion, NewsResult } from "@/lib/cocoon/safety-news";
export function SafetyNews() {
  const [enabled, setEnabled] = useState(false);
  const [region, setRegion] = useState<NewsRegion>("global");
  const [result, setResult] = useState<NewsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(false);
      const timeout = window.setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(`/api/public/safety-news?region=${region}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("News unavailable");
        const data = (await response.json()) as NewsResult;
        if (active) {
          setResult(data);
          setError(data.unavailable);
        }
      } catch {
        if (active) setError(true);
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    };
    setResult(null);
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setRevision((n) => n + 1);
    }, 10 * 60000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [enabled, region, revision]);
  return (
    <section id="news" className="safety-news" aria-labelledby="news-heading">
      {!enabled && (
        <div className="news-desk-art" aria-hidden="true">
          <span>THE COCOON EDITION</span>
          <Newspaper size={80} strokeWidth={1} />
          <strong>
            READ.
            <br />
            REFLECT.
            <br />
            <em>RECONNECT.</em>
          </strong>
          <ArrowUpRight size={38} />
          <small>A window on the wider world.</small>
        </div>
      )}
      <div className="learn-section-heading">
        <span className="eyebrow">The wider picture / news desk</span>
        <h2 id="news-heading">
          <ScrollWords text="STAY INFORMED." />
          <br />
          <em>
            <ScrollWords text="STAY GROUNDED." />
          </em>
        </h2>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed">
        Content note: sexual violence and harassment, without graphic descriptions. You can read the
        guides without opening the news. Headlines reflect publishers’ reporting, not Cocoon’s
        verification or a measure of danger near you.
      </p>
      <details className="news-context">
        <summary>LPU coverage: what the reporting establishes</summary>
        <div className="space-y-3 p-5 text-sm leading-relaxed">
          <span className="eyebrow">India · editorial context · reviewed 16 Oct 2026</span>
          <p>
            The Indian Express reported on 30 September that a court petition followed an unverified
            social-media allegation at LPU. Its 1 October report covered separate police cases
            concerning the ensuing unrest. These reports do not establish that a rape occurred. The
            allegation, protests and legal proceedings must be distinguished; absence of
            confirmation is not a finding that an allegation is false.
          </p>
          <p className="flex flex-wrap gap-4">
            <a
              href="https://indianexpress.com/article/cities/chandigarh/lpu-violence-student-cbi-probe-chancellor-mittal-skips-unrest-query-10900147/"
              target="_blank"
              rel="noopener noreferrer"
            >
              30 Sep · petition reporting ↗
            </a>
            <a
              href="https://indianexpress.com/article/cities/chandigarh/lpu-violence-three-firs-nh44-blockade-uni-mall-looting-lovely-professional-university-10901860/"
              target="_blank"
              rel="noopener noreferrer"
            >
              1 Oct · unrest reporting ↗
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Dated context, not a live case-status tracker. Do not circulate alleged survivor
            identities, private details or unverified images.
          </p>
        </div>
      </details>
      <div className="news-controls">
        <label>
          Coverage{" "}
          <select
            aria-label="News coverage"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value as NewsRegion);
              setResult(null);
            }}
          >
            <option value="global">Global</option>
            <option value="india">India</option>
          </select>
        </label>
        <button
          onClick={() => {
            setEnabled(!enabled);
            setResult(null);
          }}
        >
          {enabled ? "Hide live headlines" : "Show live headlines"}
        </button>
        {enabled && (
          <button
            onClick={() => setRevision((n) => n + 1)}
            disabled={loading}
            aria-label="Refresh safety news"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        )}
      </div>
      {enabled && (
        <div aria-live="polite" aria-busy={loading}>
          {loading && <p className="py-4 text-sm">Checking the news desk…</p>}
          {error && (
            <p role="status" className="news-error">
              Live news is unavailable right now.
              {result?.stale
                ? " Showing an older cached list with its original retrieval time."
                : " Try again later; the guides and dated LPU context remain available."}
            </p>
          )}
          {result?.fetchedAt && (
            <p className="py-3 text-xs text-muted-foreground">
              {result.stale ? "Cached" : "Retrieved"} {new Date(result.fetchedAt).toLocaleString()}{" "}
              · Google News RSS · selected publishers · checks every 10 minutes while visible;
              server cache up to 5 minutes.
            </p>
          )}
          {result && !result.items.length && !error && !loading && (
            <p className="py-4 text-sm">
              No matching headlines from the selected publishers in the last 30 days. This is not a
              complete news archive.
            </p>
          )}
          <NewsFlipbook key={`${region}-${result?.fetchedAt}`} items={result?.items ?? []} />
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Coverage may be incomplete, disputed or paywalled. Read the full article and check for
        corrections. Headlines are kept separate from community reports and route information.
      </p>
    </section>
  );
}
