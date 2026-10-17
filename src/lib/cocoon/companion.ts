import type { ChatMessage, CompanionSettings, Trip } from "./types";
import { countryByCode } from "./locale";

/**
 * Conversation provider abstraction. No AI credentials are configured for this demo,
 * so `demoProvider` (scripted, rule-based, runs locally) is used and labelled as such.
 * A live provider would implement the same interface behind a server function.
 */
export interface CompanionContext {
  settings: CompanionSettings;
  trip: Trip | null;
  guardianName: string | null;
  incidentOpen: boolean;
  history: ChatMessage[];
  country?: string | null | undefined;
}
export interface CompanionReply {
  text: string;
  actions?: ChatMessage["actions"];
}
export interface ConversationProvider {
  id: string;
  label: string;
  live: boolean;
  reply(input: string, ctx: CompanionContext): Promise<CompanionReply>;
}

const CONCERN =
  /\b(uncomfortable|scared|afraid|unsafe|followed|following me|nervous|creepy|worried|anxious|not ok|not okay|panic|panicking|lost|someone.*behind)\b/i;
export function emergencyGuidance(country: string | null | undefined) {
  const urgent = countryByCode(country ?? null)?.authorities.find((a) => a.urgent);
  return urgent
    ? `For immediate danger, call ${urgent.number} in ${countryByCode(country ?? null)?.name}.${country === "CA" ? " Where 911 is unavailable, use the verified local emergency number for your area." : ""}`
    : "If there is immediate danger, call the local emergency number where you are. Select your current country in Safety Kit to check available contacts.";
}
export function isExplicitSos(q: string) {
  if (
    /\b(no emergency|not (?:in )?danger|not an emergency|don't (?:send|trigger)|do not (?:send|trigger)|cancel)\b/i.test(
      q,
    )
  )
    return false;
  return /\bsos\b|^(?:please )?(?:help(?: me)?|emergency|danger)[.! ]*$|\b(?:call|get|send)\b.{0,15}\b(?:police|ambulance|help)\b|\b(?:send|trigger|activate|need|start|request)\b.{0,25}\b(?:emergency|alert)\b|\b(?:it'?s|this is) an emergency\b|\bi(?:'m| am) in (?:immediate )?danger\b/i.test(
    q,
  );
}

const tone = {
  casual: { hi: "Hey!", ok: "Got it.", warm: "We can focus on what would help right now." },
  protective: {
    hi: "I'm here.",
    ok: "Understood.",
    warm: "We can take this one step at a time.",
  },
  calm: { hi: "Hi there.", ok: "Okay.", warm: "Let's take this one step at a time." },
  playful: { hi: "Hey you!", ok: "Ooh, noted.", warm: "You've got a co-pilot in your pocket." },
};

function etaLine(t: Trip | null) {
  if (!t)
    return "You don't have an active journey yet — start one from the route explorer and I can follow along.";
  if (t.etaMinutes <= 0)
    return `You've reached ${t.destination}. Want me to end the trip and stop sharing?`;
  return `You're heading to ${t.destination}, about ${t.etaMinutes} minute${t.etaMinutes === 1 ? "" : "s"} out (simulated progress).`;
}

