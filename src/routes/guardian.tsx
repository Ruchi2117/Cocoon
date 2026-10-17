import { IncidentRequestDetails } from "@/components/cocoon/IncidentRequestDetails";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/cocoon/MapView";
import { RoleGate } from "@/components/cocoon/AppShell";
import {
  Empty,
  INCIDENT_LABEL,
  PageHeader,
  Pill,
  RECIPIENT_LABEL,
  SimLabel,
  incidentTone,
  recipientTone,
  timeAgo,
} from "@/components/cocoon/ui";
import { Timeline } from "@/components/cocoon/SosPanel";
import { setTabActor, useDemoState } from "@/lib/cocoon/store";
import { incidentsVisibleTo, notificationsFor, tripsVisibleTo } from "@/lib/cocoon/access";
import {
  ackNotification,
  recipientRespond,
  respondInvite,
  retryNotification,
} from "@/lib/cocoon/actions";
import { profileById } from "@/lib/cocoon/seed";

export const Route = createFileRoute("/guardian")({
  head: () => ({
    meta: [
      { title: "Guardian view · Cocoon" },
      {
        name: "description",
        content: "See trips shared with you, structured updates and SOS alerts.",
      },
      { property: "og:title", content: "Guardian view · Cocoon" },
      { property: "og:description", content: "Trusted-contact dashboard for shared journeys." },
    ],
  }),
  component: () => (
    <RoleGate role="guardian">
      <Guardian />
    </RoleGate>
  ),
});

function Guardian() {
  const s = useDemoState();
  const me = s.actorIds.guardian;
  const trips = tripsVisibleTo(s, "guardian");
  const incidents = incidentsVisibleTo(s, "guardian");
  const notes = notificationsFor(s, "guardian");
  const invites = s.contacts.filter((c) => c.guardianId === me && c.status === "invited");

  return (
    <div>
      <PageHeader eyebrow={`Guardian · ${profileById(me)?.name}`} title="People you look out for">
        You only see trips actively shared with you, for their duration. Updates are structured —
        you never receive private conversations.
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        Viewing as:
        {["u-meera", "u-kabir"].map((id) => (
          <button
            key={id}
            onClick={() => setTabActor("guardian", id)}
            className={`rounded-full border px-3 py-1 ${me === id ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {profileById(id)?.name}
          </button>
        ))}
      </div>
      {invites.map((c) => (
        <div
          key={c.id}
          className="card-soft mb-4 flex flex-wrap items-center justify-between gap-2 p-4"
        >
          <span>
            <strong>{profileById(c.travellerId)?.name}</strong> invited you to be a trusted guardian
            ({c.relation}).
          </span>
          <span className="flex gap-2">
            <Button size="sm" className="rounded-full" onClick={() => respondInvite(c.id, true)}>
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => respondInvite(c.id, false)}>
              Decline
            </Button>
          </span>
        </div>
      ))}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {incidents.map((i) => {
            const mine = s.recipients.find((r) => r.incidentId === i.id && r.profileId === me)!;
            const open = !["resolved", "cancelled"].includes(i.status);
            return (
              <section key={i.id} className={`card-soft p-4 ${open ? "border-coral/60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    SOS from {profileById(i.travellerId)?.name}
                  </h2>
                  <Pill tone={incidentTone(i.status)}>{INCIDENT_LABEL[i.status]}</Pill>
                  <Pill tone={recipientTone(mine.status)}>You: {RECIPIENT_LABEL[mine.status]}</Pill>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {i.locationLabel} · {timeAgo(i.createdAt)}
                </p>
                {open && mine.status === "failed" && (
                  <p className="mt-2 text-sm text-coral">
                    This alert failed to reach you (simulated). The traveller can retry.
                  </p>
                )}
                <IncidentRequestDetails incident={i} />
                {open && ["delivered", "no_response"].includes(mine.status) && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="rounded-full"
                      onClick={() => {
                        recipientRespond(i.id, "guardian", "acknowledged");
                        toast.success("Acknowledged");
                      }}
                    >
                      Acknowledge
                    </Button>
                  </div>
                )}
                <Timeline events={i.events} />
              </section>
            );
          })}
          {trips.length === 0 ? (
            <Empty title="No trips shared with you right now">
              When a traveller starts a journey and chooses you, it appears here. Sharing ends when
              they arrive.
            </Empty>
          ) : (
            trips.map((t) => (
              <section key={t.id} className="card-soft overflow-hidden">
                <MapView
                  className="h-64"
                  routes={[
                    {
                      id: t.id,
                      path: t.path,
                      selected: true,
                      dashed: t.routeProvider === "seeded-demo" || !t.routeId.startsWith("live-"),
                    },
                  ]}
                  destination={t.path[t.path.length - 1]}
                  current={t.lastLocation}
                />
                <div className="space-y-1 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {profileById(t.travellerId)?.name} → {t.destination}
                    </h2>
                    <SimLabel>Simulated location</SimLabel>
                  </div>
                  <p className="text-sm">
                    ETA <strong>{t.etaMinutes} min</strong> · started {timeAgo(t.startedAt)} ·
                    latest location {timeAgo(t.lastLocationAt)}
                  </p>
                  {t.checkInMissed && (
                    <p className="text-sm">
                      A check-in was missed. That alone doesn't mean something is wrong — a quick
                      call may help.
                    </p>
                  )}
                </div>
              </section>
            ))
          )}
        </div>
        <div className="card-soft h-fit p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Updates</h2>
            <SimLabel>Simulated delivery</SimLabel>
          </div>
          {notes.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">No updates yet.</p>
          )}
          <ul className="mt-2 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-muted/60 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <strong className="capitalize">{n.type.replaceAll("_", " ")}</strong>
                  <Pill tone={n.delivery === "failed" ? "coral" : "lavender"}>{n.delivery}</Pill>
                  {n.acknowledgedAt && <Pill tone="sage">acknowledged</Pill>}
                </div>
                <p className="mt-1">{n.summary}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                {n.delivery === "delivered" && !n.acknowledgedAt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 rounded-full"
                    onClick={() => ackNotification(n.id)}
                  >
                    Acknowledge
                  </Button>
                )}
                {n.delivery === "failed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 rounded-full"
                    onClick={() => retryNotification(n.id)}
                  >
                    Simulate redelivery
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
