import { ScrollWords } from "@/components/cocoon/WaveText";
import { GuidedSafety } from "@/components/cocoon/GuidedSafety";
import { LearningLab } from "@/components/cocoon/LearningLab";
import { RightsDesk } from "@/components/cocoon/RightsDesk";
import { ConsentRoom } from "@/components/cocoon/ConsentRoom";
import { CourageStudio } from "@/components/cocoon/CourageStudio";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, HeartHandshake } from "lucide-react";
import { lessons, learningSources, scenarios } from "@/lib/cocoon/learning";
import { JourneyScene } from "@/components/cocoon/JourneyScene";
import { LearningPaths } from "@/components/cocoon/LearningPaths";
import { SafetyOrbit } from "@/components/cocoon/SafetyOrbit";
export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Know your ground · Cocoon Safety Library" },
      {
        name: "description",
        content:
          "Consent, boundaries, safety education, support principles and jurisdiction-labelled legal information.",
      },
      { property: "og:title", content: "Know your ground · Cocoon Safety Library" },
      {
        property: "og:description",
        content:
          "Consent, boundaries, safety education, support principles and jurisdiction-labelled legal information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SafetyLibrary,
});
function SafetyLibrary() {
  return (
    <div className="safety-library">
      <JourneyScene variant="learn" />
      <ScrollWords
        text="Knowing the signs never puts the weight on you. It just gives you more ways to act, and more people to act with."
        accent={["never", "act", "with"]}
      />
      <nav className="learn-room-shortcuts" aria-label="Explore the safety library">
        <a href="#courage-studio">Courage Studio ✳</a>
        <a href="#guides">Pocket guides ↗</a>
        <a href="#learning-lab-title">Field notes ↗</a>
        <a href="#rights">Rights & laws · India ↗</a>
        <a href="#consent-room">Consent & coercion ↗</a>
        <a href="#orbit-title">Safety carousel ↻</a>
      </nav>
      <CourageStudio />
      <SafetyOrbit />
      <GuidedSafety />
      <LearningLab />
      <ConsentRoom />
      <RightsDesk />
      <Link to="/circle" className="circle-home-link">
        <span className="eyebrow">YOU DON’T HAVE TO FIGURE EVERYTHING OUT ALONE.</span>
        <strong>FIND YOUR CIRCLE.</strong>
        <p>Explore a thoughtful peer-support space, with privacy and care guidelines.</p>
        <ArrowUpRight aria-hidden="true" />
      </Link>
      <div className="learn-reassurance">
        <HeartHandshake size={26} aria-hidden="true" />
        <p>
          <strong>You deserve respect. Harm is never your fault.</strong>
          <br />
          These options can help you prepare or get support. You are not responsible for preventing
          someone else’s abuse.
        </p>
        <Link to="/kit">
          GET HELP & CONTACTS <ArrowUpRight size={17} />
        </Link>
      </div>
      <details className="learn-reference">
        <summary>Keep exploring · the full source-linked library</summary>
        <LearningPaths />
        <nav className="learn-index" aria-label="Safety library contents">
          {lessons.map((lesson) => (
            <a key={lesson.id} href={`#${lesson.id}`}>
              <span>{lesson.number}</span>
              {lesson.title}
            </a>
          ))}
          <Link to="/reports" hash="news">
            <span>09</span>News & context
          </Link>
        </nav>
        <section
          id="reference-guides"
          aria-label="Safety information guides"
          className="learn-guides"
        >
          {lessons.map((lesson) => (
            <article id={lesson.id} key={lesson.id} className="learn-lesson">
              <div className="learn-lesson-intro">
                <span className="learn-number">{lesson.number}</span>
                <h2>{lesson.title}</h2>
                <p>{lesson.intro}</p>
              </div>
              <div className="learn-lesson-body">
                {lesson.points.map(([title, text]) => (
                  <details key={title}>
                    <summary>{title}</summary>
                    <p>{text}</p>
                  </details>
                ))}
                {lesson.id === "carry" && (
                  <Link to="/kit" className="learn-source">
                    Open your pack checklist <ArrowUpRight size={15} />
                  </Link>
                )}
                {lesson.source && (
                  <a
                    className="learn-source"
                    href={learningSources[lesson.source].url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {learningSources[lesson.source].name}
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
        <section className="learn-practice" aria-labelledby="practice-title">
          <span className="eyebrow">A moment to think</span>
          <h2 id="practice-title">
            WHAT WOULD SUPPORT
            <br />
            <em>LOOK LIKE?</em>
          </h2>
          <p className="mb-6 text-sm">
            Open a situation to explore a supportive response. There is no score and no judgement.
          </p>
          {scenarios.map((scenario) => (
            <details key={scenario.question}>
              <summary>{scenario.question}</summary>
              <p>{scenario.answer}</p>
            </details>
          ))}
        </section>
      </details>
      <footer className="learn-footer">
        <span>
          Education sources reviewed 17 October 2026. Guidance is general; services, consent laws
          and reporting duties vary by country. Source services may be country-specific.
        </span>
        <Link to="/kit">Choose your country & save useful contacts ↗</Link>
      </footer>
    </div>
  );
}
