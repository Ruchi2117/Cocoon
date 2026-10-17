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
  const at = new Date().toISOString();
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
    ],
    replies: [
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
