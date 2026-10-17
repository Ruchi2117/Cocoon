import { useEffect, useRef, useState } from "react";

type OrbitCard = {
  tag: string;
  title: string;
  why: string;
  tips: string[];
  myth: string;
  fact: string;
  source: { name: string; url: string };
};

/** Researched, source-linked safety education. Legal specifics stay in the Rights desk. */
export const ORBIT_CARDS: OrbitCard[] = [
  {
    tag: "Rides",
    title: "Check your ride",
    why: "Mismatched drivers or vehicles are one of the most common ride-safety complaints.",
    tips: [
      "Wait indoors until the app says the car has arrived",
      "Match plate, make, model and driver photo",
      "Ask “Who are you here to pick up?” — don’t say your name first",
      "Sit in the back so you can exit on either side",
    ],
    myth: "If the driver seems nice, a small mismatch is fine.",
    fact: "Any mismatch is a reason to cancel and report it in the app. A real booking always matches.",
    source: {
      name: "Uber India · rider safety tips",
      url: "https://www.uber.com/in/en/ride/safety/tips/",
    },
  },
  {
    tag: "Rides",
    title: "During the trip",
    why: "Route changes, unsafe drop-offs and slow help are flagged in NCW’s 2026 ride-safety guidelines.",
    tips: [
      "Turn on the app’s share-trip feature",
      "Keep the map open and watch for detours",
      "Know where the in-app SOS button is",
      "Ask to stop somewhere busy if something feels off",
    ],
    myth: "Speaking up about the route is rude.",
    fact: "Asking “Why this way?” is reasonable. Your comfort comes before politeness.",
    source: {
      name: "NCW guidelines on app-based transport (TOI, Oct 2026)",
      url: "https://timesofindia.indiatimes.com/india/national-commission-for-women-issues-safety-guidelines-to-step-up-monitoring-of-app-based-and-digital-transport-services/articleshow/134716773.cms",
    },
  },
  {
    tag: "Stalking",
    title: "Patterns, not one-offs",
    why: "Stalking is a pattern of behaviour that would make a reasonable person afraid or deeply distressed. Two or more incidents can be a pattern.",
    tips: [
      "Repeated calls, texts or social-media contact",
      "Showing up, waiting or following",
      "Unwanted gifts or contact with your friends and family",
      "Knowing where you are without being told",
    ],
    myth: "It’s flattering — they just really like you.",
    fact: "Films often make stalking look romantic. In real life it often gets worse over time, and most victims know the person.",
    source: {
      name: "SPARC · stalking definition & FAQ",
      url: "https://www.stalkingawareness.org/definition-faqs/",
    },
  },
  {
    tag: "Stalking",
    title: "Keep a stalking log",
    why: "Each act can look small alone. A log shows the pattern to friends, a college or the police.",
    tips: [
      "Date, time, place and what happened",
      "Screenshots with dates and usernames showing",
      "Names of anyone who saw it",
      "Store a copy where the person can’t reach it",
    ],
    myth: "If they haven’t threatened me, there’s nothing to record.",
    fact: "Things that aren’t crimes alone, like excessive texting, can still be part of a stalking pattern.",
    source: {
      name: "SPARC · stalking victim handbook",
      url: "https://www.stalkingawareness.org/wp-content/uploads/2024/03/SPARC-Stalking-Victim-Handbook.pdf",
    },
  },
  {
    tag: "Digital",
    title: "Is my phone watched?",
    why: "Stalkerware secretly shares messages, photos and location. It usually needs someone to have handled your phone.",
    tips: [
      "Battery draining fast or phone running hot",
      "Unexplained jumps in data use",
      "Phone restarting by itself",
      "Strongest sign: they know things they shouldn’t",
    ],
    myth: "Only expert hackers can do this.",
    fact: "Stalkerware is cheap and easy to install. Spotting a pattern in someone’s behaviour matters more than tech skills.",
    source: {
      name: "Coalition Against Stalkerware",
      url: "https://stopstalkerware.org/information-for-survivors/",
    },
  },
  {
    tag: "Digital",
    title: "Before you remove it",
    why: "Removing monitoring can alert the other person, and some people escalate when they lose control.",
    tips: [
      "Think about your safety first",
      "Use a different, safe device for private searches",
      "Talk to an advocate about a plan",
      "Turn on two-step sign-in and change passwords from that safe device",
    ],
    myth: "Delete the app straight away and you’re safe.",
    fact: "Make a safety plan first. Deleting it also removes evidence you might want later.",
    source: {
      name: "NNEDV Safety Net · stalkerware",
      url: "https://www.techsafety.org/spyware-and-stalkerware-phone-surveillance",
    },
  },
  {
    tag: "Bystander",
    title: "Distract & Delegate",
    why: "Four of the 5Ds are indirect, so you can help without facing the harasser.",
    tips: [
      "Distract: ask the person the time or directions",
      "Pretend you know them and start chatting",
      "Delegate: get a driver, guard, conductor or shop staff",
      "Ask another passer-by to help you",
    ],
    myth: "Helping means confronting the harasser.",
    fact: "Distraction just changes what’s happening. The aim is to support the person, not engage the harasser.",
    source: {
      name: "Right To Be · the 5Ds",
      url: "https://righttobe.org/guides/bystander-intervention-training/",
    },
  },
  {
    tag: "Bystander",
    title: "Document, Delay, Direct",
    why: "You can still help after the moment has passed.",
    tips: [
      "Document only if someone is already helping",
      "Keep a safe distance; note date, time and place",
      "Give the footage to the person — never post it yourself",
      "Delay: afterwards, ask “Are you okay? Can I help?”",
    ],
    myth: "If I missed the moment, it’s too late.",
    fact: "Checking in afterwards reduces harm. Direct (“That’s not okay”) only if you feel safe.",
    source: {
      name: "Right To Be · 5Ds key takeaways",
      url: "https://righttobe.org/guides/bystander-intervention-videos/",
    },
  },
  {
    tag: "Workplace · India",
    title: "Your Internal Committee",
    why: "Workplaces with 10 or more employees must have an Internal Committee for sexual-harassment complaints.",
    tips: [
      "The committee’s details should be displayed at work",
      "It must be led by a senior woman employee",
      "Covers all women, including interns and domestic workers",
      "Smaller workplaces: the district Local Committee",
    ],
    myth: "It only applies to big offices and permanent staff.",
    fact: "The law covers all women regardless of age or job type, in organised and unorganised work.",
    source: {
      name: "PIB · SH Act 2013 & SHe-Box",
      url: "https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=157323&lang=2&reg=3",
    },
  },
  {
    tag: "Workplace · India",
    title: "SHe-Box, online",
    why: "Since August 2024 the government’s SHe-Box portal lets women file workplace harassment complaints online.",
    tips: [
      "Use it if internal routes feel unsafe or stall",
      "Write down what was said and done, with dates",
      "Note any witnesses",
      "Keep copies of every email and reply",
    ],
    myth: "Complaining will just make it worse with no record.",
    fact: "Employers have legal duties, and penalties for not complying. A written complaint creates a record.",
    source: { name: "ISTM · PoSH guidebook (2026)", url: "https://www.istm.gov.in/home/posh_act" },
  },
  {
    tag: "Gut feeling",
    title: "Your unease is data",
    why: "You don’t need proof to protect yourself. Leaving is always allowed.",
    tips: [
      "You don’t owe anyone politeness",
      "Leaving early needs no explanation",
      "Move toward people, light and open shops",
      "Use a pretend call (Presence) as an exit line",
    ],
    myth: "If I leave and nothing happens, I overreacted.",
    fact: "Nothing happening is a good outcome, not proof you were wrong.",
    source: {
      name: "Right To Be · bystander guides",
      url: "https://righttobe.org/guides/bystander-intervention-training/",
    },
  },
  {
    tag: "After",
    title: "If something happened",
    why: "Harm is never your fault. What happens next is up to you.",
    tips: [
      "Get somewhere safe first",
      "India: 112 for emergencies, NCW 14490 for women’s helpline",
      "Keep messages and notes even if you’re unsure",
      "Talking, reporting or just resting are all valid",
    ],
    myth: "If you don’t report straight away, it didn’t count.",
    fact: "People respond to trauma differently, and many take time. Your experience still counts.",
    source: {
      name: "SPARC · identifying stalking behaviours",
      url: "https://www.stalkingawareness.org/stalking-behaviors/",
    },
  },
];

