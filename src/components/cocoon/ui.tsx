import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentStatus, RecipientStatus, SafetyReport } from "@/lib/cocoon/types";

export function Pill({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "plum" | "lavender" | "rose" | "coral" | "sage" | "amber";
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    plum: "bg-primary text-primary-foreground",
    lavender: "bg-secondary text-secondary-foreground",
    rose: "bg-rose/40 text-foreground",
    coral: "bg-coral/15 text-coral",
    sage: "bg-sage/15 text-sage",
    amber: "bg-amber/20 text-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const SimLabel = ({ children = "Simulated" }: { children?: ReactNode }) => (
  <Pill tone="amber" className="border border-amber/40">
    ◌ {children}
  </Pill>
);

export const SOURCE_LABEL: Record<SafetyReport["sourceType"], string> = {
  firsthand_review: "Firsthand road review",
  incident_report: "User incident report",
  external_source: "External-style (synthetic sample)",
};
export const CATEGORY_LABEL: Record<SafetyReport["category"], string> = {
  poor_lighting: "Poor lighting",
  harassment: "Harassment",
  deserted_stretch: "Deserted stretch",
  well_lit_busy: "Well lit & busy",
  unsafe_transport: "Transport concern",
  police_presence: "Police presence",
  other: "Other",
};
export const VERIFY_LABEL: Record<SafetyReport["verification"], string> = {
  unverified: "Unverified",
  community_confirmed: "Community-confirmed",
  source_attributed: "Source-attributed",
};
export const INCIDENT_LABEL: Record<IncidentStatus, string> = {
  requested: "Requested",
  notification_pending: "Notification pending",
  notified: "Notified",
  acknowledged: "Acknowledged",
  assistance_in_progress: "Assistance in progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};
export const RECIPIENT_LABEL: Record<RecipientStatus, string> = {
  pending: "Pending",
  delivered: "Delivered · awaiting reply",
  failed: "Delivery failed",
  acknowledged: "Acknowledged",
  accepted: "Accepted",
  declined: "Declined",
  no_response: "No response yet",
};
export const recipientTone = (s: RecipientStatus) =>
  (
    ({
      pending: "muted",
      delivered: "lavender",
      failed: "coral",
      acknowledged: "sage",
      accepted: "sage",
      declined: "muted",
      no_response: "amber",
    }) as const
  )[s];
export const incidentTone = (s: IncidentStatus) =>
  s === "resolved"
    ? "sage"
    : s === "cancelled"
      ? "muted"
      : s === "acknowledged" || s === "assistance_in_progress"
        ? "lavender"
        : "coral";

export function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function ReportCard({
  r,
  children,
}: {
  r: Omit<SafetyReport, "reporterId">;
  children?: ReactNode;
}) {
  return (
    <article className="card-soft field-report p-4">
      <span className="field-report-marker" aria-hidden="true">
        <MapPin size={17} />
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill
          tone={
            r.category === "well_lit_busy" || r.category === "police_presence" ? "sage" : "rose"
          }
        >
          {CATEGORY_LABEL[r.category]}
        </Pill>
        <Pill tone="lavender">{SOURCE_LABEL[r.sourceType]}</Pill>
        <Pill tone={r.verification === "unverified" ? "muted" : "sage"}>
          {VERIFY_LABEL[r.verification]}
        </Pill>
        {r.demo && <Pill>Demo data</Pill>}
        {r.moderation === "hidden" && <Pill tone="coral">Hidden</Pill>}
      </div>
      <p className="mt-2 text-sm leading-relaxed">{r.description}</p>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 text-xs text-muted-foreground sm:grid-cols-2">
        <div>Near {r.locationLabel} (approx.)</div>
        <div>
          Submitted {timeAgo(r.submittedAt)}
          {r.eventDate ? ` · event ${r.eventDate}` : ""}
        </div>
        {r.sourceUrl && (
          <div className="sm:col-span-2">
            Source:{" "}
            <a className="underline" href={r.sourceUrl} target="_blank" rel="noreferrer">
              {r.sourceName}
            </a>
          </div>
        )}
      </dl>
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </article>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="editorial-page-heading mb-6">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-poster mt-3 max-w-4xl text-5xl sm:text-6xl">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-sm text-muted-foreground">{children}</div>}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center">
      <p className="font-display text-lg">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
