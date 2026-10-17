import type { RouteAnalysis, RoutePreferences } from "@/lib/cocoon/route-analysis";
import { CONCERN_WEIGHT } from "@/lib/cocoon/route-analysis";
import type { RouteOption } from "@/lib/cocoon/routing";

export function RouteWeights({
  prefs,
  onChange,
  analysis,
  routes,
  onChoose,
}: {
  prefs: RoutePreferences;
  onChange: (p: RoutePreferences) => void;
  analysis: RouteAnalysis[];
  routes: RouteOption[];
  onChoose: (id: string) => void;
}) {
  const ordered = [...analysis].sort((a, b) => a.cost - b.cost);
  const best = ordered[0];
  const tied = !!best && ordered.length > 1 && Math.abs(best.cost - ordered[1]!.cost) < 0.1;
  const evidence = analysis.some((a) => a.nearCount > 0);
  const total = prefs.concerns + prefs.distance + prefs.unknown;
  return (
    <section className="route-weight-desk" aria-label="Route comparison model">
      <span className="eyebrow">THE ROUTE LAB / EXPLAINABLE COMPARISON</span>
      <h2>Why this way?</h2>
      <p>
        A lower comparison cost means a better match to these preferences among the returned paths.
        It is not a safety percentage, a prediction or proof that an area is safe.
      </p>
      <div className="route-weight-sliders">
        {(
          [
            ["concerns", "Reported concerns"],
            ["distance", "Extra distance"],
            ["unknown", "Missing observation coverage"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label} <strong>{total ? Math.round((prefs[key] / total) * 100) : 0}%</strong>
            <input
              type="range"
              min="0"
              max="100"
              value={prefs[key]}
              onChange={(e) => onChange({ ...prefs, [key]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <label>
        <input
          type="checkbox"
          checked={prefs.night}
          onChange={(e) => onChange({ ...prefs, night: e.target.checked })}
        />{" "}
        Nighttime planning · lighting concerns ×1.5
      </label>
      <label>
        <input
          type="checkbox"
          checked={prefs.includeDemo}
          onChange={(e) => onChange({ ...prefs, includeDemo: e.target.checked })}
        />{" "}
        Include synthetic reports for demonstration
      </label>
      {!total && <p role="status">All weights are zero; no preference ranking is available.</p>}
      {!evidence && (
        <p className="route-model-note">
          No eligible concern observations near these routes. Distance can still differ; there is
          insufficient evidence to call one safer.
        </p>
      )}
      {prefs.includeDemo && (
        <p className="route-model-note">
          Synthetic observations affect this comparison. It is a demonstration, not local safety
          intelligence.
        </p>
      )}
      {routes.length === 1 && (
        <p>Only one walking path was returned. No alternative comparison is possible.</p>
      )}
      <div className="route-comparison-grid">
        {analysis.map((a, i) => {
          const r = routes.find((r) => r.id === a.id)!;
          return (
            <button key={a.id} onClick={() => onChoose(a.id)}>
              <span className="eyebrow">
                PATH {i + 1} · {r.provider === "seeded-demo" ? "ILLUSTRATIVE" : "WALKING NETWORK"}
              </span>
              <strong>{r.label}</strong>
              <span>
                {r.distanceKm.toFixed(2)} km · {r.minutes} min
              </span>
              <b>
                {a.cost.toFixed(1)} <small>comparison cost · lower preferred</small>
              </b>
              <span>Concern exposure: {a.exposure.toFixed(2)} units·km</span>
              <span>
                Extra distance: {Math.round(a.detour * 100)}% · Unobserved:{" "}
                {Math.round(a.unknownShare * 100)}%
              </span>
              <span>{a.nearCount} eligible concern signal(s) within 200 m</span>
              {total > 0 && best?.id === a.id && routes.length > 1 && (
                <em>
                  {tied
                    ? "Joint preference match"
                    : evidence
                      ? "Best match to these weights"
                      : "Distance / coverage preference only"}
                </em>
              )}
            </button>
          );
        })}
      </div>
      <details>
        <summary>Inspect the concern signals for each path</summary>
        {analysis.map((a) => (
          <div key={a.id}>
            <h3>{routes.find((r) => r.id === a.id)?.label}</h3>
            {a.contributions.length ? (
              <ul>
                {a.contributions.map((c) => (
                  <li key={c.id}>
                    {c.category.replaceAll("_", " ")} · {Math.round(c.distanceM)} m from path ·{" "}
                    {Math.floor(c.ageDays)} days old · {c.units.toFixed(2)} weighted signal units
                    before proximity taper
                  </li>
                ))}
              </ul>
            ) : (
              <p>No eligible concern signals within 200 m.</p>
            )}
          </div>
        ))}
      </details>
      <details>
        <summary>How the calculation works · weights, limits & sources</summary>
        <p>
          We compare only paths returned by the walking provider. This does not optimise every
          street in the city, and alternative paths may not be returned. Dashed demo paths are not
          street-accurate.
        </p>
        <p>
          Category weights (policy choices, not research-calibrated probabilities):{" "}
          {Object.entries(CONCERN_WEIGHT)
            .map(([k, v]) => `${k.replaceAll("_", " ")} ${v}`)
            .join("; ")}
          . Positive observations never cancel concern signals. We do not infer live lighting,
          crowds, CCTV, police availability, road class or accessibility from missing data.
        </p>
        <p>
          Only visible observations from the last 90 days count. Influence halves every 30 days,
          falls linearly to zero at 200 m, and uses rounded public locations. Future/invalid dates
          are excluded. Duplicate category/source/date/location signals are collapsed. Community
          agreement and attribution receive no verification bonus.
        </p>
        <p>
          At equal-distance midpoints (~50 m; maximum 250 samples), take the strongest concern
          signal and multiply by segment length. Cost = 100 × weighted mean of
          exposure/(1+exposure), detour/(1+detour), and unobserved route fraction. Unobserved means
          no eligible observation within 200 m; even observed areas can lack important information.
        </p>
        <p>
          Red “hot zones” show coarse report-concern cells (~330 m north–south), with a 220 m
          illustrative circle. Counts describe reports, not crime rates or incident boundaries. No
          population/footfall denominator or official crime feed is available. A single observation
          can appear as a zone.
        </p>
        <a
          href="https://project-osrm.org/docs/v5.24.0/api/#route-service"
          target="_blank"
          rel="noopener noreferrer"
        >
          Walking provider route-service documentation ↗
        </a>
      </details>
    </section>
  );
}
