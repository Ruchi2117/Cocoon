import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { HeartHandshake, ArrowUpRight } from "lucide-react";
const topics = [
  {
    title: "Coercion is not consent",
    label: "Pressure & control",
    points: [
      "Consent must be freely given. Repeated pressure, guilt, threats, blackmail or misuse of authority can undermine that freedom.",
      "A person may give in because they fear losing housing, money, work, a relationship or their safety. Giving in under pressure is not the same as freely wanting something.",
      "You do not owe sexual activity to anyone. You can change your mind. Responsibility belongs to the person applying pressure, not the person trying to stay safe.",
    ],
    reflection: "‘If you loved me, you would’ is pressure, not a reason someone owes sex.",
    source: "RAINN · responding to pressure or coercion",
    url: "https://rainn.org/strategies-to-reduce-risk-increase-safety/how-to-respond-if-someone-is-pressuring-you/",
  },
  {
    title: "Rape & sexual assault",
    label: "Understanding harm",
    points: [
      "Sexual assault involves sexual contact or activity without consent. Rape generally refers to non-consensual penetration; exact legal definitions vary by jurisdiction.",
      "The person may be a stranger, friend, date or partner. A previous yes, flirting or a relationship does not establish consent now.",
      "Freezing, going quiet or not fighting back does not establish consent. Harm is never justified by what someone wore, drank or did beforehand.",
    ],
    reflection:
      "A survivor does not need visible injuries or a particular emotional reaction to deserve support.",
    source: "RAINN · facts about sexual assault & rape",
    url: "https://rainn.org/get-the-facts-about-sexual-assault-rape",
  },
  {
    title: "Marriage does not replace consent",
    label: "Partners & marital rape",
    points: [
      "Forced or coerced sexual activity by a spouse or partner is sexual violence. Marriage and a past sexual relationship do not create ongoing permission.",
      "Pressure can involve money, children, immigration status, shame or retaliation. Abuse can occur without obvious physical injury.",
      "You deserve support even if you stay, feel unsure, still care about the person, or are not ready to report. A local specialist service can help you explore options without treating leaving as a simple instruction.",
    ],
    reflection:
      "Consent applies inside relationships too. The support principle and a country’s criminal-law definition are different questions.",
    source: "RAINN · intimate partner sexual violence",
    url: "https://rainn.org/what-counts-as-sexual-violence/get-the-facts-about-intimate-partner-sexual-violence/",
  },
  {
    title: "Grooming & misuse of trust",
    label: "Patterns, not stereotypes",
    points: [
      "Grooming involves building trust or dependence to facilitate sexual abuse. It may be gradual and can involve someone familiar or in authority.",
      "Pay attention to boundary violations and manipulation, rather than assuming a particular appearance or relationship makes someone safe.",
      "Being manipulated never makes the person targeted responsible. For children, involve appropriate safe adults and child-protection support; India’s POCSO reporting duties are explained in the Rights Desk.",
    ],
    reflection: "Trust and affection do not give someone permission to cross sexual boundaries.",
    source: "RAINN · facts about grooming",
    url: "https://rainn.org/get-the-facts-about-sexual-violence/get-the-facts-about-grooming/",
  },
];
export function ConsentRoom() {
  const [opened, setOpened] = useState(false),
    [selected, setSelected] = useState(0);
  const topic = topics[selected]!;
  return (
    <section className="consent-room" id="consent-room" aria-labelledby="consent-room-title">
      <header>
        <span className="eyebrow">THE CONSENT ROOM / NO BLAME. NO PRESSURE.</span>
        <h2 id="consent-room-title">
          LET’S NAME
          <br />
          <em>WHAT ISN’T OKAY.</em>
        </h2>
        <p>
          Content note: coercion, rape, partner sexual violence and grooming. Non-graphic education;
          you choose when to read.
        </p>
        <button className="consent-open" onClick={() => setOpened(!opened)} aria-expanded={opened}>
          {opened ? "Close these topics" : "Read at my own pace"}
          <ArrowUpRight size={18} />
        </button>
      </header>
      {opened && (
        <>
          <div className="consent-topics" role="group" aria-label="Choose a consent topic">
            {topics.map((item, index) => (
              <button
                key={item.title}
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <article className="consent-reading">
            <span className="eyebrow">UNDERSTAND / RECOGNISE / FIND SUPPORT</span>
            <h3>{topic.title}</h3>
            <ul>
              {topic.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <blockquote>{topic.reflection}</blockquote>
            <a href={topic.url} target="_blank" rel="noopener noreferrer">
              {topic.source} ↗
            </a>
          </article>
          <div className="consent-support">
            <HeartHandshake size={25} />
            <p>
              <strong>
                You don’t need to choose a label or prove what happened to ask for support.
              </strong>{" "}
              If someone tells you, listen without interrogating them, avoid blame and offer
              choices. Medical and specialist support can help; services and reporting duties differ
              by location.
            </p>
            <Link to="/kit">Help & contacts ↗</Link>
          </div>
          <a className="consent-law-link" href="#rights">
            India: legal context, POCSO and legal aid ↗
          </a>
          <p className="consent-review">
            Sources reviewed 17 October 2026 · RAINN is US-based; these are general consent/support
            principles, not a statement of local criminal law. Cocoon does not collect a disclosure
            here.
          </p>
        </>
      )}
    </section>
  );
}
