import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
import { ArrowUpRight, Bookmark, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { COURAGE_SCENES, couragePocket } from "@/lib/cocoon/courage-studio";
import { CourageScene } from "./CourageScene";

export function CourageStudio() {
  const [chapter, setChapter] = useState(0),
    [choice, setChoice] = useState<number | null>(null),
    [still, setStill] = useState(false);
  const ref = useRef<HTMLElement>(null),
    visible = useInView(ref, { amount: 0.1 }),
    reduced = useReducedMotion();
  const scene = COURAGE_SCENES[chapter]!,
    selected = choice === null ? null : scene.choices[choice];
  const quiet = !!reduced || still || !visible;
  function carry() {
    if (choice === null) return;
    const text = couragePocket(chapter, choice);
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "cocoon-small-step.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      ref={ref}
      id="courage-studio"
      className="courage-studio"
      aria-labelledby="courage-heading"
    >
      <div className="courage-masthead">
        <span>COCOON ORIGINAL / THE COURAGE STUDIO</span>
        <span>EXPLORE AT YOUR OWN PACE</span>
      </div>
      <header className="courage-header">
        <div>
          <span className="courage-kicker">
            <Sparkles size={15} /> A little rehearsal for real life.
          </span>
          <h2 id="courage-heading">
            Courage can
            <br />
            start{" "}
            <motion.em
              initial={reduced ? false : { clipPath: "inset(0 100% 0 0)" }}
              whileInView={{ clipPath: "inset(0 0% 0 0)" }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              small.
            </motion.em>
          </h2>
        </div>
        <p>
          Step into a moment. Explore two possibilities.
          <br />
          No score. No perfect answer. Nothing to disclose.
        </p>
      </header>
      <div className="courage-chapters" role="group" aria-label="Choose a rehearsal scene">
        {COURAGE_SCENES.map((s, i) => (
          <button
            key={s.title}
            aria-pressed={chapter === i}
            onClick={() => {
              setChapter(i);
              setChoice(null);
            }}
          >
            {s.title}
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      <div className="courage-layout">
        <div className="courage-world">
          <div className="courage-world-meta">
            <span>{scene.place}</span>
            <button
              aria-label={still ? "Let the scene move" : "Rest the scene"}
              aria-pressed={still || !!reduced}
              disabled={!!reduced}
              onClick={() => setStill(!still)}
            >
              {still ? <Play size={13} /> : <Pause size={13} />}
            </button>
          </div>
          <CourageScene chapter={chapter} choice={choice} quiet={quiet} />
          <div className="courage-scene-word" aria-hidden="true">
            {scene.word}
          </div>
          <p className="courage-caption">Illustrated rehearsal · no live services or messages</p>
        </div>
        <div className="courage-choice-room">
          <span className="eyebrow">THE MOMENT / 0{chapter + 1}</span>
          <h3>{scene.prompt}</h3>
          <p>What would you like to explore?</p>
          <div className="courage-choices">
            {scene.choices.map((c, i) => (
              <button key={c.label} aria-pressed={choice === i} onClick={() => setChoice(i)}>
                <div>
                  <small>{c.object}</small>
                  <strong>{c.label}</strong>
                </div>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="courage-reflection"
              key={`${chapter}-${choice}`}
              initial={reduced || still ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced || still ? 0 : 0.2 }}
              aria-live="polite"
            >
              {selected ? (
                <>
                  <span className="courage-reflection-label">ONE POSSIBILITY</span>
                  <h4>{selected.title}</h4>
                  <p>{selected.body}</p>
                  <Link
                    to={selected.to}
                    {...(selected.to === "/learn" ? { hash: "consent-room" } : {})}
                  >
                    {selected.cta}
                    <ArrowUpRight size={15} />
                  </Link>
                </>
              ) : (
                <>
                  <span className="courage-reflection-label">YOU SET THE PACE</span>
                  <p>
                    Choose either option to explore it. You can change your mind, try both, or leave
                    this scene whenever you want.
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <footer className="courage-pocket">
        <div>
          <Bookmark size={20} />
          <div>
            <strong>A small thing to carry.</strong>
            <p>{selected?.pocket ?? "Explore an option to make a source-linked pocket note."}</p>
          </div>
        </div>
        <div className="courage-pocket-actions">
          <button onClick={carry} disabled={!selected}>
            Keep this thought ↓
          </button>
          <button
            onClick={() => setChoice(null)}
            disabled={choice === null}
            aria-label="Reset this rehearsal"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </footer>
      <div className="courage-source">
        <a href={scene.url} target="_blank" rel="noopener noreferrer">
          Reading behind this scene · {scene.source} ↗
        </a>
        <p>
          General reflection, not an emergency plan or a guarantee. Harm is never your fault.{" "}
          <Link to="/kit">Useful contacts & support ↗</Link>
        </p>
      </div>
    </section>
  );
}

export function CourageInvitation() {
  return (
    <Link to="/learn" hash="courage-studio" className="courage-invitation">
      <div>
        <span>NEW / THE COURAGE STUDIO</span>
        <strong>
          What if you could
          <br />
          rehearse a little <em>courage?</em>
        </strong>
        <p>Three illustrated moments. Your own next small step.</p>
      </div>
      <div className="courage-invitation-seal" aria-hidden="true">
        <Sparkles size={35} />
        <span>
          COME
          <br />
          EXPLORE
        </span>
        <ArrowUpRight size={28} />
      </div>
    </Link>
  );
}
