export const COURAGE_SCENES = [
  {
    title: "The last stop.",
    word: "COMPANY",
    place: "21:40 / A FICTIONAL EVENING",
    prompt: "Your ride is delayed. You would feel better with a little company.",
    choices: [
      {
        label: "Look for a staffed place",
        object: "A little light",
        title: "A place with people.",
        body: "If it is accessible and you can reach it comfortably, consider waiting in a staffed, public place. You can ask a staff member for help. A light on the map does not prove that a place is open or safe.",
        pocket: "Identify a staffed place you could use while waiting.",
        to: "/explore" as const,
        cta: "Explore walking options",
      },
      {
        label: "Reach someone I trust",
        object: "A familiar voice",
        title: "You can ask for company.",
        body: "You might tell a trusted person where you are and ask them to stay in touch. Decide what you feel comfortable sharing. Cocoon’s companion is a demo and does not contact a person or emergency service for you.",
        pocket: "Choose a trusted person and agree on a check-in before you leave.",
        to: "/kit" as const,
        cta: "Prepare my contacts",
      },
    ],
    source: "RAINN · Safety planning",
    url: "https://rainn.org/strategies-to-reduce-risk-increase-safety/safety-planning-for-survivors-of-assault-harassment-stalking/",
  },
  {
    title: "A little space.",
    word: "BOUNDARIES",
    place: "YOUR PACE / YOUR CHOICE",
    prompt:
      "Someone keeps asking after you have said you need space. You don’t owe them a longer explanation.",
    choices: [
      {
        label: "Practise a clear phrase",
        object: "Your own words",
        title: "A boundary can be short.",
        body: "“I’m not comfortable with that. I’m going to leave now.” You can change the words, say nothing, or choose another way to disengage. Freezing or being unable to speak is not consent, and harm is never your fault.",
        pocket: "A phrase to practise, if useful: “I’m not comfortable with that.”",
        to: "/learn" as const,
        cta: "Explore consent & boundaries",
      },
      {
        label: "Find support instead",
        object: "Another way forward",
        title: "You do not have to confront anyone.",
        body: "If speaking feels unsafe or difficult, consider moving away or reaching someone you trust when you can. A response cannot guarantee how another person behaves. Your boundaries matter even when you cannot say them aloud.",
        pocket: "You can seek support without confronting the person making you uncomfortable.",
        to: "/kit" as const,
        cta: "Find contacts & support",
      },
    ],
    source: "RAINN · Consent 101",
    url: "https://rainn.org/share-the-facts/consent-101-respect-boundaries-and-building-trust/",
  },
  {
    title: "Room for a friend.",
    word: "LISTENING",
    place: "NO RUSH / NO PERFECT WORDS",
    prompt:
      "A friend says something happened and they don’t know how to talk about it. What could you offer?",
    choices: [
      {
        label: "Listen without pressing",
        object: "A seat beside them",
        title: "Start with being there.",
        body: "“Thank you for telling me. I’m here to listen.” Let them decide what to share. Avoid asking them to prove it or explain why they reacted a certain way. You don’t have to fix everything to be supportive.",
        pocket: "“Thank you for telling me. Would you like me to listen, or help explore options?”",
        to: "/circle" as const,
        cta: "Explore peer-support conversations",
      },
      {
        label: "Ask what would help",
        object: "An open question",
        title: "Let their choice lead.",
        body: "“Would you like company, listening, or help finding support?” Offer choices without taking control. Qualified services can help them explore options; services and reporting rules differ by country.",
        pocket: "Ask what support someone wants before offering advice.",
        to: "/kit" as const,
        cta: "Find useful support contacts",
      },
    ],
    source: "WHO · Listening when women need it most",
    url: "https://www.who.int/news-room/commentaries/detail/health-workers-listening-when-women-need-it-most",
  },
] as const;

export function couragePocket(scene: number, choice: number): string | null {
  const chapter = COURAGE_SCENES[scene];
  const selected = chapter?.choices[choice];
  if (!chapter || !selected) return null;
  return `COCOON · A SMALL THING TO CARRY\n\n${selected.title}\n${selected.pocket}\n\nReflection, not an emergency plan or guarantee. Harm is never your fault.\nSource: ${chapter.source}\n${chapter.url}\n`;
}
