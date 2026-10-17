import { useEffect, useRef, useState } from "react";

type Signal = {
  kicker: string;
  title: string;
  body: string;
  points: string[];
  example?: string;
  source?: { name: string; url: string };
};

export const SIGNALS: Signal[] = [
  {
    kicker: "Write",
    title: "What · where · when",
    body: "A useful report is short, specific and calm, like a note to a friend walking the same road.",
    points: [
      "What you saw, in plain words",
      "A public landmark, not a home",
      "Time of day and date",
    ],
    example: "“Lights out on the lane behind Gate 3, about 9 pm Tuesday. Very dark for ~200 m.”",
  },
  {
    kicker: "Protect",
    title: "Leave people out",
    body: "Reports describe places and situations. Naming or picturing people can harm the innocent and put you at risk.",
    points: [
      "No names, faces or number plates",
      "No guesses about who did it",
      "No one else’s private details",
    ],
    example:
      "Instead of “the guy in the blue shirt”: “a man repeatedly followed women to the bus stop”.",
  },
  {
    kicker: "Notice",
    title: "Place signals",
    body: "Your surroundings shape how safe you feel. These are worth flagging.",
    points: [
      "Broken or missing street lights",
      "Isolated stretches, blocked footpaths",
      "No shops or people after dark",
    ],
  },
  {
    kicker: "Notice",
    title: "Behaviour signals",
    body: "Patterns matter more than one moment. Stalking researchers count two or more incidents as a possible pattern.",
    points: [
      "Repeated catcalling or following at one spot",
      "Groups blocking a path",
      "Someone waiting at the same time daily",
    ],
    source: {
      name: "SPARC · stalking FAQ",
      url: "https://www.stalkingawareness.org/definition-faqs/",
    },
  },
  {
    kicker: "Rides",
    title: "Ride signals",
    body: "NCW’s 2026 ride guidelines list these as common problems. Report them in the ride app too.",
    points: [
      "Driver or vehicle didn’t match the app",
      "Unexplained route change",
      "Unsafe or wrong drop-off point",
    ],
    source: {
      name: "NCW guidelines (TOI, Oct 2026)",
      url: "https://timesofindia.indiatimes.com/india/national-commission-for-women-issues-safety-guidelines-to-step-up-monitoring-of-app-based-and-digital-transport-services/articleshow/134716773.cms",
    },
  },
  {
    kicker: "Also notice",
    title: "Good signals too",
    body: "Safe havens help people plan just as much as warnings do.",
    points: [
      "Late-open shops, pharmacies, dhabas",
      "Well-lit, busy bus stops",
      "Guards or staff who helped someone",
    ],
  },
  {
    kicker: "Witnessed it?",
    title: "Document with care",
    body: "If you saw someone else being harassed, make sure someone is helping first, then record from a safe distance.",
    points: [
      "Note date, time and exact place",
      "Give footage to the person it happened to",
      "Never post someone’s ordeal online",
    ],
    source: {
      name: "Right To Be · Document",
      url: "https://righttobe.org/guides/bystander-intervention-videos/",
    },
  },
  {
    kicker: "Labels",
    title: "Read the badge",
    body: "Every report says where it came from, so you can decide how much weight to give it.",
    points: [
      "Firsthand review — someone walked it",
      "Incident report — unverified",
      "External source — attributed",
    ],
  },
  {
    kicker: "Moderation",
    title: "What happens next",
    body: "Anyone can flag a report, and moderators can hide or label it. Approval means it follows the rules — not that it’s been fact-checked.",
    points: [
      "Flag anything that names or doxxes",
      "Hidden posts stop shaping routes",
      "Demo items are marked demo",
    ],
  },
  {
    kicker: "Reading",
    title: "One report ≠ danger",
    body: "Use reports as context for planning, never as proof — and never as a reason to blame a whole neighbourhood or group.",
    points: [
      "Look for repeats from different people",
      "Check how recent it is",
      "Your own judgement comes first",
    ],
  },
  {
    kicker: "Not a police report",
    title: "Where else to report",
    body: "A Cocoon report warns other people. It does not reach the police or the ride company.",
    points: [
      "India emergency: 112",
      "NCW women’s helpline: 14490",
      "Ride issues: the app’s own safety report",
    ],
  },
  {
    kicker: "Care",
    title: "After you share",
    body: "Writing about something unsettling can bring it all back. Look after yourself.",
    points: [
      "Take a breather or a walk",
      "Tell someone you trust",
      "Use the Safety Kit for support contacts",
    ],
  },
];

/** A fanned deck that sweeps around a pivot as you scroll — a different motion from Learn. */
export function SignalWheel() {
  const section = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const [still, setStill] = useState(false);
  const n = SIGNALS.length;

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const box = el.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      setP(total > 0 ? Math.min(1, Math.max(0, -box.top / total)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const pos = p * (n - 1);
  const active = Math.round(pos);

  return (
    <section
      ref={section}
      className="signal-wheel"
      data-still={still}
      aria-labelledby="signal-title"
    >
      <div className="signal-sticky">
        <header>
          <span className="eyebrow">Field manual · {n} cards</span>
          <h2 id="signal-title">
            HOW TO REPORT <em>WELL.</em>
          </h2>
          <p>Scroll to deal the deck.</p>
          <ol className="signal-dots" aria-hidden="true">
            {SIGNALS.map((s, i) => (
              <li key={s.title} data-on={i === active} />
            ))}
          </ol>
        </header>
        <div className="signal-deck">
          {SIGNALS.map((s, i) => {
            const d = i - pos;
            return (
              <article
                key={s.title}
                className="signal-card"
                data-active={i === active}
                style={
                  still
                    ? undefined
                    : {
                        transform: `rotate(${d * 14}deg) translateY(${Math.abs(d) * 10}px)`,
                        zIndex: 100 - Math.round(Math.abs(d) * 10),
                        opacity: Math.abs(d) > 3.2 ? 0 : 1,
                      }
                }
                aria-hidden={!still && i !== active}
              >
                <span className="signal-num">{String(i + 1).padStart(2, "0")}</span>
                <small>{s.kicker}</small>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <ul>
                  {s.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
                {s.example && <p className="signal-example">{s.example}</p>}
                {s.source && (
                  <a
                    href={s.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={still || i === active ? 0 : -1}
                  >
                    Source · {s.source.name} ↗
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
