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
import { incidentsVisibleTo } from "@/lib/cocoon/access";
import { recipientRespond, responderAssist } from "@/lib/cocoon/actions";
import { PROFILES, profileById } from "@/lib/cocoon/seed";

export const Route = createFileRoute("/responder")({
  head: () => ({
    meta: [
      { title: "Responder console · Cocoon" },
      {
        name: "description",
        content: "Participating responders see only requests they were authorised to receive.",
      },
      { property: "og:title", content: "Responder console · Cocoon" },
      { property: "og:description", content: "Demo console for opted-in community responders." },
    ],
  }),
  component: () => (
    <RoleGate role="responder">
      <Console />
    </RoleGate>
  ),
});

function Console() {
  const s = useDemoState();
  const me = profileById(s.actorIds.responder)!;
  const incidents = incidentsVisibleTo(s, "responder");
  return (
    <div>
      <PageHeader eyebrow="Participating responder · demo" title="Incoming requests">
        You see a request only if the traveller authorised responder escalation and you're eligible,
        opted-in and available. This is a community demo — not police or emergency services.
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {PROFILES.filter((p) => p.role === "responder").map((p) => (
          <button
            key={p.id}
            onClick={() => setTabActor("responder", p.id)}
            className={`rounded-full border px-3 py-1 ${me.id === p.id ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {p.name} · {p.responderAvailable ? "available" : "unavailable"}
          </button>
        ))}
        <Pill tone="sage">Eligible</Pill>
        <Pill tone="lavender">Opted in</Pill>
        <SimLabel />
      </div>
      {incidents.length === 0 ? (
        <Empty title="No requests for you">
          {me.responderAvailable
            ? "You'll see SOS requests here when a traveller authorises responders."
            : "You're marked unavailable, so you won't receive requests."}
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {incidents.map((i) => {
            const mine = s.recipients.find((r) => r.incidentId === i.id && r.profileId === me.id)!;
            const open = !["resolved", "cancelled"].includes(i.status);
            return (
              <section key={i.id} className="card-soft overflow-hidden">
                <MapView
                  className="h-48"
                  current={i.location}
                  routes={[{ id: i.id, path: [i.location, i.location], selected: true }]}
                />
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">Traveller needs support</h2>
                    <Pill tone={incidentTone(i.status)}>{INCIDENT_LABEL[i.status]}</Pill>
                    <Pill tone={recipientTone(mine.status)}>
                      You: {RECIPIENT_LABEL[mine.status]}
                    </Pill>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {i.locationLabel} · approx. location · {timeAgo(i.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Name and contact details are withheld from responders in this demo.
                  </p>
                  <IncidentRequestDetails incident={i} />
                  {open && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["delivered", "no_response"].includes(mine.status) && (
                        <>
                          <Button
                            size="sm"
                            className="rounded-full"
                            onClick={() => recipientRespond(i.id, "responder", "acknowledged")}
                          >
                            Acknowledge
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-full"
                            onClick={() => {
                              recipientRespond(i.id, "responder", "accepted");
                              toast.success("Accepted");
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                            onClick={() => recipientRespond(i.id, "responder", "declined")}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {mine.status === "acknowledged" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-full"
                          onClick={() => recipientRespond(i.id, "responder", "accepted")}
                        >
                          Accept request
                        </Button>
                      )}
                      {mine.status === "accepted" && i.status !== "assistance_in_progress" && (
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => responderAssist(i.id)}
                        >
                          Mark assistance in progress
                        </Button>
                      )}
                    </div>
                  )}
                  <Timeline events={i.events} />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
