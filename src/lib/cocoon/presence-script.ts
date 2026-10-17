import { emergencyGuidance, isExplicitSos } from "./companion";

export type PresenceIntent = "company" | "ground" | "next";
export type PresenceAction = "sos" | "journey" | "kit" | "recording";
export interface RoomReply {
  text: string;
  actions?: PresenceAction[];
}
export const INTENTS: Record<PresenceIntent, { label: string; opening: string; reminder: string }> =
  {
    company: {
      label: "Keep me company",
      opening:
        "Let’s have a little company. Would you rather tell me about your day or choose a small distraction?",
      reminder: "Choose one small comfort or someone you’d like to talk to.",
    },
    ground: {
      label: "Ground me",
      opening:
        "If you’re somewhere comfortable, notice one thing you can see and one thing you can feel. No need to change your breathing. You can stop whenever you want.",
      reminder: "Pause grounding if uncomfortable; stay aware of your surroundings.",
    },
    next: {
      label: "Help decide a next step",
      opening:
        "We can sort one next step, not everything at once. Are you choosing where to go, who to reach, or what to do when you arrive?",
      reminder: "Choose your next step yourself; review Journey or contact someone you trust.",
    },
  };

export interface ScriptContext {
  intent: PresenceIntent;
  turn: number;
  country: string | null;
  demoDestination?: string;
}
export interface RoomProvider {
  reply(text: string, context: ScriptContext): Promise<RoomReply>;
}
const replies: Record<PresenceIntent, string[]> = {
  company: [
    "Would a tiny distraction help? Think of a place you’d like to visit for an afternoon. What would you do first?",
    "We can keep this simple. What is one good thing, even a very small one, from today?",
    "Would you rather talk about your day, pick a comforting activity for later, or sit with a quiet moment?",
    "No need to find the perfect words. You can tell me a little more, or choose a different kind of company.",
  ],
  ground: [
    "If it feels comfortable, notice the contact of your feet or the chair beneath you. Describe one texture. Keep your eyes open if that helps you stay aware.",
    "Find one shape around you, then another. There is no right answer. You can also skip this and focus on a practical next step.",
    "Try letting your shoulders settle without forcing them. Breathe normally; stop this exercise if it feels uncomfortable.",
    "Would you like another simple noticing exercise, some company, or help choosing what to do next?",
  ],
  next: [
    "Name your two options. We can compare what each would need: time, transport, or a person you can reach. I can’t assess conditions around you.",
    "Which option has the clearest first step? You could review a journey, contact a trusted person, or pause somewhere staffed if feasible.",
    "What is one thing you can decide now, and one thing that can wait? Keep the next step small and under your control.",
    "Would reviewing Journey or opening your contacts be useful? I won’t change private journeys or notify anyone for you.",
  ],
};
export const roomProvider: RoomProvider = {
  async reply(input, ctx) {
    const q = input.toLowerCase();
    if (
      isExplicitSos(q) ||
      /\b(unsafe|followed|following me|scared|danger|panic|panicking)\b/.test(q)
    )
      return {
        text: `If feasible, move toward a staffed public place or reach someone you trust. ${emergencyGuidance(ctx.country)} Open SOS to review a real in-app alert yourself; guardians must open their inbox. I cannot assess danger or dispatch help.`,
        actions: ["sos", "kit"],
      };
    if (/\b(record|recording|camera|video|photo)\b/.test(q))
      return {
        text: "Recording is optional. You can choose a local recorder below, then review, download or share the clip yourself. I cannot see the clip or send it. Reaching someone does not require evidence.",
        actions: ["recording"],
      };
    if (/\b(journey|route|eta|arrived|check.?in|guardian|share)\b/.test(q))
      return {
        text: `${ctx.demoDestination ? `The local demo destination is ${ctx.demoDestination}. ` : ""}Real private journeys and in-app guardian alerts are separate. Open Journey or SOS to review and confirm your own action. I don’t read private account details, track you or send our conversation. No route is guaranteed safe.`,
        actions: ["journey", "sos"],
      };
    if (/\b(human|real|ai|who are you)\b/.test(q))
      return {
        text: "I’m Cocoon’s scripted app companion, not a person or natural conversational AI. I choose from written responses and cannot see or hear your surroundings beyond the text you submit. Browser voice is optional.",
      };
    if (/\b(weather|rain|driver|traffic)\b/.test(q))
      return {
        text: "I don’t have live weather, traffic or driver verification. Check a current local source or your booking, and choose a practical next step based on what you can observe.",
        actions: ["journey"],
      };
    if (/\b(exam|class|work|tired|day)\b/.test(q) && ctx.intent === "company")
      return {
        text:
          ctx.turn % 2
            ? "A lot can fit into one day. Would you rather talk about the hardest part, or choose something comforting for later?"
            : "Let’s put the day down for a moment. What felt worth keeping, and what would you like to leave behind?",
      };
    if (/\b(thank|thanks)\b/.test(q))
      return {
        text:
          ctx.turn % 2
            ? "You’re welcome. Would you like a quiet moment or one more small next step?"
            : "Of course. We can leave it here, or change the kind of company you want.",
      };
    return {
      text:
        replies[ctx.intent][ctx.turn % replies[ctx.intent].length] ?? INTENTS[ctx.intent].opening,
    };
  },
};
