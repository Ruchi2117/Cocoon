import { useEffect, useMemo, useState } from "react";
import { MapPin, Square, Clock, Send, Check } from "lucide-react";
import { CircleAvatar } from "@/components/cocoon/CircleAvatar";

/**
 * DEMO: two-way, time-limited location sharing between you and close people.
 * Everything here is simulated on this screen — no GPS, no network, nothing stored.
 * Each side chooses to share; sharing ends automatically when its time runs out.
 */
type Pt = [number, number];
type Person = { id: string; name: string; rel: string; path: Pt[]; place: string };

const PEOPLE: Person[] = [
  { id: "demo-didi", name: "Didi", rel: "Sister", place: "near the market", path: [[120, 90], [170, 110], [220, 120], [260, 150], [300, 160]] },
  { id: "demo-ananya", name: "Ananya", rel: "Friend", place: "college library", path: [[520, 80], [500, 120], [470, 150], [450, 190]] },
  { id: "demo-maa", name: "Maa", rel: "Mother", place: "home", path: [[640, 300], [640, 300]] },
];
const YOU_PATH: Pt[] = [[90, 320], [160, 300], [240, 270], [330, 250], [420, 260], [520, 280], [610, 295]];
const DURATIONS = [
  { k: 30, label: "30 min" },
  { k: 60, label: "1 hour" },
  { k: -1, label: "Until I’m home" },
] as const;