export const demoProvider: ConversationProvider = {
  id: "demo",
  label: "Demo conversation mode (scripted, on-device)",
  live: false,
  async reply(input, { settings, trip, guardianName, incidentOpen, history, country }) {
    const T = tone[settings.style];
    const extra = settings.chattiness >= 3 ? ` ${T.warm}` : "";
    const q = input.toLowerCase();
    if (isExplicitSos(q)) {
      return {
        text: `${T.ok} Open SOS below and confirm to create a demo alert. I can't contact police or emergency services. ${emergencyGuidance(country)}`,
        actions: ["sos"],
      };
    }
    if (/\b(?:what|who|how).*(?:danger|emergency|police|authority)|\bemergency number\b/.test(q))
      return {
        text: `${emergencyGuidance(country)} In Safety Kit you can also keep a campus/security contact and a trusted person's number. Cocoon's SOS is currently a demo, separate from a real emergency call.`,
      };
    if (
      /\b(?:i(?:'m| am| have)?|we(?:'re| are| have)?) (?:arrived|home|at (?:the )?gate)|\breached (?:home|my destination|the hostel)\b/.test(
        q,
      )
    )
      return {
        text: trip
          ? `Glad you've made it. Open your journey and tap “I've arrived” to finish and stop sharing. Your SOS${incidentOpen ? " is still open; resolve or cancel it separately when appropriate" : " remains available if needed"}.`
          : "Glad you've arrived. There isn't an active trip to close. Take a moment to settle in.",
      };
    if (CONCERN.test(q)) {
      const g =
        guardianName && trip?.sharing === "active"
          ? `You can prepare a short guardian update for ${guardianName} below; this demo does not send an external message.`
          : "You don't have a guardian sharing this trip right now.";
      return {
        text: `I hear you. If it is feasible, move toward a staffed public place. ${g} And SOS is always one tap away.${incidentOpen ? " Your SOS is still open." : ""}`,
        actions: guardianName && trip?.sharing === "active" ? ["guardian_update", "sos"] : ["sos"],
      };
    }
    if (/\b(?:record|recording|camera|photo|video|evidence|send audio)\b/.test(q))
      return {
        text: "The support desk lets you choose a short local audio or video recording and review it before sharing. I cannot see those recordings or send them for you. You can ask for help without collecting evidence. Would you prefer to reach someone now?",
      };
    if (/\b(?:breathe|calm|grounding|relax)\b/.test(q))
      return {
        text: `Let's slow the moment down. If you're somewhere comfortable, let your shoulders soften and breathe gently in, then a little more slowly out. No need to hold your breath. Stop if it feels uncomfortable. Safety Kit has a visual guide. ${incidentOpen ? "Your SOS is still open." : "If something around you feels unsafe, focus on reaching a staffed, public place first."}`,
      };
    if (/\b(?:pack|carry|take with|precaution|before (?:i )?leave)\b/.test(q))
      return {
        text: "Keep a charged phone, a power bank, your necessary medication, water and backup fare handy. Save a trusted person's number somewhere you can reach easily. The Safety Kit has a checklist you can tick off before leaving.",
      };
    if (/\b(?:taxi|cab|uber|ride|driver|car)\b/.test(q))
      return {
        text: "Before getting in, check the vehicle registration and driver against your booking. Use the ride app's own trip-sharing feature with someone you trust. Cocoon currently plans walks; it doesn't verify drivers or track your ride in the background.",
      };
    if (/\b(?:music|song|playlist)\b/.test(q))
      return {
        text: "What fits your mood: something mellow, a favourite sing-along, or a little energy? I can't play music here, but we can pick a vibe. Keep the volume at a level where you can still notice your surroundings.",
      };
    if (/\b(?:weather|rain|temperature)\b/.test(q))
      return {
        text: "I don't have live weather information. Check your weather app before heading out; if the weather changes, a staffed indoor place can be a useful stop.",
      };
    if (/\b(?:day|exam|class|work|tired|long day)\b/.test(q))
      return {
        text:
          settings.chattiness === 1
            ? "Sounds like a lot. Want to tell me the best or hardest part?"
            : "A long day and a journey on top of it. What would help more right now: getting it off your chest, or a small distraction while you walk?",
      };
    if (/\b(?:thank|thanks)\b/.test(q))
      return {
        text: `Of course.${trip ? ` One step at a time toward ${trip.destination}.` : " I'm here whenever you want some company."}`,
      };
    if (/\b(?:remember|memory|memories)\b/.test(q))
      return {
        text: settings.memories.length
          ? `You chose to save: ${settings.memories.join("; ")}. You can remove these in companion settings.`
          : "You haven't saved any preferences. Add only what you'd like me to remember in companion settings.",
      };
    if (/(eta|how long|far|minutes|where am i|arrive)/.test(q))
      return { text: `${etaLine(trip)}${extra}` };
    if (/\b(?:route|directions|way home|where.*walk)\b/.test(q))
      return {
        text: trip
          ? `Your trip is set for ${trip.destination}. ${trip.routeProvider === "osm-foot" ? "The journey page keeps the walking directions from the map provider." : "This is an illustrative demo path, not street navigation."} I can't assess what's happening along it in real time. Open your journey map to review the route and reports.`
          : "Open Routes, enter a start and destination, then compare the available walks and reports. You can search worldwide or type coordinates if place search is unavailable. No route is guaranteed safe.",
      };
    if (/(guardian|sister|share|who.*see)/.test(q)) {
      return {
        text:
          trip?.sharing === "active" && guardianName
            ? `${guardianName} can see your destination, ETA and latest simulated location until the trip ends. They don't see our conversation.`
            : "Trip sharing is off right now.",
        actions: trip ? ["share_eta"] : undefined,
      };
    }
    if (/(check.?in|i'?m ok|i am ok|i'm fine|i feel good)/.test(q))
      return {
        text: trip
          ? `${T.ok} Want to log a check-in${trip.sharing === "active" && guardianName ? ` for ${guardianName}` : " on your trip"}?`
          : "Good to hear. Start a journey first if you'd like to log check-ins.",
        actions: trip ? ["check_in"] : [],
      };
    if (/(hi|hello|hey)\b/.test(q))
      return {
        text: `${T.hi} I'm ${settings.name}, your Cocoon companion. ${etaLine(trip)}${extra}`,
      };
    if (/(who are you|are you real|human)/.test(q))
      return {
        text: `I'm ${settings.name}, an app companion — not a person, and I can't see what's around you. I can follow your trip details, check in, and help you reach your guardian or SOS.`,
      };
    const fillers = [
      "Tell me a little more. Would you like to talk about it or switch to something lighter?",
      "What would feel good at the end of this journey: a warm drink, a favourite show, or just putting your feet up?",
      "We can take the conversation at your pace. Ask me about your trip, a check-in, or a travel tip whenever you want.",
    ];
    return {
      text:
        fillers[history.filter((m) => m.from === "user").length % fillers.length] +
        (settings.chattiness === 1 ? "" : extra),
    };
  },
};