/** A ring of cards that turns as you scroll. Falls back to a plain grid with reduced motion. */
export function SafetyOrbit() {
  const section = useRef<HTMLElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState<number | null>(null);
  const n = ORBIT_CARDS.length;

  useEffect(() => {
    const el = section.current;
    const r = ring.current;
    if (!el || !r) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const box = el.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -box.top / total)) : 0;
      const angle = p * 360 * ((n - 1) / n);
      r.style.setProperty("--spin", `${-angle}deg`);
      setActive(Math.round((angle / 360) * n) % n);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [n]);

  return (
    <section ref={section} className="safety-orbit" aria-labelledby="orbit-title">
      <div className="safety-orbit-sticky">
        <header>
          <span className="eyebrow">Twelve researched cards · sources on the back</span>
          <h2 id="orbit-title">
            THE SAFETY <em>CAROUSEL.</em>
          </h2>
          <p>Keep scrolling — the ring turns. Flip any card for a myth, a fact and its source.</p>
        </header>
        <div className="orbit-stage">
          <div ref={ring} className="orbit-ring" style={{ ["--n" as string]: n }}>
            {ORBIT_CARDS.map((c, i) => (
              <div
                key={c.title}
                className="orbit-card"
                data-active={i === active}
                data-far={Math.min(Math.abs(i - active), n - Math.abs(i - active)) > 2}
                data-flipped={flipped === i}
                style={{ ["--i" as string]: i }}
              >
                <div className="orbit-face orbit-front">
                  <small>
                    {String(i + 1).padStart(2, "0")} · {c.tag}
                  </small>
                  <strong>{c.title}</strong>
                  <p className="orbit-why">{c.why}</p>
                  <ul>
                    {c.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <button type="button" className="orbit-flip" onClick={() => setFlipped(i)}>
                    Myth vs fact ↻
                  </button>
                </div>
                <div className="orbit-face orbit-back">
                  <small>Myth</small>
                  <p className="orbit-myth">“{c.myth}”</p>
                  <small>Fact</small>
                  <p>{c.fact}</p>
                  <a href={c.source.url} target="_blank" rel="noopener noreferrer">
                    Source · {c.source.name} ↗
                  </a>
                  <button type="button" className="orbit-flip" onClick={() => setFlipped(null)}>
                    Back ↺
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="orbit-count" aria-live="polite">
          {String(active + 1).padStart(2, "0")} / {n} · {ORBIT_CARDS[active]?.title}
        </p>
      </div>
    </section>
  );
}
