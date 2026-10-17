import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Lightbulb,
  MapPin,
  MessageCircle,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import type { SafetyReport } from "@/lib/cocoon/types";
import { CATEGORY_LABEL, ReportCard } from "./ui";
export function ReportReel({ reports }: { reports: SafetyReport[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [replay, setReplay] = useState(0);
  const current = Math.min(index, Math.max(0, reports.length - 1));
  const report = reports[current];
  const move = (delta: number) => {
    setDirection(delta);
    setIndex(Math.min(Math.max(current + delta, 0), reports.length - 1));
  };
  return (
    <section className="report-reel" aria-label="Community report spotlight">
      <div className="report-reel-intro">
        <span className="eyebrow">THE COMMUNITY REEL / EVERY DETAIL HAS CONTEXT</span>
        <h2>
          SMALL SIGNALS.
          <br />
          <em>A WIDER PICTURE.</em>
        </h2>
        <p>One report at a time. These are community observations, not a ranking of danger.</p>
      </div>
      <div className="report-orbit" aria-hidden="true" key={replay}>
        <svg viewBox="0 0 600 220">
          <ellipse
            cx="300"
            cy="110"
            rx="240"
            ry="85"
            fill="none"
            stroke="currentColor"
            strokeDasharray="3 10"
          />
        </svg>
        {[Lightbulb, MapPin, MessageCircle, Compass].map((Icon, i) => (
          <motion.div
            className={`orbit-token token-${i}`}
            key={i}
            initial={false}
            animate={
              reduced
                ? {}
                : {
                    x: [0, 65, 0, -65, 0],
                    y: [0, 35, 70, 35, 0],
                    rotate: [-8, 12, 0, -12, -8],
                  }
            }
            transition={{ duration: 2.8, delay: i * 0.12, ease: "easeInOut" }}
          >
            <Icon size={26} />
            <span>{["Notice", "Locate", "Listen", "Understand"][i]}</span>
          </motion.div>
        ))}
        <div className="report-reel-hub">
          <Sparkles size={28} />
          <span>
            PUT IT
            <br />
            IN CONTEXT.
          </span>
        </div>
      </div>
      <button
        className="report-rearrange"
        aria-label="Gather the signals again"
        onClick={() => setReplay((n) => n + 1)}
        disabled={!!reduced}
      >
        <RotateCcw size={15} />
      </button>
      {!report ? (
        <p className="reel-empty">No visible reports in this category.</p>
      ) : (
        <>
          <div
            className="report-card-track"
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                move(1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                move(-1);
              }
            }}
          >
            <div className="reel-stack" aria-hidden="true" />
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={report.id}
                className="reel-page"
                data-edition={current % 3}
                initial={
                  reduced
                    ? false
                    : { opacity: 0, x: direction * 130, rotate: direction * 6, scale: 0.94 }
                }
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={{ opacity: 0, x: -direction * 130, rotate: -direction * 6, scale: 0.94 }}
                transition={{ duration: reduced ? 0 : 0.25 }}
                drag={reduced ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -65) move(1);
                  else if (info.offset.x > 65) move(-1);
                }}
              >
                <div className="reel-page-heading">
                  <div className="reel-edition-number" aria-hidden="true">
                    {String(current + 1).padStart(2, "0")}
                  </div>
                  <span>COMMUNITY OBSERVATION / {String(current + 1).padStart(2, "0")}</span>
                  <h3>{CATEGORY_LABEL[report.category]}</h3>
                </div>
                <ReportCard r={report} />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="report-reel-controls">
            <button onClick={() => move(-1)} disabled={current === 0} aria-label="Previous report">
              <ArrowLeft size={20} />
            </button>
            <span aria-live="polite">
              {current + 1} / {reports.length}
            </span>
            <button
              onClick={() => move(1)}
              disabled={current === reports.length - 1}
              aria-label="Next report"
            >
              <ArrowRight size={20} />
            </button>
            <small>Swipe the page or use the arrows</small>
          </div>
        </>
      )}
    </section>
  );
}