/* ---------------- speech: browser built-in (free, on-device where supported) ---------------- */
export function listVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}
const DEEP = /(male|daniel|alex|fred|david|james|arthur|rishi|aaron|guy|ravi|george)/i;
export function isDeepVoice(v: SpeechSynthesisVoice) {
  return DEEP.test(v.name);
}
const QUALITY = /(natural|neural|enhanced|premium|google|siri|online)/i;
/** Prefer the device language and voices labelled natural/enhanced by the operating system. */
export function rankVoices(
  vs: SpeechSynthesisVoice[],
  preferred = typeof navigator !== "undefined" ? navigator.language : "en-US",
) {
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.toLowerCase() === preferred.toLowerCase()
      ? 5
      : v.lang.split("-")[0] === preferred.split("-")[0]
        ? 3
        : v.lang.startsWith("en")
          ? 1
          : 0) +
    (QUALITY.test(v.name) ? 3 : 0) +
    (v.localService ? 0 : 1);
  return [...vs].sort((a, b) => score(b) - score(a));
}

/** Adds natural pauses: splits on sentence boundaries so the browser voice breathes between thoughts. */
export function chunkForSpeech(text: string) {
  return text
    .replace(/—/g, ", ")
    .split(/(?<=[.!?])\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export interface SpeakHandle {
  cancel: () => void;
}

/**
 * Speaks with the browser's built-in voice (labelled in UI as browser voice, not human).
 * Any new call cancels prior speech, so the user can always interrupt.
 */
export function speak(
  text: string,
  voiceURI: string | null,
  style: CompanionSettings["style"],
  cb: { onStart?: () => void; onEnd?: () => void } = {},
): SpeakHandle {
  const noop = { cancel: () => {} };
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    cb.onEnd?.();
    return noop;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const all = listVoices();
  const v = all.find((x) => x.voiceURI === voiceURI) ?? rankVoices(all)[0];
  const parts = chunkForSpeech(text);
  let cancelled = false;
  let ended = false;
  const finish = () => {
    if (!cancelled && !ended) {
      ended = true;
      cb.onEnd?.();
    }
  };
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    const base = style === "playful" ? 1.06 : style === "calm" ? 0.9 : 0.98;
    u.rate = base + (p.endsWith("?") ? 0.03 : 0) - (i === parts.length - 1 ? 0.03 : 0);
    u.pitch = (v && isDeepVoice(v) ? 0.85 : 1) + (p.endsWith("?") ? 0.06 : 0);
    if (i === 0) u.onstart = () => !cancelled && cb.onStart?.();
    if (i === parts.length - 1) u.onend = finish;
    u.onerror = () => {
      synth.cancel();
      finish();
    };
    synth.speak(u);
  });
  if (!parts.length) finish();
  return {
    cancel: () => {
      cancelled = true;
      synth.cancel();
    },
  };
}
