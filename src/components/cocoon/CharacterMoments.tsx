import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { GirlFigure, type GirlPose } from "./GirlFigure";

const moments = [
  {
    pose: "phone" as GirlPose,
    label: "Heading out",
    word: "GO.",
    title: "A little further.",
    text: "The city is yours to explore. Find your walk, check the route and keep your own pace.",
    color: "#e7c17b",
    cta: "Find a walking route",
    to: "/explore" as const,
  },
  {
    pose: "call" as GirlPose,
    label: "Checking in",
    word: "TALK.",
    title: "A little company.",
    text: "A familiar voice can make the journey feel lighter. Open your companion when you want some company.",
    color: "#df9278",
    cta: "Open your companion",
    to: "/presence" as const,
  },
  {
    pose: "calm" as GirlPose,
    label: "Taking a breath",
    word: "EASY.",
    title: "A little space.",
    text: "Drop your shoulders. Take a comfortable breath. You can pause, change your plans or ask for support.",
    color: "#c8c8ac",
    cta: "Open the calming guide",
    to: "/kit" as const,
  },
];
export function CharacterMoments() {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "100px" });
  const reduce = useReducedMotion();
  const active = inView && !paused && !reduce;
  const moment = moments[selected]!;
  return (
    <section ref={ref} className="character-moments" aria-labelledby="moments-title">
      <div className="character-heading">
        <span className="eyebrow">SAME YOU. DIFFERENT MOMENTS.</span>
        <h2 id="moments-title">
          YOUR DAY.
          <br />
          <em>YOUR PACE.</em>
        </h2>
      </div>
      <div className="character-spread">
        <div
          className="character-stage"
          style={{ backgroundColor: moment.color }}
          aria-hidden="true"
        >
          <span className="character-stage-word">{moment.word}</span>
          <svg viewBox="200 110 620 650" preserveAspectRatio="xMidYMax meet">
            <g stroke="#292723" opacity=".14" fill="none">
              <path d="M200 280H820M200 410H820M200 540H820M330 110V760M460 110V760M590 110V760M720 110V760" />
              <circle cx="480" cy="390" r="230" />
            </g>
            <motion.circle
              cx="480"
              cy="390"
              r="205"
              fill="#f7ebd6"
              opacity=".25"
              animate={active && selected === 2 ? { scale: [0.85, 1.05, 0.85] } : { scale: 1 }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "480px 390px" }}
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.g
                key={moment.pose}
                initial={reduce ? false : { opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: reduce ? 0 : 0.3 }}
              >
                <GirlFigure active={active} pose={moment.pose} />
              </motion.g>
            </AnimatePresence>
            {selected === 1 &&
              [0, 1, 2].map((i) => (
                <motion.path
                  key={i}
                  d={`M${570 + i * 24} ${295 - i * 12}q${30 + i * 10} 55 0 ${100 + i * 24}`}
                  fill="none"
                  stroke="#a41c32"
                  strokeWidth="3"
                  animate={active ? { opacity: [0.15, 0.9, 0.15] } : { opacity: 0.5 }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}
                />
              ))}
          </svg>
          <span className="character-stage-caption">COCOON / EVERYDAY COURAGE</span>
        </div>
        <div className="character-panel">
          <div role="tablist" aria-label="Character moments" className="character-tabs">
            {moments.map((item, i) => (
              <button
                key={item.pose}
                role="tab"
                id={`moment-${item.pose}`}
                aria-selected={i === selected}
                aria-controls="moment-content"
                tabIndex={i === selected ? 0 : -1}
                onClick={() => setSelected(i)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? moments.length - 1
                        : (selected + (event.key === "ArrowRight" ? 1 : -1) + moments.length) %
                          moments.length;
                  setSelected(next);
                  event.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>("button")
                    [next]?.focus();
                }}
              >
                <span>0{i + 1}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div
            id="moment-content"
            role="tabpanel"
            aria-labelledby={`moment-${moment.pose}`}
            className="character-copy"
          >
            <span className="eyebrow">0{selected + 1} / EVERYDAY COURAGE</span>
            <h3>{moment.title}</h3>
            <p>{moment.text}</p>
            <Link to={moment.to}>
              {moment.cta}
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <button
            className="character-pause"
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? "Play character animation" : "Pause character animation"}
          </button>
        </div>
      </div>
    </section>
  );
}
