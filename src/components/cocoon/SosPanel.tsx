import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDemoState } from "@/lib/cocoon/store";
import { activeTrip, openIncident } from "@/lib/cocoon/access";
import {
  closeIncident,
  escalateToResponders,
  markNoResponse,
  requestSOS,
  retryFailed,
  setFailNext,
  eligibleResponders,
} from "@/lib/cocoon/actions";
import { profileById } from "@/lib/cocoon/seed";
import { DEFAULT_SOS_PREFERENCES, selectedSosGuardians } from "@/lib/cocoon/sos-policy";
import { Link } from "@tanstack/react-router";
import {
  INCIDENT_LABEL,
  Pill,
  RECIPIENT_LABEL,
  SimLabel,
  incidentTone,
  recipientTone,
  timeAgo,
} from "./ui";

export function SosButton({ compact = false }: { compact?: boolean }) {
  const s = useDemoState();
  const [open, setOpen] = useState(false);
  const prefs = s.sosPreferences[s.actorIds.traveller] ?? DEFAULT_SOS_PREFERENCES;
  const [authOverride, setAuth] = useState<boolean | null>(null);
  const auth = authOverride ?? prefs.responders;
  const [note, setNote] = useState("");
  const guardians = selectedSosGuardians(s, prefs.guardianIds);
  const inc = openIncident(s);
  if (inc) return compact ? null : <IncidentPanel />;
  return (
    <div className={compact ? "" : "card-soft p-5"}>
      {!open ? (
        <Button
          variant="destructive"
          size="lg"
          className="w-full rounded-full text-base"
          onClick={() => {
            setAuth(null);
            setNote("");
            setOpen(true);
          }}
        >
          SOS
        </Button>
      ) : (
        <div className="space-y-3 rounded-2xl border border-coral/40 bg-coral/5 p-4">
          <p className="font-display text-lg">Create a demo SOS alert?</p>
          <p className="text-sm text-muted-foreground">
            Only the selected accepted guardians receive simulated in-app alerts. No real message,
            authority dispatch or nearby-user broadcast is sent.
          </p>
          <p className="text-sm">
            Guardians: {guardians.map((id) => profileById(id)?.name).join(", ") || "None selected"}.{" "}
            <Link to="/kit" hash="sos-delivery">
              Edit SOS preferences ↗
            </Link>
          </p>
          {!guardians.length && !auth && (
            <p className="text-sm">
              No available demo recipients are selected. This creates an unresolved local record and
              notifies nobody.
            </p>
          )}
          {(prefs.authorities || prefs.nearby) && (
            <p className="text-sm">
              Requested but unavailable: {prefs.authorities ? "authority dispatch" : ""}
              {prefs.authorities && prefs.nearby ? " and " : ""}
              {prefs.nearby ? "nearby authenticated-user alerts" : ""}. No recipient in these
              channels will be contacted.
            </p>
          )}
          <label className="block text-sm">
            Optional help request · local demo only
            <textarea
              maxLength={500}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Keep real identifying details out of this demo"
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
          {!activeTrip(s) && (
            <p className="text-xs text-coral">
              No active journey: this demo uses a sample Delhi location. It does not know where you
              are.
            </p>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={auth}
              onChange={(e) => setAuth(e.target.checked)}
            />
            <span>
              Also alert participating demo responders ({eligibleResponders().length} opted-in &
              available, demo)
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={s.failNextGuardianDelivery}
              onChange={(e) => setFailNext(e.target.checked)}
            />
            <span>Demo control: simulate failed delivery to guardian</span>
          </label>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1 rounded-full"
              onClick={() => {
                requestSOS({ authoriseResponders: auth, guardianIds: prefs.guardianIds, note });
                setOpen(false);
                toast("SOS incident created (demo)");
              }}
            >
              Confirm demo SOS
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Not now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function IncidentPanel() {
  const s = useDemoState();
  const inc = openIncident(s) ?? s.incidents.find((i) => i.travellerId === s.actorIds.traveller);
  const [confirmClose, setConfirmClose] = useState<null | "resolved" | "cancelled">(null);
  if (!inc) return null;
  const recips = s.recipients.filter((r) => r.incidentId === inc.id);
  const open = !["resolved", "cancelled"].includes(inc.status);
  const hasFailed = recips.some((r) => r.status === "failed");
  const hasWaiting = recips.some((r) => r.status === "delivered");
  return (
    <section className={`card-soft p-5 ${open ? "border-coral/50" : ""}`} aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold">SOS incident</h2>
        <Pill tone={incidentTone(inc.status)}>{INCIDENT_LABEL[inc.status]}</Pill>
        {open && <Pill tone="coral">Unresolved</Pill>}
        <SimLabel>Simulated notifications</SimLabel>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Opened {timeAgo(inc.createdAt)} · {inc.locationLabel}
      </p>
      <p className="mt-2 text-sm">
        Location source: {inc.locationSource ?? "legacy demo"}
        {inc.locationAt
          ? ` · captured ${new Date(inc.locationAt).toLocaleString()}`
          : " · no current GPS fix"}
        . Coordinates: {inc.location[0].toFixed(4)}, {inc.location[1].toFixed(4)}.{" "}
        {inc.note && `Request: ${inc.note}`}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Alert packet: incident ID, time, traveller, location provenance, available journey context
        and optional request. “Delivered” below means simulated delivery, not a person acknowledging
        or help arriving.
      </p>
      {(inc.authorityRequested || inc.nearbyRequested) && (
        <p className="mt-2 text-sm">
          Not sent: {inc.authorityRequested ? "authorities (no dispatch connection)" : ""}
          {inc.authorityRequested && inc.nearbyRequested ? "; " : ""}
          {inc.nearbyRequested ? "nearby authenticated users (service unavailable)" : ""}.
        </p>
      )}
      <ul className="mt-3 space-y-1.5">
        {recips.length === 0 && (
          <li className="text-sm text-muted-foreground">No recipients yet.</li>
        )}
        {recips.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm"
          >
            <span>
              {profileById(r.profileId)?.name}{" "}
              <span className="text-muted-foreground">· {r.kind}</span>
            </span>
            <Pill tone={recipientTone(r.status)}>{RECIPIENT_LABEL[r.status]}</Pill>
          </li>
        ))}
      </ul>
      {open && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!inc.responderEscalationAuthorised && (
            <Button size="sm" className="rounded-full" onClick={escalateToResponders}>
              Escalate to responders
            </Button>
          )}
          {hasFailed && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => retryFailed(inc.id)}
            >
              Retry failed delivery
            </Button>
          )}
          {hasWaiting && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => markNoResponse(inc.id)}
            >
              Simulate 5 min with no reply
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full"
            onClick={() => setConfirmClose("resolved")}
          >
            I'm safe — resolve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => setConfirmClose("cancelled")}
          >
            Cancel (sent by mistake)
          </Button>
        </div>
      )}
      {confirmClose && (
        <div className="mt-3 rounded-xl border p-3 text-sm">
          {confirmClose === "resolved"
            ? "Mark yourself safe and close this incident for everyone?"
            : "Cancel this SOS? Recipients will see it was cancelled."}
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => {
                closeIncident(
                  inc.id,
                  confirmClose,
                  confirmClose === "resolved"
                    ? "Traveller confirmed she is safe."
                    : "Traveller cancelled the SOS.",
                );
                setConfirmClose(null);
              }}
            >
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmClose(null)}>
              Back
            </Button>
          </div>
        </div>
      )}
      <Timeline events={inc.events} />
    </section>
  );
}

export function Timeline({ events }: { events: { at: string; actor: string; text: string }[] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted-foreground">
        Incident timeline ({events.length})
      </summary>
      <ol className="mt-2 space-y-1 border-l pl-3">
        {events.map((e, i) => (
          <li key={i}>
            <span className="text-xs text-muted-foreground">
              {new Date(e.at).toLocaleTimeString()}
            </span>{" "}
            · <strong>{e.actor}</strong>: {e.text}
          </li>
        ))}
      </ol>
    </details>
  );
}
