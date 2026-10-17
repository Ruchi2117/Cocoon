import { useState } from "react";
import { Scale, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
const rights = [
  {
    name: "POSH",
    context: "Harassment at work",
    law: "Sexual Harassment of Women at Workplace Act, 2013",
    scope: "India · workplace protection for women",
    points: [
      "The Act addresses unwelcome sexual conduct in workplaces and provides a complaint and inquiry framework.",
      "The relevant Internal Committee or Local Committee handles complaints under the Act. The appropriate route depends on the workplace and complaint.",
      "Time limits apply. Ask the committee or a legal-aid service promptly about the process, assistance with a written complaint and any extension that may apply.",
    ],
    next: "Find your workplace committee details, or ask your district administration about the Local Committee. A workplace complaint process and criminal proceedings are different routes.",
    url: "https://nalsa.gov.in/womens-assistance/",
    source: "NALSA · official POSH handbook & district officer resources",
  },
  {
    name: "SHe-Box",
    context: "An official complaint route",
    law: "Government of India · workplace harassment portal",
    scope: "India · administrative portal, not a separate law",
    points: [
      "SHe-Box supports registration and tracking of workplace sexual-harassment complaints.",
      "It connects the complaint process with the relevant Internal or Local Committee. The portal is not an emergency-dispatch service.",
      "Read the official portal’s requirements and privacy information before entering identifying details. Cocoon does not submit or store a complaint for you.",
    ],
    next: "Open the official government portal yourself. For immediate danger, use local emergency services rather than waiting for a portal response.",
    url: "https://shebox.wcd.gov.in/",
    source: "Ministry of Women & Child Development · SHe-Box",
    extra: "https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=152076&lang=1&reg=3",
  },
  {
    name: "POCSO",
    context: "Children’s protection",
    law: "Protection of Children from Sexual Offences Act, 2012",
    scope: "India · children below 18, of all genders",
    points: [
      "POCSO covers sexual offences against children and provides child-focused procedures.",
      "Section 19 creates reporting duties: information about an offence that has occurred, or apprehension that one is likely, is to be given to the Special Juvenile Police Unit or local police.",
      "Do not promise that a disclosure will stay secret where reporting duties apply. Seek qualified child-protection or legal guidance about the next steps.",
    ],
    next: "Use the Special Juvenile Police Unit or local police for reporting. The linked Act explains the reporting framework; Cocoon is not a reporting channel.",
    url: "https://www.indiacode.nic.in/handle/123456789/17804",
    source: "India Code · POCSO Act, sections 2 & 19",
  },
  {
    name: "Domestic violence",
    context: "Protection within domestic relationships",
    law: "Protection of Women from Domestic Violence Act, 2005",
    scope: "India · women covered by the Act’s domestic-relationship requirements",
    points: [
      "The law recognises physical, sexual, verbal/emotional and economic abuse within its scope.",
      "A Magistrate may grant protection, residence and monetary-relief orders, among other remedies. Eligibility and relief depend on the circumstances.",
      "A Protection Officer, registered service provider or legal-aid institution can help explain the application route.",
    ],
    next: "Ask a District Legal Services Authority or Protection Officer about available remedies. An order is not automatic, and this summary does not assess your eligibility.",
    url: "https://www.indiacode.nic.in/handle/123456789/2021",
    source: "India Code · Domestic Violence Act, sections 3 & 18–22",
  },
  {
    name: "Stalking & privacy",
    context: "Criminal-law protections",
    law: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
    scope: "India · exact offence, wording and incident date matter",
    points: [
      "The BNS includes sexual harassment (section 75), voyeurism (section 77) and stalking (section 78).",
      "These provisions have specific elements and gendered wording; not every uncomfortable encounter meets the same legal definition.",
      "Older incidents may involve the previous criminal-law framework. Ask police or a qualified lawyer which provisions apply rather than relying on a social-media checklist.",
    ],
    next: "The official text explains each offence. Use legal aid to understand how the law relates to your situation; Cocoon does not determine that an offence occurred.",
    url: "https://www.indiacode.nic.in/handle/123456789/20062",
    source: "India Code · BNS, sections 75, 77 & 78",
  },
  {
    name: "Sexual violence in marriage",
    context: "Consent principles & legal limits",
    law: "India: published BNS text, sections 63 & 67",
    scope: "India · criminal-law scope is not the same as consent or acceptability",
    points: [
      "The published BNS section 63, Exception 2, excludes sexual acts by a man with his wife from its rape definition when the wife is 18 or older. This is a legal exception, not a statement that forced sex is acceptable or consensual.",
      "Section 67 separately addresses non-consensual intercourse by a husband with a wife living separately, whether under a decree of separation or otherwise. Child-protection law and domestic-violence remedies can also matter.",
      "Age, incident date, separation, facts and court decisions can affect the applicable law. This page does not resolve litigation or determine whether a case can be prosecuted. Seek current, individual legal advice.",
    ],
    next: "You can seek medical, specialist and legal support without treating this summary as a verdict on your experience. Ask a District Legal Services Authority about options, including protection under domestic-violence law.",
    url: "https://cytrain.ncrb.gov.in/staticpage/web_pages/ChaptersBNS.html",
    source: "NCRB · published BNS text, sections 63 & 67",
    extra: "https://nalsa.gov.in/womens-assistance/",
  },
  {
    name: "Legal aid",
    context: "Help understanding your options",
    law: "Legal Services Authorities Act, 1987",
    scope: "India · statutory eligibility and application assessment apply",
    points: [
      "Women and children are among the eligibility categories for free legal services under section 12.",
      "NALSA explains how to approach Taluk, District or State Legal Services Authorities, including the District Legal Services Authority at the district court.",
      "Legal-aid clinics can help explain rights, applications and appropriate support. This is legal assistance, not emergency dispatch.",
    ],
    next: "Use NALSA’s official assistance page to find the application route and local institution. No payment or complaint is made through Cocoon.",
    url: "https://nalsa.gov.in/womens-assistance/",
    source: "NALSA · assistance for women & legal-services institutions",
  },
];
export function RightsDesk() {
  const [selected, setSelected] = useState(0);
  const item = rights[selected]!;
  return (
    <section className="rights-desk" id="rights" aria-labelledby="rights-title">
      <header>
        <span className="eyebrow">THE RIGHTS DESK / INDIA</span>
        <h2 id="rights-title">
          RIGHTS AREN’T
          <br />
          <em>JUST FINE PRINT.</em>
        </h2>
        <p>
          Know the framework. Find the official route. Start with the situation, not the legal
          jargon.
        </p>
      </header>
      <div className="rights-jurisdiction">
        <Scale size={20} />
        <p>
          <strong>India-specific information.</strong> These rules do not apply worldwide.{" "}
          <Link to="/kit">Choose your current country for emergency contacts ↗</Link>
        </p>
      </div>
      <div className="rights-layout">
        <div className="rights-topics" role="group" aria-label="Choose a rights topic">
          {rights.map((topic, index) => (
            <button
              key={topic.name}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <span>0{index + 1}</span>
              <strong>{topic.name}</strong>
              <small>{topic.context}</small>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
        <article className="rights-reading" aria-live="polite">
          <span className="eyebrow">{item.scope}</span>
          <h3>{item.law}</h3>
          <ul>
            {item.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="rights-next">
            <ShieldCheck size={22} />
            <div>
              <strong>A possible starting point</strong>
              <p>{item.next}</p>
            </div>
          </div>
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.source} ↗
          </a>
          {item.extra && (
            <a href={item.extra} target="_blank" rel="noopener noreferrer">
              Additional official guidance ↗
            </a>
          )}
        </article>
      </div>
      <p className="rights-review">
        Sources checked 17 October 2026 · General legal education, not individual legal advice.
        Laws, procedures and local contacts can change. Check the official text and seek qualified
        advice on deadlines and your circumstances. Cocoon does not receive complaints or promise
        outcomes.
      </p>
    </section>
  );
}
