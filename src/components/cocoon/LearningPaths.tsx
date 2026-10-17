import { useState } from "react";
import { Sprout, HandHeart, HeartHandshake } from "lucide-react";
import { lessons, learningSources } from "@/lib/cocoon/learning";
const paths = [
  {
    name: "For my everyday life",
    intro:
      "Start with what you need today. There is no test and no obligation to share a personal experience.",
    ids: ["boundaries", "signals", "digital", "carry", "support"],
  },
  {
    name: "Children & young people",
    intro:
      "Read together with a safe adult. Use calm, age-appropriate language; a child is never responsible for stopping abuse.",
    ids: ["children", "digital", "supporting"],
  },
  {
    name: "Supporting someone",
    intro:
      "Let the person set the pace. Listening and offering choices matter more than finding the perfect words.",
    ids: ["supporting", "bystander", "support", "digital"],
  },
];
const pathIcons = [Sprout, HandHeart, HeartHandshake];
export function LearningPaths() {
  const [selected, setSelected] = useState(0);
  const path = paths[selected]!;
  return (
    <section className="learning-paths" aria-labelledby="learning-path-title">
      <div className="learning-path-heading">
        <span className="eyebrow">The reading room / start where you are</span>
        <h2 id="learning-path-title">
          KNOWLEDGE YOU CAN
          <br />
          <em>TAKE WITH YOU.</em>
        </h2>
        <p>
          Source-linked guidance for everyday boundaries, difficult moments and caring for others.
        </p>
      </div>
      <div className="learning-path-tabs" role="tablist" aria-label="Choose a learning path">
        {paths.map((p, i) => {
          const Icon = pathIcons[i]!;
          return (
            <button
              key={p.name}
              role="tab"
              id={`learning-tab-${i}`}
              aria-selected={selected === i}
              aria-controls="learning-path-panel"
              tabIndex={selected === i ? 0 : -1}
              onClick={() => setSelected(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  const next = (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                  setSelected(next);
                  document.getElementById(`learning-tab-${next}`)?.focus();
                }
              }}
            >
              <Icon aria-hidden="true" size={23} />
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>
      <div id="learning-path-panel" role="tabpanel" aria-labelledby={`learning-tab-${selected}`}>
        <p className="reading-note">{path.intro}</p>
        <ol className="learning-trail">
          {path.ids.map((id, i) => {
            const lesson = lessons.find((l) => l.id === id)!;
            return (
              <li key={id}>
                <span aria-hidden="true">0{i + 1}</span>
                <a href={`#${id}`}>
                  <strong>{lesson.title}</strong>
                  <small>{lesson.intro}</small>
                  <em>
                    {lesson.source ? learningSources[lesson.source].name : "Practical guidance"} ↗
                  </em>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="source-standard">
        How this room is edited: each guide links to its source. News is kept separate from
        education and map reports. Personal disclosures are not fact-checked as a condition of
        receiving support.
      </p>
    </section>
  );
}
