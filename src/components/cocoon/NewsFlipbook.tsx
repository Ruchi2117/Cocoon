import { useState } from "react";
import { LocalDate } from "./LocalDate";
import { ScrollWords } from "./ScrollWords";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
import { ArrowLeft, ArrowRight, Newspaper, BookOpen } from "lucide-react";
import type { SafetyHeadline } from "@/lib/cocoon/safety-news";
export function NewsFlipbook({ items }: { items: SafetyHeadline[] }) {
  const [index, setIndex] = useState(0),
    [back, setBack] = useState(false),
    reduced = useReducedMotion();
  const [direction, setDirection] = useState(1);
  const current = Math.min(index, Math.max(0, items.length - 1)),
    article = items[current];
  if (!article) return null;
  const move = (i: number) => {
    setDirection(i > current ? 1 : -1);
    setIndex(i);
    setBack(false);
  };
  return (
    <section
      className="news-flipbook"
      aria-label="Publisher headline reader"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" && current < items.length - 1) {
          e.preventDefault();
          move(current + 1);
        }
        if (e.key === "ArrowLeft" && current > 0) {
          e.preventDefault();
          move(current - 1);
        }
      }}
    >
      <div className="news-book-spine" aria-hidden="true">
        <Newspaper size={35} />
        <span>THE WIDER PICTURE</span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          key={`${article.url}-${back}`}
          className={`news-leaf ${back ? "news-leaf-back" : ""}`}
          drag={reduced ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.x < -65 && current < items.length - 1) move(current + 1);
            else if (info.offset.x > 65 && current > 0) move(current - 1);
          }}
          initial={reduced ? false : { opacity: 0, rotate: direction * 5, y: 70, scale: 0.92 }}
          animate={{ opacity: 1, rotate: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: -direction * 6, y: -65, scale: 0.95 }}
          transition={{ duration: reduced ? 0 : 0.4 }}
        >
          <span className="eyebrow">
            {article.publisher} · <LocalDate iso={article.publishedAt} options={{}} />
          </span>
          {back ? (
            <>
              <h3>
                PAUSE BEFORE
                <br />
                <em>PASSING IT ON.</em>
              </h3>
              <ul>
                <li>Read the full coverage, beyond its headline.</li>
                <li>Separate allegations, official findings and commentary.</li>
                <li>Check dates, updates and corrections. Protect people’s identities.</li>
              </ul>
              <p>
                A publisher link is attribution, not Cocoon’s fact verification or a local risk
                score.
              </p>
            </>
          ) : (
            <>
              <span className="news-leaf-number" aria-hidden="true">
                {String(current + 1).padStart(2, "0")}
              </span>
              <h3>
                <ScrollWords text={article.title} />
              </h3>
              <p>
                Publisher headline · content may involve sexual violence or harassment. Open
                coverage when you feel ready.
              </p>
            </>
          )}
          <div className="news-leaf-actions">
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              Read the publisher’s coverage ↗
            </a>
          </div>
        </motion.article>
      </AnimatePresence>
      <div className="news-book-controls">
        <button
          disabled={current === 0}
          onClick={() => move(current - 1)}
          aria-label="Previous headline"
        >
          <ArrowLeft size={20} />
        </button>
        <span aria-live="polite">
          {current + 1} / {items.length}
        </span>
        <button
          disabled={current === items.length - 1}
          onClick={() => move(current + 1)}
          aria-label="Next headline"
        >
          <ArrowRight size={20} />
        </button>
        <button className="news-flip-action" onClick={() => setBack(!back)} aria-pressed={back}>
          <BookOpen size={16} />
          {back ? "Headline side" : "Before you share"}
        </button>
        <small>Arrow keys work here, too.</small>
      </div>
    </section>
  );
}
