import { useId, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import type { CallPhase } from "./art";
/** A small lantern moth: expressive state, rather than a claim of a human on the call. */
export function PresenceBuddy({
  phase,
  onInterrupt,
}: {
  phase: CallPhase;
  onInterrupt?: () => void;
}) {
  const id = useId().replaceAll(":", "");
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const reduced = useReducedMotion();
  const [still, setStill] = useState(false);
  const active = visible && !reduced && !still;
  const talking = phase === "speaking",
    listening = phase === "listening",
    thinking = phase === "thinking" || phase === "connecting";
  return (
    <div className="presence-buddy" ref={ref} data-phase={phase}>
      <button
        className="buddy-figure-button"
        disabled={!talking || !onInterrupt}
        onClick={onInterrupt}
        aria-label={talking ? "Interrupt companion speech" : "Animated companion · decorative"}
      >
        <svg viewBox="0 0 440 310" aria-hidden="true">
          <defs>
            <radialGradient id={`${id}halo`}>
              <stop stopColor="#c0dfbc" stopOpacity=".3" />
              <stop offset="1" stopColor="#c0dfbc" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}body`} x2="0" y2="1">
              <stop stopColor="#e6e5ce" />
              <stop offset="1" stopColor="#acc7b4" />
            </linearGradient>
          </defs>
          <circle cx="220" cy="150" r="145" fill={`url(#${id}halo)`} />
          {[95, 125, 150].map((r, i) => (
            <motion.ellipse
              key={r}
              cx="220"
              cy="155"
              rx={r}
              ry={r * 0.62}
              fill="none"
              stroke="#bed8ca"
              strokeWidth="1"
              animate={
                active
                  ? {
                      opacity: talking ? [0.1, 0.5, 0.1] : [0.08, 0.2, 0.08],
                      scale: talking ? [1, 1.08, 1] : [1, 1.02, 1],
                    }
                  : { opacity: 0.15 }
              }
              transition={{ duration: talking ? 1.4 : 5, delay: i * 0.3, repeat: Infinity }}
            />
          ))}
          <motion.ellipse
            cx="220"
            cy="270"
            rx="57"
            ry="9"
            fill="#102936"
            animate={active ? { scaleX: [1, 0.8, 1], opacity: [0.5, 0.3, 0.5] } : {}}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.g
            animate={
              active
                ? { y: [0, -9, 0], rotate: listening ? [-3, 3, -3] : [0, 1, 0] }
                : { y: 0, rotate: 0 }
            }
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "220px 160px" }}
          >
            <motion.path
              d="M180 160Q55 65 90 185q20 64 101 31Z"
              fill="#b6aacd"
              stroke="#ddd0e2"
              strokeWidth="2"
              animate={active ? { rotate: [0, -7, 0] } : { rotate: 0 }}
              transition={{ duration: listening ? 1 : 3, repeat: Infinity }}
              style={{ transformOrigin: "190px 180px" }}
            />
            <motion.path
              d="M260 160Q385 65 350 185q-20 64-101 31Z"
              fill="#b6aacd"
              stroke="#ddd0e2"
              strokeWidth="2"
              animate={active ? { rotate: [0, 7, 0] } : { rotate: 0 }}
              transition={{ duration: listening ? 1 : 3, repeat: Infinity }}
              style={{ transformOrigin: "250px 180px" }}
            />
            <path
              d="M114 153q25 33 61 38m150-38q-25 33-61 38"
              stroke="#e1d6e7"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M180 135q-27-50-4-65m84 65q27-50 4-65"
              stroke="#bfd2bb"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="176" cy="70" r="7" fill="#f1d1a0" />
            <circle cx="264" cy="70" r="7" fill="#f1d1a0" />
            <path d="M159 153q0-54 61-54t61 54v40q0 58-61 58t-61-58Z" fill={`url(#${id}body)`} />
            <rect x="175" y="138" width="90" height="58" rx="26" fill="#284b56" />
            <motion.g
              animate={
                active ? { scaleY: thinking ? [1, 0.12, 1] : [1, 1, 0.1, 1, 1] } : { scaleY: 1 }
              }
              transition={{
                duration: thinking ? 2 : 6,
                repeat: Infinity,
                ...(thinking ? {} : { times: [0, 0.43, 0.45, 0.47, 1] }),
              }}
              style={{ transformOrigin: "220px 160px" }}
            >
              <path
                d="M194 158q5-6 10 0m32 0q5-6 10 0"
                stroke="#e2e7d1"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              />
            </motion.g>
            <motion.path
              d="M211 176q9 8 18 0"
              fill={talking ? "#d7e5ce" : "none"}
              stroke="#d7e5ce"
              strokeWidth="2"
              animate={
                active && talking
                  ? { d: ["M211 176q9 8 18 0", "M214 173q6 18 12 0Z", "M211 176q9 8 18 0"] }
                  : {}
              }
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <path d="M198 217q22 13 44 0" stroke="#7c9e8c" strokeWidth="2" fill="none" />
            <circle cx="220" cy="225" r="8" fill="#f2cc94" />
          </motion.g>
          {thinking &&
            [0, 1, 2].map((i) => (
              <motion.circle
                key={i}
                cx={201 + i * 19}
                cy="285"
                r="3"
                fill="#d5dfc5"
                animate={active ? { opacity: [0.2, 1, 0.2], y: [0, -4, 0] } : { opacity: 0.5 }}
                transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
        </svg>
      </button>
      <button
        className="buddy-motion-toggle"
        onClick={() => setStill(!still)}
        aria-pressed={still || !!reduced}
        disabled={!!reduced}
      >
        {reduced ? "Reduced motion" : still ? "Wake the wings" : "Rest the wings"}
      </button>
    </div>
  );
}
