import { useInView, useReducedMotion } from "motion/react";
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
} from "lucide-react";
import { toast } from "sonner";
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
      <div className="circle-compose-invitation">
        <span className="circle-avatar" aria-hidden="true">
          {circleAlias(viewer).slice(0, 1)}
        </span>
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
        attempt(() => {
          submitCirclePost({ title, body, topic, need, sensitive }, editing?.id);
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
          <i className={`circle-avatar avatar-${post.topic}`} aria-hidden="true">
            {circleAlias(post.authorId).slice(0, 1)}
          </i>
          {circleAlias(post.authorId)}
        </span>
        <span>{CIRCLE_TOPICS[post.topic]}</span>
        <span>{post.demo ? "Fictional example" : "Local demo contribution"}</span>
        <time dateTime={post.createdAt}>
          {new Date(post.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </time>
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
              <span className="circle-avatar" aria-hidden="true">
                {circleAlias(replies[0].authorId).slice(0, 1)}
              </span>
              <p>
                <strong>{circleAlias(replies[0].authorId)}</strong>
                {replies[0].body.slice(0, 140)}
                {replies[0].body.length > 140 ? "…" : ""}
              </p>
            </div>
          )}
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
              <div key={reply.id} className="circle-reply">
                <span>
                  {circleAlias(reply.authorId)} ·{" "}
                  {reply.demo ? "fictional example" : "demo-reviewed reply"}
                </span>
                <p>{reply.body}</p>
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
                  attempt(() => {
                    submitCircleReply(post.id, body);
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
