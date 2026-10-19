import { useInView } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  HeartHandshake,
  ArrowUpRight,
  Flag,
  Leaf,
  Sprout,
  Compass,
  CloudMoon,
  HandHeart,
  MessageCircle,
  Bookmark,
  Search,
  ChevronDown,
  Heart,
  Sparkles,
  Moon,
} from "lucide-react";
import { toast } from "sonner";
import { inkSplash } from "@/lib/cocoon/splash";
import { CircleAvatar } from "@/components/cocoon/CircleAvatar";
import { LocalDate } from "@/components/cocoon/LocalDate";
import { GirlFigure } from "@/components/cocoon/GirlFigure";
import { useDemoState } from "@/lib/cocoon/store";
import {
  CIRCLE_TOPICS,
  CIRCLE_NEEDS,
  circleAlias,
  circleVisiblePosts,
  circleVisibleReplies,
  type CirclePost,
  type CircleReportReason,
} from "@/lib/cocoon/circle";
import {
  joinCircle,
  submitCirclePost,
  submitCircleReply,
  withdrawCircleMessage,
  reportCircleMessage,
  muteCircleAuthor,
  toggleCircleSave,
} from "@/lib/cocoon/actions";
export const Route = createFileRoute("/circle")({
  head: () => ({
    meta: [
      { title: "The Circle · Cocoon" },
      {
        name: "description",
        content:
          "A women-centered peer-support prototype with thoughtful conversations, consent-led replies and review before publishing.",
      },
      { property: "og:title", content: "The Circle · Cocoon" },
      {
        property: "og:description",
        content:
          "A women-centered peer-support prototype with thoughtful conversations, consent-led replies and review before publishing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CirclePage,
});
function attempt(action: () => void) {
  try {
    action();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Please try again.");
  }
}
function CirclePage() {
  const s = useDemoState();
  const viewer = s.actorIds[s.role];
  const joined = s.role === "traveller" && s.circle.joined.includes(viewer);
  const [joinOpen, setJoinOpen] = useState(false);
  const portrait = useRef<HTMLDivElement>(null);
  const portraitVisible = useInView(portrait);
  const reduced = useReducedMotion();
  const [agreed, setAgreed] = useState(false);
  const [view, setView] = useState<"circle" | "mine">("circle");
  const [topic, setTopic] = useState("all");
  const [search, setSearch] = useState("");
  const [author, setAuthor] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState("recent");
  const [writing, setWriting] = useState(false);
  const [editing, setEditing] = useState<CirclePost | null>(null);
  const visiblePosts = circleVisiblePosts(s.circle, viewer);
  const saved = s.circle.saved[viewer] ?? [];
  const posts = visiblePosts
    .filter(
      (p) =>
        (topic === "all" || p.topic === topic) &&
        (!author || p.authorId === author) &&
        (!savedOnly || saved.includes(p.id)) &&
        `${p.title} ${p.sensitive ? "" : p.body}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => {
      const activity = (p: CirclePost) =>
        sort === "active"
          ? Math.max(
              Date.parse(p.createdAt),
              ...circleVisibleReplies(s.circle, p.id, viewer).map((r) => Date.parse(r.createdAt)),
            )
          : Date.parse(p.createdAt);
      return activity(b) - activity(a) || a.id.localeCompare(b.id);
    });
  const mine = [
    ...s.circle.posts.filter((p) => p.authorId === viewer).map((p) => ({ ...p, isPost: true })),
    ...s.circle.replies
      .filter((r) => r.authorId === viewer)
      .map((r) => ({ ...r, title: "Your reply", isPost: false })),
  ];
  return (
    <div className="circle-page circle-social">
      <section className="circle-hero" aria-labelledby="circle-title">
        <div>
          <span className="eyebrow">THE CIRCLE / LESS NOISE. MORE CONNECTION.</span>
          <h1 id="circle-title">
            YOUR PEOPLE.
            <br />
            <em>YOUR CIRCLE.</em>
          </h1>
          <p>Real conversations start with being heard.</p>
          <a href="#circle-conversations">
            STEP INTO THE CIRCLE <ArrowUpRight size={18} />
          </a>
        </div>
        <div ref={portrait} className="circle-portrait" aria-hidden="true">
          <div className="circle-orbit orbit-one">a little company ✳</div>
          <div className="circle-orbit orbit-two">you can start small ↗</div>
          <span>YOU BELONG.</span>
          <svg viewBox="250 130 470 630">
            <circle cx="470" cy="410" r="220" fill="#e7c17b" />
            <GirlFigure active={portraitVisible && !reduced} />
          </svg>
        </div>
      </section>
      <details className="circle-demo-note">
        <summary>Demo Circle · fictional conversations · privacy & care</summary>
        <p>
          <strong>Local community prototype · no real members or moderators are connected.</strong>{" "}
          Sample conversations are fictional. Your drafts and demo reviews stay in this browser’s
          shared demo storage; they are not confidential or end-to-end encrypted. Do not enter real
          identifying or highly sensitive information.
        </p>
      </details>
      <div className="circle-community-bar">
        <div>
          <strong>c / circle</strong>
          <span>Women-centered peer support · adult demo</span>
        </div>
        <a href="#circle-conversations">Browse conversations ↓</a>
      </div>
      <div className="circle-stories" aria-label="People in the demo Circle (fictional)">
        {Array.from(new Set(visiblePosts.map((p) => p.authorId)))
          .slice(0, 10)
          .map((id, i) => (
            <button
              key={id}
              type="button"
              className="circle-story"
              aria-pressed={author === id}
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => {
                setView("circle");
                setAuthor(author === id ? null : id);
                document
                  .getElementById("circle-conversations")
                  ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
              }}
            >
              <span className="circle-story-ring">
                <CircleAvatar id={id} size={58} />
              </span>
              <small>{circleAlias(id)}</small>
            </button>
          ))}
      </div>
      <div className="circle-rooms" role="group" aria-label="Conversation rooms">
        {Object.entries(CIRCLE_TOPICS).map(([key, label], i) => {
          const Icon = [Sprout, HandHeart, Compass, CloudMoon][i]!;
          return (
            <button
              key={key}
              aria-pressed={topic === key}
              onClick={() => {
                setTopic(topic === key ? "all" : key);
                setView("circle");
              }}
            >
              <span>
                <Icon size={28} />
                <small>{visiblePosts.filter((p) => p.topic === key).length}</small>
              </span>
              <strong>{label}</strong>
              <em>Explore the room ↗</em>
            </button>
          );
        })}
      </div>
      {topic !== "all" && topic in ROOMS && (
        <RoomBanner
          topic={topic as keyof typeof ROOMS}
          authors={Array.from(
            new Set(visiblePosts.filter((p) => p.topic === topic).map((p) => p.authorId)),
          )}
          count={visiblePosts.filter((p) => p.topic === topic).length}
          onClose={() => setTopic("all")}
        />
      )}
      <div className="circle-compose-invitation">
        <CircleAvatar id={viewer} size={44} />
        <button
          disabled={s.role !== "traveller"}
          onClick={() => {
            if (joined) {
              setEditing(null);
              setWriting(true);
            } else setJoinOpen(true);
            document
              .getElementById(joined ? "circle-conversations" : "circle-join")
              ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
          }}
        >
          {joined
            ? "What’s on your mind? Start a thoughtful conversation…"
            : "Your voice has a place here. Join the demo Circle…"}
        </button>
        <MessageCircle aria-hidden="true" size={21} />
      </div>
      <div className="circle-layout">
        <div>
          {!joined && (
            <details
              id="circle-join"
              className="circle-welcome"
              open={joinOpen}
              onToggle={(e) => setJoinOpen(e.currentTarget.open)}
            >
              <summary>Make yourself at home · join the demo Circle</summary>
              <HeartHandshake size={25} />
              <h2>A women-centered space, built around care.</h2>
              <p>
                Browse the examples freely. Contributing is an adult (18+) pilot: use a display
                alias, share only what feels comfortable, and respect the support someone asks for.
                This demo does not verify age, gender or identity.
              </p>
              {s.role === "traveller" ? (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />{" "}
                    Use an adult demo persona and follow the Circle’s care guidelines.
                  </label>
                  <button
                    disabled={!agreed}
                    onClick={() => {
                      if (joinCircle(agreed)) toast("You can now try the local conversation flow.");
                    }}
                  >
                    Try the Circle
                  </button>
                </>
              ) : (
                <p>
                  Choose the Traveller demo role to try contributing. Moderators review in the
                  moderation console.
                </p>
              )}
            </details>
          )}
          <section
            id="circle-conversations"
            className="circle-conversations"
            aria-labelledby="conversation-title"
          >
            <div className="circle-section-heading">
              <div>
                <span className="eyebrow">A slower kind of conversation</span>
                <h2 id="conversation-title">
                  {savedOnly ? "YOUR SAVED THREADS." : "THE CONVERSATION FEED."}
                </h2>
              </div>
              {joined && (
                <button
                  onClick={() => {
                    setEditing(null);
                    setWriting(!writing);
                  }}
                >
                  {" "}
                  {writing ? "Close draft" : "Start a conversation"}
                </button>
              )}
            </div>
            {writing && joined && (
              <CircleComposer
                key={editing?.id ?? "new"}
                editing={editing}
                onDone={() => {
                  setWriting(false);
                  setEditing(null);
                  setView("mine");
                }}
              />
            )}
            <div className="circle-view-controls">
              <button aria-pressed={view === "circle"} onClick={() => setView("circle")}>
                Conversations
              </button>
              {joined && (
                <button aria-pressed={view === "mine"} onClick={() => setView("mine")}>
                  My contributions
                </button>
              )}
              <label>
                Topic{" "}
                <select
                  aria-label="Conversation topic filter"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option value="all">All topics</option>
                  {Object.entries(CIRCLE_TOPICS).map(([key, text]) => (
                    <option key={key} value={key}>
                      {text}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="circle-feed-toolbar">
              <label className="circle-search">
                <Search size={17} />
                <input
                  aria-label="Search conversations"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <select
                aria-label="Sort conversations"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recent">Newest first</option>
                <option value="active">Latest replies</option>
              </select>
              <button
                aria-pressed={savedOnly}
                onClick={() => {
                  setSavedOnly(!savedOnly);
                  setView("circle");
                }}
              >
                <Bookmark size={15} />
                {savedOnly ? "Show all" : "Saved"} ·{" "}
                {visiblePosts.filter((p) => saved.includes(p.id)).length}
              </button>
            </div>
            {author && (
              <button type="button" className="circle-author-chip" onClick={() => setAuthor(null)}>
                <CircleAvatar id={author} size={22} /> Showing {circleAlias(author)} · clear ✕
              </button>
            )}
            <p className="circle-feed-count" aria-live="polite">
              {posts.length} visible {posts.length === 1 ? "conversation" : "conversations"}
              {topic !== "all" ? ` in ${CIRCLE_TOPICS[topic as keyof typeof CIRCLE_TOPICS]}` : ""} ·
              local demo
            </p>
            {view === "circle" ? (
              <>
                {!posts.length && (
                  <p className="circle-empty">
                    No visible conversations in this topic. You can choose another topic or begin
                    one for review.
                  </p>
                )}
                {posts.map((post) => (
                  <Conversation
                    key={post.id}
                    post={post}
                    viewer={viewer}
                    joined={joined}
                    saved={saved.includes(post.id)}
                    onJoin={() => {
                      setJoinOpen(true);
                      document.getElementById("circle-join")?.scrollIntoView({
                        behavior: reduced ? "instant" : "smooth",
                        block: "start",
                      });
                    }}
                  />
                ))}
              </>
            ) : (
              <div className="circle-own-list">
                <p className="text-sm">
                  Only your own pending, returned or withdrawn contributions appear here. Approval
                  checks conduct and privacy; it does not establish that an experience or claim is
                  factually verified.
                </p>
                {!mine.length && (
                  <p className="circle-empty">
                    Your first contribution will appear here, with its review status.
                  </p>
                )}
                {mine.map((item) => (
                  <article key={item.id}>
                    <span className="circle-status">
                      {item.status === "pending"
                        ? "Awaiting demo review"
                        : item.status === "changes"
                          ? "Changes requested"
                          : item.status === "withdrawn"
                            ? "Withdrawn"
                            : "Approved in demo"}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                    <p className="circle-review-note">{item.reviewNote}</p>
                    {!item.isPost && (
                      <details className="circle-replies">
                        <summary>Edit your reply & submit for review</summary>
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            const form = event.currentTarget;
                            const text = String(new FormData(form).get("revision") ?? "");
                            attempt(() => {
                              const reply = s.circle.replies.find((r) => r.id === item.id);
                              if (reply) {
                                submitCircleReply(reply.postId, text, reply.id);
                                toast("Revised reply returned to review.");
                              }
                            });
                          }}
                        >
                          <label>
                            Your revised reply
                            <textarea
                              name="revision"
                              defaultValue={item.body}
                              minLength={8}
                              maxLength={1500}
                              required
                              rows={3}
                            />
                          </label>
                          <button type="submit">Submit revised reply</button>
                        </form>
                      </details>
                    )}
                    <div className="flex flex-wrap gap-4">
                      {item.isPost && (
                        <button
                          onClick={() => {
                            setEditing(s.circle.posts.find((p) => p.id === item.id) ?? null);
                            setWriting(true);
                          }}
                        >
                          Edit & submit for review
                        </button>
                      )}
                      <button
                        onClick={() =>
                          attempt(() => withdrawCircleMessage(item.id, item.status === "withdrawn"))
                        }
                      >
                        {item.status === "withdrawn"
                          ? "Restore to review queue"
                          : "Withdraw contribution"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          {joined && (s.circle.muted[viewer]?.length ?? 0) > 0 && (
            <details className="circle-hidden">
              <summary>Authors you’ve hidden</summary>
              {s.circle.muted[viewer]?.map((id) => (
                <p key={id}>
                  {circleAlias(id)}{" "}
                  <button onClick={() => muteCircleAuthor(id, true)}>Show author again</button>
                </p>
              ))}
            </details>
          )}
        </div>
        <aside className="circle-guidelines" aria-labelledby="circle-care-title">
          <Leaf size={25} />
          <h2 id="circle-care-title">CARE IS THE CULTURE.</h2>
          <div className="circle-side-prompt">
            <span className="eyebrow">A conversation can start small</span>
            <p>“Would you like company, listening, or ideas?”</p>
            <small>Let someone choose the kind of support they want.</small>
          </div>
          <details className="circle-care-details">
            <summary>Open our care guidelines</summary>
            <ol>
              <li>
                <strong>Listen before advising.</strong> Respect “just listen.” No mocking,
                victim-blaming, harassment or sexualised replies.
              </li>
              <li>
                <strong>Keep people private.</strong> No names of other people, phone numbers, exact
                locations, screenshots or requests to move to private messages.
              </li>
              <li>
                <strong>Experience isn’t a headline.</strong> Share your own feelings and
                experiences. News, accusations about named people and forwarded claims belong in
                sourced reporting, not peer-support threads.
              </li>
              <li>
                <strong>Support, not diagnosis.</strong> No treatment instructions, medication
                dosages or miracle cures. Help someone find a qualified professional.
              </li>
              <li>
                <strong>Review before publishing.</strong> Every post and reply waits for human
                review. You can flag something unkind or hide an author. Nothing here guarantees
                safety or confidentiality.
              </li>
            </ol>
          </details>
          <a href="/reports#news">Read sourced news separately ↗</a>
          <Link to="/learn">Explore consent & body safety ↗</Link>
          <Link to="/kit">Find help & useful contacts ↗</Link>
          <p>
            Not an emergency or crisis-response service. In immediate danger, contact your local
            emergency service.
          </p>
        </aside>
      </div>
    </div>
  );
}
function CircleComposer({ editing, onDone }: { editing: CirclePost | null; onDone: () => void }) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [topic, setTopic] = useState<CirclePost["topic"]>(editing?.topic ?? "feelings");
  const [need, setNeed] = useState<CirclePost["need"]>(editing?.need ?? "listening");
  const [sensitive, setSensitive] = useState(editing?.sensitive ?? false);
  return (
    <form
      className="circle-composer"
      onSubmit={(e) => {
        e.preventDefault();
        const btn = (e.nativeEvent as SubmitEvent).submitter ?? e.currentTarget;
        attempt(() => {
          submitCirclePost({ title, body, topic, need, sensitive }, editing?.id);
          inkSplash(btn);
          toast("Submitted to the local review queue. It is not public yet.");
          onDone();
        });
      }}
    >
      <h3>{editing ? "Make room for a revision." : "What’s on your mind?"}</h3>
      <p>
        Write in your own words. Share feelings and firsthand experiences; leave names, identifying
        details and forwarded news out.
      </p>
      <label>
        Topic
        <select value={topic} onChange={(e) => setTopic(e.target.value as CirclePost["topic"])}>
          {Object.entries(CIRCLE_TOPICS).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label>
        What would help right now?
        <select value={need} onChange={(e) => setNeed(e.target.value as CirclePost["need"])}>
          {Object.entries(CIRCLE_NEEDS).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      </label>
      <label>
        A gentle title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          minLength={8}
          maxLength={100}
          required
        />
      </label>
      <label>
        Your words
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          minLength={8}
          maxLength={1500}
          rows={5}
          required
        />
      </label>
      <span className="text-xs text-muted-foreground">
        {body.length}/1,500 · your display alias is separate from your demo profile name
      </span>
      <label className="circle-check">
        <input
          type="checkbox"
          checked={sensitive}
          onChange={(e) => setSensitive(e.target.checked)}
        />{" "}
        Add a sensitive-content notice so readers can choose when to open it.
      </label>
      <button type="submit">Submit for review</button>
      <p className="text-xs">
        Nothing publishes automatically. This local demo has no staffed review queue or promised
        response time.
      </p>
    </form>
  );
}
function Conversation({
  post,
  viewer,
  joined,
  saved,
  onJoin,
}: {
  post: CirclePost;
  viewer: string;
  joined: boolean;
  saved: boolean;
  onJoin: () => void;
}) {
  const s = useDemoState();
  const [opened, setOpened] = useState(!post.sensitive);
  const [body, setBody] = useState("");
  const [threadOpen, setThreadOpen] = useState(false);
  const replies = circleVisibleReplies(s.circle, post.id, viewer);
  return (
    <article className="circle-conversation" data-topic={post.topic} data-expanded={threadOpen}>
      <div className="circle-post-meta">
        <span className="circle-feed-author">
          <CircleAvatar id={post.authorId} size={46} />
          <span className="circle-feed-name">
            <strong>{circleAlias(post.authorId)}</strong>
            <small>@{circleAlias(post.authorId).toLowerCase().replace(" ", "")}</small>
          </span>
        </span>
        <span>{CIRCLE_TOPICS[post.topic]}</span>
        <span>{post.demo ? "Fictional example" : "Local demo contribution"}</span>
        <LocalDate iso={post.createdAt} />
      </div>
      <h3>{post.title}</h3>
      <span className="circle-need">{CIRCLE_NEEDS[post.need]}</span>
      {!opened ? (
        <div className="circle-content-note">
          <p>Content note: boundaries or a sensitive personal experience.</p>
          <button onClick={() => setOpened(true)}>Read when ready</button>
        </div>
      ) : (
        <>
          <p className="circle-post-body">{post.body}</p>
          {post.sensitive && (
            <button className="circle-text-button" onClick={() => setOpened(false)}>
              Close sensitive content
            </button>
          )}
          {replies[0] && !threadOpen && (
            <div className="circle-reply-preview">
              <CircleAvatar id={replies[0].authorId} size={30} />
              <p>
                <strong>{circleAlias(replies[0].authorId)}</strong>
                {replies[0].body.slice(0, 140)}
                {replies[0].body.length > 140 ? "…" : ""}
              </p>
            </div>
          )}
          <Reactions />
          <p className="circle-standard">Peer support · conduct review is not fact verification</p>
          <div className="circle-thread-actions">
            <button onClick={() => setThreadOpen(!threadOpen)} aria-expanded={threadOpen}>
              <MessageCircle size={16} />
              {replies.length} {replies.length === 1 ? "reply" : "replies"} ·{" "}
              {threadOpen ? "Close thread" : "Join the conversation"}
              <ChevronDown size={14} />
            </button>
            <button
              disabled={s.role !== "traveller"}
              aria-pressed={saved}
              onClick={() => attempt(() => toggleCircleSave(post.id))}
            >
              <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save"}
            </button>
          </div>
          <MessageOptions id={post.id} authorId={post.authorId} viewer={viewer} joined={joined} />
          <details
            className="circle-replies"
            open={threadOpen}
            onToggle={(e) => setThreadOpen(e.currentTarget.open)}
          >
            <summary>
              <MessageCircle size={17} />
              {replies.length} thoughtful {replies.length === 1 ? "reply" : "replies"} · open the
              conversation
            </summary>
            {!replies.length && (
              <p className="text-sm py-4">
                No approved replies yet. A thoughtful response is welcome.
              </p>
            )}
            {replies.map((reply) => (
              <div key={reply.id} className="circle-reply circle-bubble-row">
                <CircleAvatar id={reply.authorId} size={34} />
                <div className="circle-bubble">
                  <span>
                    <strong>{circleAlias(reply.authorId)}</strong> ·{" "}
                    {reply.demo ? "fictional example" : "demo-reviewed reply"}
                  </span>
                  <p>{reply.body}</p>
                </div>
                <MessageOptions
                  id={reply.id}
                  authorId={reply.authorId}
                  viewer={viewer}
                  joined={joined}
                />
              </div>
            ))}
            {joined && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const btn = (e.nativeEvent as SubmitEvent).submitter ?? e.currentTarget;
                  attempt(() => {
                    submitCircleReply(post.id, body);
                    inkSplash(btn);
                    setBody("");
                    toast("Reply awaiting demo review. See My contributions.");
                  });
                }}
              >
                <label>
                  Reply with care
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    minLength={8}
                    maxLength={1500}
                    rows={3}
                    placeholder={
                      post.need === "listening"
                        ? "Listen and acknowledge; avoid unsolicited advice."
                        : "Share a gentle suggestion, not a diagnosis or instruction."
                    }
                  />
                </label>
                <button
                  type="button"
                  className="circle-text-button"
                  onClick={() =>
                    setBody(
                      "Thank you for sharing this. I hear you, and you deserve to have your feelings taken seriously.",
                    )
                  }
                >
                  Start with an acknowledgement
                </button>
                <button type="submit">Send reply for review</button>
              </form>
            )}
            {!joined && (
              <p className="circle-thread-join">
                Want to add your voice?{" "}
                <button type="button" onClick={onJoin}>
                  Join the demo Circle to reply ↗
                </button>{" "}
                Every reply goes through review.
              </p>
            )}
          </details>
        </>
      )}
    </article>
  );
}
function MessageOptions({
  id,
  authorId,
  viewer,
  joined,
}: {
  id: string;
  authorId: string;
  viewer: string;
  joined: boolean;
}) {
  const [reason, setReason] = useState<CircleReportReason>("unkind");
  if (!joined || authorId === viewer) return null;
  return (
    <details className="circle-options">
      <summary>Conversation controls</summary>
      <label>
        Reason for reporting
        <select
          aria-label={`Report reason ${id}`}
          value={reason}
          onChange={(e) => setReason(e.target.value as CircleReportReason)}
        >
          <option value="unkind">Mockery, harassment or blame</option>
          <option value="rumor">Rumour or unsupported public claim</option>
          <option value="privacy">Identifying or private information</option>
          <option value="medical">Unsafe medical claim</option>
          <option value="other">Another concern</option>
        </select>
      </label>
      <button
        onClick={() =>
          attempt(() => {
            if (reportCircleMessage(id, reason))
              toast("Returned to the local review queue and hidden from conversations.");
          })
        }
      >
        <Flag size={13} /> Flag for review
      </button>
      <button
        onClick={() =>
          attempt(() => {
            muteCircleAuthor(authorId);
            toast("Author hidden from your view. You can undo this below the conversations.");
          })
        }
      >
        Hide this author
      </button>
    </details>
  );
}

const REACTIONS = [
  ["with", Heart, "With you"],
  ["same", Sparkles, "Same here"],
  ["calm", Moon, "Sending calm"],
] as const;
/** Gentle reactions, kept on this screen only — no counts, nothing stored or shown to others. */
function Reactions() {
  const [on, setOn] = useState<string | null>(null);
  return (
    <div className="circle-reactions" role="group" aria-label="React (only on your screen)">
      {REACTIONS.map(([k, Icon, label]) => (
        <button
          key={k}
          type="button"
          aria-pressed={on === k}
          onClick={() => setOn(on === k ? null : k)}
        >
          <Icon size={15} aria-hidden="true" fill={on === k ? "currentColor" : "none"} /> {label}
        </button>
      ))}
    </div>
  );
}

const ROOMS = {
  body: {
    tag: "Periods & body",
    line: "Cramps, cycles, tiredness and the awkward bits — talked about plainly.",
    tip: "Share what helps you, not what someone else should take. Medical questions belong with a doctor.",
    prompts: [
      "How do you ask for a break?",
      "Your comfort kit for long days",
      "Explaining it to a teacher or boss",
    ],
    motif: "body",
  },
  boundaries: {
    tag: "Boundaries & relationships",
    line: "Saying no, noticing pressure, and keeping the people who respect you.",
    tip: "A boundary doesn’t need a long explanation. Replies here suggest, they don’t instruct.",
    prompts: [
      "Short ways to say no",
      "When a friend crosses a line",
      "Pressure online vs in person",
    ],
    motif: "boundaries",
  },
  campus: {
    tag: "Travel & campus life",
    line: "Late labs, new cities, first solo trips and getting home settled.",
    tip: "Keep places general. Never post someone’s exact address, hostel room or live location here.",
    prompts: [
      "Your late-walk habits",
      "Ride sharing without awkwardness",
      "First week in a new city",
    ],
    motif: "campus",
  },
  feelings: {
    tag: "How I’m feeling",
    line: "A soft place to say it out loud. Listening first, fixing later (or never).",
    tip: "If someone says ‘just listen’, listen. If you’re in danger, use SOS or local emergency numbers.",
    prompts: ["One word for today", "Something small that helped", "Exam-week check-in"],
    motif: "feelings",
  },
} as const;

function RoomMotif({ kind }: { kind: string }) {
  return (
    <svg className="room-motif" viewBox="0 0 200 140" aria-hidden="true">
      {kind === "body" && (
        <g>
          <circle cx="100" cy="70" r="46" className="rm-a" />
          <path d="M100 38c14 18 22 30 22 42a22 22 0 0 1-44 0c0-12 8-24 22-42z" className="rm-b" />
          <circle cx="60" cy="30" r="6" className="rm-c" />
          <circle cx="150" cy="110" r="8" className="rm-c" />
        </g>
      )}
      {kind === "boundaries" && (
        <g>
          <circle cx="78" cy="70" r="40" className="rm-a" />
          <circle cx="122" cy="70" r="40" className="rm-b" />
          <path d="M100 30v80" className="rm-line" />
        </g>
      )}
      {kind === "campus" && (
        <g>
          <path d="M20 120 C60 90 90 110 120 80 S170 50 190 30" className="rm-road" />
          <rect x="40" y="56" width="34" height="44" rx="4" className="rm-a" />
          <rect x="120" y="40" width="40" height="52" rx="4" className="rm-b" />
          <circle cx="186" cy="30" r="9" className="rm-c" />
        </g>
      )}
      {kind === "feelings" && (
        <g>
          <path
            d="M100 116C56 88 40 62 56 44c12-13 32-10 44 8 12-18 32-21 44-8 16 18 0 44-44 72z"
            className="rm-b"
          />
          <circle cx="44" cy="100" r="7" className="rm-c" />
          <circle cx="160" cy="28" r="10" className="rm-a" />
        </g>
      )}
    </svg>
  );
}

function RoomBanner({
  topic,
  authors,
  count,
  onClose,
}: {
  topic: keyof typeof ROOMS;
  authors: string[];
  count: number;
  onClose: () => void;
}) {
  const r = ROOMS[topic];
  return (
    <section className="room-banner" data-room={topic} aria-label={`${r.tag} room`} key={topic}>
      <RoomMotif kind={r.motif} />
      <div className="room-banner-text">
        <p className="room-banner-eyebrow">Room · demo community</p>
        <h3>{r.tag}</h3>
        <p>{r.line}</p>
        <div className="room-banner-members">
          {authors.slice(0, 6).map((id, i) => (
            <span key={id} style={{ zIndex: 10 - i }}>
              <CircleAvatar id={id} size={34} />
            </span>
          ))}
          <small>
            {count} {count === 1 ? "conversation" : "conversations"} · fictional members
          </small>
        </div>
        <p className="room-banner-tip">
          <strong>Room note:</strong> {r.tip}
        </p>
        <div className="room-banner-prompts">
          {r.prompts.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="room-banner-close"
        onClick={onClose}
        aria-label="Back to all rooms"
      >
        ✕
      </button>
    </section>
  );
}
