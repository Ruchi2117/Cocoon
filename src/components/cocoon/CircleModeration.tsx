import { useState } from "react";
import { toast } from "sonner";
import { useDemoState } from "@/lib/cocoon/store";
import {
  circleAlias,
  circleReviewHints,
  CIRCLE_TOPICS,
  CIRCLE_NEEDS,
  type CirclePost,
  type CircleReply,
} from "@/lib/cocoon/circle";
import { reviewCircleMessage } from "@/lib/cocoon/actions";
export function CircleModeration() {
  const s = useDemoState();
  const queue = [...s.circle.posts, ...s.circle.replies].filter(
    (item) => item.status === "pending",
  );
  return (
    <section className="circle-moderation" aria-labelledby="circle-review-title">
      <h2 id="circle-review-title">Circle · review before publication</h2>
      <p>
        Local moderator simulation, not a staffed service. All posts and replies start here. Review
        conduct, privacy and claims; do not demand evidence for someone’s feelings or personal
        experience. Review is not a truth certificate.
      </p>
      {queue.length === 0 && <p className="circle-empty">No contributions waiting for review.</p>}
      {queue.map((item) => (
        <ReviewItem key={item.id} item={item} />
      ))}
    </section>
  );
}
function ReviewItem({ item }: { item: CirclePost | CircleReply }) {
  const s = useDemoState();
  const [note, setNote] = useState("");
  const [checks, setChecks] = useState({
    kindness: false,
    privacy: false,
    claims: false,
    care: false,
  });
  const hints = circleReviewHints(item.body + ("title" in item ? ` ${item.title}` : ""));
  const parent = "postId" in item ? s.circle.posts.find((p) => p.id === item.postId) : null;
  const reports = s.circle.reports.filter((r) => r.targetId === item.id && !r.resolved);
  const decide = (decision: "approved" | "changes") => {
    try {
      reviewCircleMessage(item.id, decision, note, checks);
      toast(
        decision === "approved"
          ? "Approved in local demo. This does not verify the experience as fact."
          : "Returned to the author with your note.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review failed.");
    }
  };
  return (
    <article className="circle-review-item">
      <span className="eyebrow">
        {circleAlias(item.authorId)} · {"title" in item ? "Post" : "Reply"} · pending
      </span>
      <h3>
        {"title" in item ? item.title : `Reply to: ${parent?.title ?? "Unavailable conversation"}`}
      </h3>
      {"topic" in item && (
        <p className="text-xs">
          {CIRCLE_TOPICS[item.topic]} · {CIRCLE_NEEDS[item.need]}
        </p>
      )}
      {parent && <blockquote>{parent.body}</blockquote>}
      <p className="circle-post-body">{item.body}</p>
      {hints.length > 0 && (
        <div className="circle-review-hints">
          <strong>Attention prompts — pattern matches, not moderation decisions</strong>
          <ul>
            {hints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </div>
      )}
      {reports.map((report) => (
        <p key={report.id} className="text-sm">
          Community report: {report.reason}
        </p>
      ))}
      <fieldset>
        <legend>Before approving, confirm each check</legend>
        {(
          [
            {
              key: "kindness",
              label: "No mockery, harassment, victim-blaming or sexualised responses.",
            },
            {
              key: "privacy",
              label: "No identifying details, named accusations or requests for private contact.",
            },
            {
              key: "claims",
              label:
                "Peer experience/support, without forwarded news or unsupported public claims.",
            },
            {
              key: "care",
              label:
                "Respects the requested support; no diagnosis, dosage or treatment instructions.",
            },
          ] as const
        ).map((check) => (
          <label key={check.key}>
            <input
              type="checkbox"
              checked={checks[check.key]}
              onChange={(e) => setChecks({ ...checks, [check.key]: e.target.checked })}
            />
            {check.label}
          </label>
        ))}
      </fieldset>
      <label>
        Review note for the author
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          minLength={10}
          maxLength={500}
          rows={2}
          placeholder="Explain your decision and any changes needed, without shaming."
        />
      </label>
      <div className="flex flex-wrap gap-4">
        <button
          disabled={
            !Object.values(checks).every(Boolean) ||
            note.trim().length < 10 ||
            (!!parent && parent.status !== "approved")
          }
          onClick={() => decide("approved")}
        >
          Approve for Circle
        </button>
        <button disabled={note.trim().length < 10} onClick={() => decide("changes")}>
          Request changes
        </button>
      </div>
      {parent?.status !== "approved" && parent && (
        <p className="text-xs">The parent conversation must be approved before this reply.</p>
      )}
    </article>
  );
}
