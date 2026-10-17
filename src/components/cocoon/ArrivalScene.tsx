import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

/** A one-time arrival illustration; no location or safety inference. */
export function ArrivalScene({ destination }: { destination: string }) {
  const reduce = useReducedMotion();
  return (
    <section className="arrival-scene" aria-labelledby="arrival-title">
      <div className="arrival-art" aria-hidden="true">
        <svg viewBox="0 0 400 300">
          <path
            d="M-20 240C90 315 90 75 190 145S300 260 430 80"
            fill="none"
            stroke="#b7243c"
            strokeWidth="2"
            strokeDasharray="4 8"
          />
          <motion.g
            initial={reduce ? false : { opacity: 0, rotate: -20, scale: 1.3 }}
            animate={{ opacity: 1, rotate: -8, scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            style={{ transformOrigin: "200px 150px" }}
          >
            <circle cx="200" cy="150" r="98" fill="#e7c17b" />
            <circle cx="200" cy="150" r="87" fill="none" stroke="#292723" strokeWidth="1.5" />
            <circle cx="200" cy="150" r="74" fill="none" stroke="#292723" strokeDasharray="2 7" />
            <path
              d="M162 148l27 28 51-56"
              fill="none"
              stroke="#292723"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x="200"
              y="207"
              textAnchor="middle"
              fontSize="10"
              letterSpacing="3"
              fill="#292723"
            >
              JOURNEY COMPLETE
            </text>
          </motion.g>
          <motion.path
            d="M70 62v24m-12-12h24M320 224v18m-9-9h18"
            stroke="#b7243c"
            strokeWidth="2"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          />
        </svg>
      </div>
      <div className="arrival-copy">
        <p className="eyebrow">One journey, a little more confidence</p>
        <h2 id="arrival-title">
          YOU'VE
          <br />
          <em>ARRIVED.</em>
        </h2>
        <p>
          Your trip to <strong>{destination}</strong> is complete. Trip sharing has stopped.
        </p>
        <Link to="/explore" search={{ to: "d-metro" }}>
          PLAN ANOTHER JOURNEY <ArrowUpRight size={18} />
        </Link>
      </div>
    </section>
  );
}