function along(path: Pt[], t: number): Pt {
  const f = Math.min(Math.max(t, 0), 1) * (path.length - 1);
  const i = Math.min(Math.floor(f), path.length - 2);
  const r = f - i;
  const a = path[i]!, b = path[i + 1] ?? a;
  return [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Share = { until: number | null; started: number }; // until null = until home

export function SharedLocations() {
  const [now, setNow] = useState(0);
  // Others' sharing: Didi already sharing for 30 min; Ananya not yet; Maa sharing until she says stop.
  const [theirs, setTheirs] = useState<Record<string, Share | "asked" | null>>({});
  const [mine, setMine] = useState<Share | null>(null);
  const [mineWith, setMineWith] = useState<string[]>(["demo-didi", "demo-maa"]);
  const [dur, setDur] = useState<number>(30);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    const t0 = Date.now();
    setNow(t0);
    setTheirs({
      "demo-didi": { started: t0 - 6 * 60_000, until: t0 + 24 * 60_000 },
      "demo-ananya": null,
      "demo-maa": { started: t0 - 2 * 60_000, until: null },
    });
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Expire shares when their time runs out (demo clock runs 20× faster for movement only).
  useEffect(() => {
    if (!now) return;
    if (mine?.until && now >= mine.until) setMine(null);
    for (const [id, s] of Object.entries(theirs)) {
      if (s && s !== "asked" && s.until && now >= s.until) setTheirs((t) => ({ ...t, [id]: null }));
    }
  }, [now, mine, theirs]);

  const progress = (s: Share, len = 8 * 60_000) => ((now - s.started) % len) / len;
  const myPos = mine ? along(YOU_PATH, progress(mine)) : null;
  const sharingCount = useMemo(
    () => Object.values(theirs).filter((s) => s && s !== "asked").length,
    [theirs],
  );

  const ask = (id: string) => {
    setTheirs((t) => ({ ...t, [id]: "asked" }));
    // Demo: the friend chooses to accept after a moment.
    setTimeout(() => {
      setTheirs((t) =>
        t[id] === "asked" ? { ...t, [id]: { started: Date.now(), until: Date.now() + 30 * 60_000 } } : t,
      );
    }, 2500);
  };
  const start = () => {
    if (!mineWith.length) return;
    setMine({ started: Date.now(), until: dur > 0 ? Date.now() + dur * 60_000 : null });
  };

  return (
    <section className="together" aria-labelledby="together-title">
      <header className="together-head">
        <div>
          <p className="together-eyebrow">Together · sharing location</p>
          <h2 id="together-title">See each other on the way</h2>
          <p className="together-sub">
            You and your close people each choose to share, for a set time. It switches off on its
            own.
          </p>
        </div>
        <span className="together-demo">Demo · simulated places, no real GPS</span>
      </header>

      <div className="together-grid">
        <div className="together-map" role="img" aria-label={`Demo map: ${sharingCount} people sharing${mine ? ", and you" : ""}`}>
          <svg viewBox="0 0 720 380" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="tg-glow">
                <stop offset="0" stopColor="#e7c17b" stopOpacity=".5" />
                <stop offset="1" stopColor="#e7c17b" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="720" height="380" className="tg-ground" />
            <path className="tg-river" d="M-10 210 C120 180 200 240 330 205 S560 150 730 190" />
            <g className="tg-blocks">
              {Array.from({ length: 28 }, (_, i) => (
                <rect key={i} x={20 + (i % 7) * 102} y={20 + Math.floor(i / 7) * 92} width={70 + ((i * 13) % 20)} height={50 + ((i * 7) % 18)} rx="8" />
              ))}
            </g>
            <g className="tg-roads">
              <path d="M0 330 C180 290 400 240 720 300" />
              <path d="M100 0 C140 140 250 160 320 380" />
              <path d="M520 0 C470 160 480 260 430 380" />
            </g>
            {mine && <polyline className="tg-trail" points={YOU_PATH.map((p) => p.join(",")).join(" ")} />}
          </svg>
          {PEOPLE.map((p) => {
            const sh = theirs[p.id];
            if (!sh || sh === "asked") return null;
            const [x, y] = along(p.path, progress(sh, 10 * 60_000));
            return (
              <div key={p.id} className="tg-pin" data-focus={focus === p.id || undefined} style={{ left: `${(x / 720) * 100}%`, top: `${(y / 380) * 100}%` }}>
                <i className="tg-pulse" />
                <CircleAvatar id={p.id} size={40} />
                <b>{p.name}</b>
              </div>
            );
          })}
          {myPos && (
            <div className="tg-pin tg-you" style={{ left: `${(myPos[0] / 720) * 100}%`, top: `${(myPos[1] / 380) * 100}%` }}>
              <i className="tg-pulse" />
              <span className="tg-you-dot" />
              <b>You</b>
            </div>
          )}
        </div>

        <div className="together-side">
          <ul className="together-people">
            {PEOPLE.map((p) => {
              const s = theirs[p.id];
              const live = s && s !== "asked";
              return (
                <li key={p.id} data-live={live || undefined}>
                  <button type="button" className="together-person" onClick={() => setFocus(focus === p.id ? null : p.id)} disabled={!live}>
                    <CircleAvatar id={p.id} size={42} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.rel} ·{" "}
                        {live
                          ? `${p.place} · ${s.until ? `${mmss((s.until - now) / 1000)} left` : "until home"}`
                          : s === "asked"
                            ? "asked — waiting for them to choose"
                            : "not sharing right now"}
                      </small>
                    </span>
                  </button>
                  {!live && s !== "asked" && (
                    <button type="button" className="together-ask" onClick={() => ask(p.id)}>
                      <Send size={14} /> Ask
                    </button>
                  )}
                  {live && <span className="together-live-dot" aria-label="Sharing" />}
                </li>
              );
            })}
          </ul>

          <div className="together-mine">
            {mine ? (
              <>
                <p className="together-status">
                  <MapPin size={16} /> You’re sharing with {mineWith.map((id) => PEOPLE.find((p) => p.id === id)?.name).join(", ")}
                  <span>
                    <Clock size={14} /> {mine.until ? `${mmss((mine.until - now) / 1000)} left` : "until you’re home"}
                  </span>
                </p>
                <div className="together-actions">
                  {!mine.until && (
                    <button type="button" className="together-primary" onClick={() => setMine(null)}>
                      <Check size={16} /> I’m home
                    </button>
                  )}
                  <button type="button" className="together-stop" onClick={() => setMine(null)}>
                    <Square size={14} /> Stop sharing
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="together-label">Share my location with</p>
                <div className="together-chips">
                  {PEOPLE.map((p) => (
                    <label key={p.id} className="together-chip">
                      <input
                        type="checkbox"
                        checked={mineWith.includes(p.id)}
                        onChange={(e) =>
                          setMineWith((w) => (e.target.checked ? [...w, p.id] : w.filter((x) => x !== p.id)))
                        }
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <p className="together-label">For</p>
                <div className="together-chips" role="radiogroup" aria-label="How long">
                  {DURATIONS.map((d) => (
                    <button key={d.k} type="button" role="radio" aria-checked={dur === d.k} className="together-chip" onClick={() => setDur(d.k)}>
                      {d.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="together-primary" onClick={start} disabled={!mineWith.length}>
                  <MapPin size={16} /> Start sharing (demo)
                </button>
              </>
            )}
            <small className="together-fine">
              In the real version this only updates while Cocoon is open, and either of you can stop
              any time. It isn’t an emergency service.
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
