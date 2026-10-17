import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
import { ArrowUpRight, MapPin, Pause, Phone, Play, ShieldCheck } from "lucide-react";

const chapters = [
  {
    no: "01",
    title: "Find your way.",
    verb: "EXPLORE",
    icon: MapPin,
    text: "A route is more than a line. Compare walks, read the reports nearby and see where each piece of information came from.",
    cta: "Explore walking routes",
    to: "/explore" as const,
  },
  {
    no: "02",
    title: "Take some company.",
    verb: "CONNECT",
    icon: Phone,
    text: "Talk about your day or take a quiet moment. Your companion knows the trip you've started, and keeps practical help within reach.",
    cta: "Meet your companion",
    to: "/presence" as const,
  },
  {
    no: "03",
    title: "Keep your circle close.",
    verb: "ARRIVE",
    icon: ShieldCheck,
    text: "Choose who sees your journey, check in along the way and stop sharing whenever you want. Your conversations stay separate.",
    cta: "Open your journey",
    to: "/trip" as const,
  },
];
export function JourneyStory() {
  const [chapter, setChapter] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const active = !reduce && !paused;
  const c = chapters[chapter]!;
  return (
    <section className="journey-story" aria-labelledby="story-title">
      <div className="story-heading">
        <span className="eyebrow">A little more freedom</span>
        <h2 id="story-title">
          THE WORLD IS BIG.
          <br />
          <em>YOUR CIRCLE IS CLOSE.</em>
        </h2>
      </div>
      <div className="story-grid">
        <div className="story-visual" aria-hidden="true">
          <span className="story-scene-word">{c.verb}</span>
          <svg viewBox="0 0 500 380">
            <defs>
              <pattern id="story-grid" width="45" height="45" patternUnits="userSpaceOnUse">
                <path d="M45 0H0V45" fill="none" stroke="#a5887950" />
              </pattern>
            </defs>
            <rect width="500" height="380" fill="url(#story-grid)" />
            <circle cx="250" cy="190" r="132" fill="none" stroke="#b99e8a" strokeWidth="1" />
            <circle
              cx="250"
              cy="190"
              r="107"
              fill="none"
              stroke="#b99e8a"
              strokeWidth="1"
              strokeDasharray="2 8"
            />
            <motion.path
              d="M80 265C170 340 150 100 250 190S365 270 420 100"
              fill="none"
              stroke="#b7243c"
              strokeWidth="3"
              animate={active ? { pathLength: chapter === 0 ? [0, 1, 1] : 1 } : { pathLength: 1 }}
              transition={{ duration: 4, repeat: chapter === 0 ? Infinity : 0, repeatDelay: 2 }}
            />
            <g fill="#efe6d5" stroke="#292723" strokeWidth="2">
              <circle cx="80" cy="265" r="10" />
              <circle cx="420" cy="100" r="10" />
            </g>
            <AnimatePresence mode="wait">
              <motion.g
                key={chapter}
                initial={reduce ? {} : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ transformOrigin: "250px 190px" }}
              >
                {chapter === 0 ? (
                  <>
                    <path
                      d="M250 127c-35 0-62 26-62 61 0 45 62 95 62 95s62-50 62-95c0-35-27-61-62-61"
                      fill="#b7243c"
                    />
                    <circle cx="250" cy="186" r="21" fill="#efe6d5" />
                    <path d="M100 90h55m-27-27v55M380 290h40m-20-20v40" stroke="#b7243c" />
                  </>
                ) : chapter === 1 ? (
                  <>
                    <circle cx="250" cy="190" r="70" fill="#292723" />
                    {Array.from({ length: 11 }, (_, i) => (
                      <motion.rect
                        key={i}
                        x={207 + i * 8}
                        y="176"
                        width="3"
                        height="28"
                        rx="2"
                        fill="#efe6d5"
                        style={{ transformOrigin: `${208 + i * 8}px 190px` }}
                        animate={active ? { scaleY: [0.3, 1 + (i % 3) * 0.3, 0.3] } : { scaleY: 1 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.1 + (i % 4) * 0.2,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <circle cx="250" cy="190" r="56" fill="#b7243c" />
                    <path
                      d="M227 190l16 17 32-36"
                      fill="none"
                      stroke="#efe6d5"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    {[
                      [160, 112],
                      [346, 135],
                      [322, 277],
                    ].map(([x, y], i) => (
                      <g key={i}>
                        <circle cx={x} cy={y} r="26" fill="#292723" />
                        <circle cx={x} cy={y! - 5} r="7" fill="#efe6d5" />
                        <path d={`M${x! - 12} ${y! + 13}q12-19 24 0`} fill="#efe6d5" />
                      </g>
                    ))}
                  </>
                )}
              </motion.g>
            </AnimatePresence>
          </svg>
          <span className="story-visual-caption">ILLUSTRATED PRODUCT STORY / {c.no}</span>
        </div>
        <div className="story-chapters">
          <div role="tablist" aria-label="How Cocoon works" className="story-tabs">
            {chapters.map((ch, i) => (
              <button
                key={ch.no}
                role="tab"
                id={`chapter-${i}`}
                aria-selected={i === chapter}
                aria-controls="chapter-content"
                onClick={() => setChapter(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const next = (chapter + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                    setChapter(next);
                    document.getElementById(`chapter-${next}`)?.focus();
                  }
                }}
                tabIndex={chapter === i ? 0 : -1}
              >
                {ch.no} / {ch.verb}
              </button>
            ))}
          </div>
          <div
            id="chapter-content"
            role="tabpanel"
            aria-labelledby={`chapter-${chapter}`}
            className="story-copy"
          >
            <c.icon size={25} />
            <h3>{c.title}</h3>
            <p>{c.text}</p>
            <Link to={c.to} {...(c.to === "/explore" ? { search: { to: "d-metro" } } : {})}>
              {c.cta}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <button
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
            aria-label={paused ? "Play illustration" : "Pause illustration"}
            className="story-pause"
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </div>
      </div>
    </section>
  );
}
