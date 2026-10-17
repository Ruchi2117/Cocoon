import { z } from "zod";
export const CIRCLE_TOPICS = {
  body: "Periods & body",
  boundaries: "Boundaries & relationships",
  campus: "Travel & campus life",
  feelings: "How I’m feeling",
} as const;
export const CIRCLE_NEEDS = {
  listening: "Just listen",
  suggestions: "Gentle suggestions",
  resources: "Help finding resources",
} as const;
const message = z.object({
  id: z.string(),
  authorId: z.string(),
  body: z.string().min(1).max(1500),
  createdAt: z.string(),
  status: z.enum(["pending", "approved", "changes", "withdrawn"]),
  reviewNote: z.string(),
  demo: z.boolean(),
});
export const circleSchema = z.object({
  posts: z.array(
    message.extend({
      topic: z.enum(["body", "boundaries", "campus", "feelings"]),
      need: z.enum(["listening", "suggestions", "resources"]),
      title: z.string().min(1).max(100),
      sensitive: z.boolean(),
    }),
  ),
  replies: z.array(message.extend({ postId: z.string() })),
  reports: z.array(
    z.object({
      id: z.string(),
      targetId: z.string(),
      reporterId: z.string(),
      reason: z.enum(["unkind", "rumor", "privacy", "medical", "other"]),
      createdAt: z.string(),
      resolved: z.boolean(),
    }),
  ),
  joined: z.array(z.string()),
  muted: z.record(z.array(z.string())),
  saved: z.record(z.array(z.string())).default({}),
});
export type CircleState = z.infer<typeof circleSchema>;
export type CirclePost = CircleState["posts"][number];
export type CircleReply = CircleState["replies"][number];
export type CircleReportReason = CircleState["reports"][number]["reason"];
export function makeCircleSeed(): CircleState {
  const now = Date.now();
  const at = new Date(now).toISOString();
  const ago = (h: number) => new Date(now - h * 3_600_000).toISOString();
  const post = (id: string, authorId: string, topic: CirclePost["topic"], need: CirclePost["need"], title: string, body: string, h: number): CirclePost => ({
    id, authorId, topic, need, title, body, sensitive: false, status: "approved",
    reviewNote: "Illustrative supportive conversation.", createdAt: ago(h), demo: true,
  });
  const reply = (id: string, postId: string, authorId: string, body: string, h: number): CircleReply => ({
    id, postId, authorId, body, status: "approved", reviewNote: "Illustrative supportive response.", createdAt: ago(h), demo: true,
  });
  return {
    joined: [],
    muted: {},
    saved: {},
    reports: [],
    posts: [
      {
        id: "circle-body",
        authorId: "sample-moon",
        topic: "body",
        need: "listening",
        title: "Does anyone else feel awkward asking for a break?",
        body: "When my period makes a long day difficult, I feel guilty asking to slow down. I’m not looking for a diagnosis or treatment — I’d just like to hear how others ask for a little space.",
        sensitive: false,
        status: "approved",
        reviewNote: "Illustrative supportive conversation.",
        createdAt: at,
        demo: true,
      },
      {
        id: "circle-boundary",
        authorId: "sample-fern",
        topic: "boundaries",
        need: "suggestions",
        title: "Learning to say no without a long explanation",
        body: "I’m practising telling people when I’m uncomfortable instead of laughing it off. What are some gentle, clear phrases you use when you want a boundary respected?",
        sensitive: true,
        status: "approved",
        reviewNote: "Illustrative supportive conversation.",
        createdAt: at,
        demo: true,
      },
      {
        id: "circle-campus",
        authorId: "sample-sun",
        topic: "campus",
        need: "resources",
        title: "Finding my feet in a new city",
        body: "I’m new to living away from home. I’d love ideas for planning a first solo journey and finding the right support services before I need them.",
        sensitive: false,
        status: "approved",
        reviewNote: "Illustrative supportive conversation.",
        createdAt: at,
        demo: true,
      },
      post("circle-late-class", "sample-river", "campus", "suggestions", "Walking back after a late lab", "My lab ends at 9 and the walk to the hostel is quiet. What small habits help you feel more settled on the way back?", 5),
      post("circle-tired", "sample-lotus", "feelings", "listening", "Exam week and I feel stretched thin", "Not looking for fixes, just want to say it out loud: I’m tired and a bit overwhelmed. Anyone else in the same week?", 9),
      post("circle-cramps", "sample-lotus", "body", "suggestions", "What’s in your long-day comfort kit?", "I have back-to-back classes on day one of my period. What small things do you carry that make it easier? Not looking for medicine advice, just everyday comfort.", 14),
      post("circle-group-chat", "sample-river", "boundaries", "listening", "Left a group chat and feel weird about it", "The jokes kept going too far, so I left. I don’t regret it, but I feel a bit awkward seeing them in class. Just needed to say it.", 26),
      post("circle-one-word", "sample-ivy", "feelings", "listening", "One word for today?", "Mine is ‘foggy’. Drop yours, no explanation needed.", 3),
      post("circle-cab", "sample-ivy", "campus", "suggestions", "Sharing ride details without making it awkward", "How do you tell a friend you’re in a cab and want them to keep an eye out, without it sounding dramatic?", 20),
    ],
    replies: [
      reply("circle-r9", "circle-cramps", "sample-fern", "A hot water bottle that fits in my bag, a spare pair of socks and a snack I actually like. Small but it helps.", 12),
      reply("circle-r10", "circle-cramps", "sample-sun", "Comfy layers and a water bottle. And I tell one friend so I don’t have to explain twice.", 11),
      reply("circle-r11", "circle-group-chat", "sample-moon", "That took courage. Feeling awkward doesn’t mean you did something wrong.", 24),
      reply("circle-r12", "circle-one-word", "sample-river", "Hopeful.", 2),
      reply("circle-r13", "circle-one-word", "sample-lotus", "Sleepy 😴", 2),
      reply("circle-r14", "circle-one-word", "sample-sun", "Proud — finished my assignment!", 1),
      reply("circle-r2", "circle-late-class", "sample-ivy", "I walk with a friend from the next lab when I can, and I text my roommate when I leave. It’s a small thing but it helps.", 4),
      reply("circle-r3", "circle-late-class", "sample-sun", "Our campus has a late-evening shuttle. Worth asking the student office if yours does too.", 3),
      reply("circle-r4", "circle-tired", "sample-fern", "Same week here. You’re allowed to be tired. Sending you a quiet evening.", 8),
      reply("circle-r5", "circle-tired", "sample-river", "Hearing you. Hope you get some proper sleep tonight.", 6),
      reply("circle-r6", "circle-cab", "sample-lotus", "I just send ‘In a cab, here’s the plate, home in 20’ — friends got used to it fast and now they do it too.", 18),
      reply("circle-r7", "circle-body", "sample-fern", "I just say ‘I need ten minutes, I’ll be right back.’ Nobody has ever asked for more than that.", 2),
      reply("circle-r8", "circle-cab", "sample-moon", "Save your college helpline and a friend’s number before day one. Future-you will thank you.", 1),
      {
        id: "circle-reply-1",
        postId: "circle-boundary",
        authorId: "sample-moon",
        body: "You don’t have to make your discomfort smaller for someone else. Would a phrase like ‘I’m not comfortable with that’ feel right for you?",
        status: "approved",
        reviewNote: "Illustrative supportive response.",
        createdAt: at,
        demo: true,
      },
    ],
  };
}
export function circleAlias(id: string): string {
  let n = 0;
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return `${["Amber", "Fern", "Cedar", "Moon", "Willow", "Marigold"][n % 6]} ${10 + (n % 80)}`;
}
export function circleReviewHints(text: string): string[] {
  const hints: string[] = [];
  if (/https?:\/\/|\bwww\.|\b(?:news|viral|confirmed|everyone knows|rape case)\b/i.test(text))
    hints.push("Check external claims and sources; personal experiences do not require proof.");
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){8,}/i.test(text))
    hints.push("Possible contact details: remove identifying information before approval.");
  if (/\b(?:dosage|cure|take .*mg|guaranteed|diagnos)\w*/i.test(text))
    hints.push("Possible medical claim: peer support must not prescribe or diagnose.");
  return hints;
}
export function circleVisiblePosts(circle: CircleState, viewer: string): CirclePost[] {
  return circle.posts.filter(
    (p) => p.status === "approved" && !circle.muted[viewer]?.includes(p.authorId),
  );
}
export function circleVisibleReplies(
  circle: CircleState,
  postId: string,
  viewer: string,
): CircleReply[] {
  if (!circleVisiblePosts(circle, viewer).some((p) => p.id === postId)) return [];
  return circle.replies.filter(
    (r) =>
      r.postId === postId && r.status === "approved" && !circle.muted[viewer]?.includes(r.authorId),
  );
}
