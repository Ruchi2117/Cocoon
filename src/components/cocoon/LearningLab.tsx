import { useState } from "react";
import { ArrowRight, BookOpen, HandHeart, ShieldCheck } from "lucide-react";
import { lessons, learningSources } from "@/lib/cocoon/learning";
const topics = [
  {
    title: "Build a circle of support",
    subtitle: "A personal safety plan",
    source: "RAINN · Safety planning",
    url: "https://rainn.org/strategies-to-reduce-risk-increase-safety/safety-planning-for-survivors-of-assault-harassment-stalking/",
    points: [
      "Identify a place you could go and a person you trust who could help.",
      "Agree a code word and what your support person should do when they hear it.",
      "Consider a route and a backup; keep useful numbers accessible if your phone is unavailable.",
    ],
    prompt: "Does one plan suit everyone?",
    answer:
      "No. Plans depend on your circumstances and can change. A specialist support service can help you explore options. These choices never make you responsible for someone else’s abuse.",
  },
  {
    title: "Small conversations. Strong boundaries.",
    subtitle: "For children & safe adults",
    source: "NSPCC · Talk PANTS",
    url: "https://www.nspcc.org.uk/advice-for-families/pants-underwear-rule/",
    points: [
      "Use age-appropriate conversations about body ownership and private parts.",
      "Children can say no to unwanted touch, including from familiar people.",
      "Encourage children to tell a safe adult about upsetting secrets or worries. Harm is never their fault.",
    ],
    prompt: "What if the safe adult is not a family member?",
    answer:
      "A trusted teacher or another safe adult can listen too. Make space for questions and reassure the child that telling should not get them into trouble.",
  },
  ...["digital", "supporting"].map((id) => {
    const lesson = lessons.find((item) => item.id === id)!;
    const source = learningSources[lesson.source];
    return {
      title: lesson.title,
      subtitle: id === "digital" ? "Technology & privacy" : "When someone opens up",
      source: source.name,
      url: source.url,
      points: lesson.points.map((point) => point[1]),
      prompt: "Where can I explore this further?",
      answer:
        "Read the linked guide for context and country-specific limits. Let the person choose the support they want; use local professional help when needed.",
    };
  }),
];
export function LearningLab() {
  const [topic, setTopic] = useState(0),
    [step, setStep] = useState(0),
    [open, setOpen] = useState(false);
  const current = topics[topic]!;
  return (
    <section className="learning-lab" aria-labelledby="learning-lab-title">
      <header>
        <span className="eyebrow">THE FIELD NOTES / IDEAS YOU CAN USE</span>
        <h2 id="learning-lab-title">
          KNOW MORE.
          <br />
          <em>CARRY IT WITH YOU.</em>
        </h2>
        <p>Short lessons, practical options and a source behind every chapter.</p>
      </header>
      <div className="lab-topics" role="group" aria-label="Choose a field-note topic">
        {topics.map((item, i) => (
          <button
            key={item.title}
            aria-pressed={topic === i}
            onClick={() => {
              setTopic(i);
              setStep(0);
              setOpen(false);
            }}
          >
            <span>0{i + 1}</span>
            {item.subtitle}
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
      <div className="lab-reading">
        <div className="lab-chapter-mark" aria-hidden="true">
          <BookOpen size={55} />
          <strong>0{topic + 1}</strong>
          <span>FIELD NOTE</span>
        </div>
        <article>
          <span className="eyebrow">
            {step + 1} OF {current.points.length} / TAKE YOUR TIME
          </span>
          <h3>{current.title}</h3>
          <p aria-live="polite">{current.points[step]}</p>
          <div className="lab-steps">
            {current.points.map((_, i) => (
              <button
                aria-label={`Read idea ${i + 1}`}
                aria-pressed={step === i}
                key={i}
                onClick={() => setStep(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button className="lab-question" aria-expanded={open} onClick={() => setOpen(!open)}>
            <HandHeart size={20} />
            {current.prompt}
          </button>
          {open && <p className="lab-answer">{current.answer}</p>}
          <a href={current.url} target="_blank" rel="noopener noreferrer">
            <ShieldCheck size={16} />
            {current.source} ↗
          </a>
        </article>
      </div>
      <p className="lab-source-note">
        Reviewed 17 October 2026 · General education. RAINN is US-based; NSPCC is UK-based. Services
        and reporting duties vary by country. Use Get help for immediate danger.
      </p>
    </section>
  );
}
