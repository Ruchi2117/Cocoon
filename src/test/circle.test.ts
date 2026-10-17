import { beforeEach, describe, expect, it } from "vitest";
import { getState, resetDemo } from "@/lib/cocoon/store";
import {
  joinCircle,
  submitCirclePost,
  submitCircleReply,
  setRole,
  reviewCircleMessage,
  reportCircleMessage,
  muteCircleAuthor,
  withdrawCircleMessage,
  toggleCircleSave,
} from "@/lib/cocoon/actions";
import { circleVisiblePosts, circleVisibleReplies, circleReviewHints } from "@/lib/cocoon/circle";
import { parseSavedDemo } from "@/lib/cocoon/persistence";
const checked = { kindness: true, privacy: true, claims: true, care: true };
const draft = {
  title: "I could use a listening ear",
  body: "I am having a difficult week and would like someone to listen without judging me.",
  topic: "feelings" as const,
  need: "listening" as const,
  sensitive: true,
};
const viewer = "u-ananya";
const approve = (id: string) => {
  setRole("moderator");
  reviewCircleMessage(
    id,
    "approved",
    "Respectful peer experience without identifying details.",
    checked,
  );
  setRole("traveller");
};
beforeEach(() => resetDemo());
describe("Circle care and publication boundary", () => {
  it("saves and unsaves an approved thread without changing its visibility", () => {
    const post = circleVisiblePosts(getState().circle, viewer)[0]!;
    toggleCircleSave(post.id);
    expect(getState().circle.saved[viewer]).toContain(post.id);
    expect(circleVisiblePosts(getState().circle, viewer).some((p) => p.id === post.id)).toBe(true);
    toggleCircleSave(post.id);
    expect(getState().circle.saved[viewer]).not.toContain(post.id);
  });
  it("does not allow bookmarking pending messages or another role", () => {
    joinCircle(true);
    const id = submitCirclePost(draft);
    expect(() => toggleCircleSave(id)).toThrow(/no longer available/);
    setRole("moderator");
    expect(() => toggleCircleSave("circle-body")).toThrow(/Traveller/);
  });
  it("requires an explicit demo agreement and a contributor role", () => {
    expect(joinCircle(false)).toBe(false);
    expect(() => submitCirclePost(draft)).toThrow();
    setRole("guardian");
    expect(joinCircle(true)).toBe(false);
    setRole("traveller");
    expect(joinCircle(true)).toBe(true);
  });
  it("keeps every new post out of the public feed until a complete moderator review", () => {
    joinCircle(true);
    const id = submitCirclePost(draft);
    expect(circleVisiblePosts(getState().circle, viewer).some((p) => p.id === id)).toBe(false);
    expect(() => reviewCircleMessage(id, "approved", "A valid note for review.", checked)).toThrow(
      /moderator/,
    );
    setRole("moderator");
    expect(() =>
      reviewCircleMessage(id, "approved", "A valid note for review.", {
        ...checked,
        privacy: false,
      }),
    ).toThrow(/four review/);
    expect(() => reviewCircleMessage(id, "approved", "ok", checked)).toThrow(/specific review/);
    approve(id);
    expect(circleVisiblePosts(getState().circle, viewer).some((p) => p.id === id)).toBe(true);
  });
  it("holds replies too, and hides all replies if the parent is returned to review", () => {
    joinCircle(true);
    const id = submitCircleReply(
      "circle-campus",
      "Thank you for sharing. I hope you find your own comfortable pace.",
    );
    expect(circleVisibleReplies(getState().circle, "circle-campus", viewer)).toHaveLength(0);
    approve(id);
    expect(circleVisibleReplies(getState().circle, "circle-campus", viewer)).toHaveLength(1);
    expect(reportCircleMessage("circle-campus", "privacy")).toBe(true);
    expect(circleVisibleReplies(getState().circle, "circle-campus", viewer)).toHaveLength(0);
  });
  it("never treats a personal assault disclosure as something requiring proof", () => {
    joinCircle(true);
    const id = submitCirclePost({
      ...draft,
      body: "I was assaulted and froze. I do not want advice or to name anyone. I just want someone to hear me.",
    });
    expect(circleReviewHints(getState().circle.posts.find((p) => p.id === id)!.body)).toEqual([]);
    approve(id);
    expect(getState().circle.posts.find((p) => p.id === id)?.status).toBe("approved");
  });
  it("rejects contact details and flags claim patterns without automatically deciding truth", () => {
    joinCircle(true);
    expect(() =>
      submitCirclePost({ ...draft, body: "Email me at person@example.com to talk about this." }),
    ).toThrow(/identifying/);
    expect(() =>
      submitCircleReply("circle-campus", "Call me at +44 1234 567890 tomorrow."),
    ).toThrow(/identifying/);
    expect(circleReviewHints("This viral news is confirmed https://example.com")).toHaveLength(1);
    expect(circleReviewHints("a guaranteed cure").length).toBeGreaterThan(0);
  });
  it("returns reported content to review without exposing the reporter in the feed", () => {
    joinCircle(true);
    expect(reportCircleMessage("circle-campus", "unkind")).toBe(true);
    expect(
      circleVisiblePosts(getState().circle, viewer).some((p) => p.id === "circle-campus"),
    ).toBe(false);
    expect(reportCircleMessage("circle-campus", "unkind")).toBe(false);
    approve("circle-campus");
    expect(getState().circle.reports[0]?.resolved).toBe(true);
  });
  it("lets a reader hide and restore an author without affecting other readers", () => {
    joinCircle(true);
    muteCircleAuthor("sample-sun");
    expect(
      circleVisiblePosts(getState().circle, viewer).some((p) => p.id === "circle-campus"),
    ).toBe(false);
    expect(
      circleVisiblePosts(getState().circle, "another-reader").some((p) => p.id === "circle-campus"),
    ).toBe(true);
    muteCircleAuthor("sample-sun", true);
    expect(
      circleVisiblePosts(getState().circle, viewer).some((p) => p.id === "circle-campus"),
    ).toBe(true);
  });
  it("re-reviews edits and supports recoverable withdrawal", () => {
    joinCircle(true);
    const id = submitCirclePost(draft);
    approve(id);
    submitCirclePost(
      { ...draft, body: "I have updated my thoughts and still only want a listening ear." },
      id,
    );
    expect(getState().circle.posts.find((p) => p.id === id)?.status).toBe("pending");
    withdrawCircleMessage(id);
    expect(getState().circle.posts.find((p) => p.id === id)?.status).toBe("withdrawn");
    setRole("moderator");
    expect(() =>
      reviewCircleMessage(id, "approved", "Respectful contribution reviewed.", checked),
    ).toThrow(/no longer available/);
    setRole("traveller");
    withdrawCircleMessage(id, true);
    expect(getState().circle.posts.find((p) => p.id === id)?.status).toBe("pending");
  });
  it("returns revision notes to the author and holds a revised reply", () => {
    joinCircle(true);
    const id = submitCircleReply(
      "circle-campus",
      "Here is an initial supportive reply for the conversation.",
    );
    setRole("moderator");
    reviewCircleMessage(
      id,
      "changes",
      "Please respect the request for resources, without unsolicited advice.",
      checked,
    );
    setRole("traveller");
    submitCircleReply(
      "circle-campus",
      "Would the Safety Library or your campus support service be useful to you?",
      id,
    );
    expect(getState().circle.replies.find((r) => r.id === id)?.status).toBe("pending");
    expect(circleVisibleReplies(getState().circle, "circle-campus", viewer)).toHaveLength(0);
  });
  it("adds the Circle to older saves without losing journeys or personal state", () => {
    const old = { ...getState(), circle: undefined };
    const migrated = parseSavedDemo(old);
    expect(migrated?.circle.posts.length).toBeGreaterThan(0);
    expect(migrated?.companion).toEqual(getState().companion);
    expect(parseSavedDemo({ ...getState(), circle: { posts: "corrupt" } })).toBeNull();
  });
});
