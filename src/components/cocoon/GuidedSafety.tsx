import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Compass,
  HandHeart,
  HeartHandshake,
  Footprints,
  ArrowRight,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { lessons, learningSources } from "@/lib/cocoon/learning";
const trails = [
  { name: "I’m heading out", icon: Footprints, ids: ["carry", "signals", "support"] },
  { name: "A boundary feels wrong", icon: HandHeart, ids: ["boundaries", "digital", "support"] },
  {
    name: "I’m supporting someone",
    icon: HeartHandshake,
    ids: ["supporting", "bystander", "support"],
  },
  { name: "For a child / safe adult", icon: Compass, ids: ["children", "supporting", "digital"] },
];
export function GuidedSafety() {
  const [trail, setTrail] = useState(0),
    [step, setStep] = useState(0),
    [reveal, setReveal] = useState(false);
  const reduced = useReducedMotion(),
    path = trails[trail]!,
    lesson = lessons.find((l) => l.id === path.ids[step])!,
    source = lesson.source ? learningSources[lesson.source] : null;
  const move = (next: number) => {
    setStep(next);
    setReveal(false);
  };
  return (
    <section
      id="guides"
      className="guided-safety"
      aria-labelledby="guided-title"
      style={{ scrollMarginTop: 120 }}
    >
      <div className="guided-heading">
        <span className="eyebrow">Your pocket guide / start with a moment</span>
        <h2 id="guided-title">
          WHAT DO YOU
          <br />
          <em>NEED RIGHT NOW?</em>
        </h2>
        <p>
          Choose a situation. Take one idea at a time, at your own pace. No scores, no pressure.
        </p>
      </div>
      <div className="guided-trails" role="group" aria-label="Choose your guide">
        {trails.map((t, i) => (
          <button
            key={t.name}
            aria-pressed={trail === i}
            onClick={() => {
              setTrail(i);
              move(0);
            }}
          >
            <t.icon size={22} />
            {t.name}
          </button>
        ))}
      </div>
      <div className="guided-stage">
        <div className="guided-route" aria-hidden="true">
          <svg viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="120" fill="#e3bd85" opacity=".4" />
            <path
              d="M45 260Q35 120 150 180T255 45"
              stroke="#8b645d"
              strokeWidth="3"
              strokeDasharray="4 10"
              fill="none"
            />
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <circle
                  cx={[45, 150, 255][i]}
                  cy={[260, 180, 45][i]}
                  r={i === step ? 23 : 12}
                  fill={i <= step ? "#88535e" : "#d3b58f"}
                />
                {i === step && (
                  <text
                    x={[45, 150, 255][i]}
                    y={[267, 187, 52][i]}
                    textAnchor="middle"
                    fill="#fff0d4"
                    fontSize="20"
                  >
                    {i + 1}
                  </text>
                )}
              </g>
            ))}
          </svg>
          <span>{path.name}</span>
          <small>One small step is enough.</small>
        </div>
        <div className="guided-card-holder">
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={`${trail}-${step}`}
              className="guided-card"
              initial={reduced ? false : { opacity: 0, x: 20, rotate: 1 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: reduced ? 0 : 0.22 }}
            >
              <span className="eyebrow">
                Step {step + 1} / 3 · {reveal ? "Your next options" : "A thought to take with you"}
              </span>
              <h3>{lesson.title}</h3>
              <p className="guided-main">
                {reveal ? lesson.points[1]?.[1] : lesson.points[0]?.[1]}
              </p>
              <button
                className="guided-turn"
                aria-expanded={reveal}
                onClick={() => setReveal(!reveal)}
              >
                <BookOpen size={17} />
                {reveal ? "Back to the first idea" : "Show another helpful option"}
              </button>
              {source && (
                <a
                  className="guided-source"
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {source.name} ↗
                </a>
              )}
            </motion.article>
          </AnimatePresence>
          <div className="guided-navigation">
            <button disabled={step === 0} onClick={() => move(step - 1)}>
              <ArrowLeft size={17} />
              Back
            </button>
            <span aria-live="polite">{step + 1} of 3</span>
            <button disabled={step === 2} onClick={() => move(step + 1)}>
              {step === 2 ? "Guide complete" : "Next step"}
              <ArrowRight size={17} />
            </button>
          </div>
          {step === 2 && (
            <Link className="guided-complete-link" to="/kit">
              Open my contacts & kit ↗
            </Link>
          )}
        </div>
      </div>
      <p className="guided-care">
        You deserve support without proving what happened. In immediate danger, use the Get help
        button. This is general education, not professional crisis care.
      </p>
    </section>
  );
}
