import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";

export function ReportType() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const visible = useInView(ref, { amount: 0.2 });
  const [still, setStill] = useState(false);
  const quiet = reduced || still || !visible;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], [-45, 45]);
  return (
    <section ref={ref} className="report-type-stage" aria-label="Notice. Listen. Understand.">
      <div className="report-type-meta">
        <span>COCOON / THE CONTEXT EDITION</span>
        <span>OBSERVATIONS ≠ FINDINGS</span>
      </div>
      <div className="report-type-composition" aria-hidden="true">
        <motion.div className="report-type-orbit" style={quiet ? {} : { x: drift }}>
          {["NOTICE.", "LISTEN.", "UNDERSTAND."].map((word, i) => (
            <motion.span
              key={word}
              className={`report-type-word type-word-${i}`}
              animate={
                quiet
                  ? { y: 0, rotate: 0 }
                  : { y: [0, i % 2 ? -12 : 12, 0], rotate: [i - 1, 1 - i, i - 1] }
              }
              transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
            >
              {word}
            </motion.span>
          ))}
        </motion.div>
        <motion.div
          className="report-type-seal"
          animate={quiet ? { rotate: 0 } : { rotate: [-12, 12, -12] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <span>✳</span>EVERY DETAIL
          <br />
          HAS CONTEXT.
        </motion.div>
      </div>
      <div className="report-type-bottom">
        <p>
          Make room for the details.
          <br />
          Community observations, clearly labelled.
        </p>
        <button
          aria-pressed={still || !!reduced}
          disabled={!!reduced}
          onClick={() => setStill(!still)}
        >
          {reduced ? "Reduced motion" : still ? "Move the words ↗" : "Rest the words ↙"}
        </button>
      </div>
    </section>
  );
}
