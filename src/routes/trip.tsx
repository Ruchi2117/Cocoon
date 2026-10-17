import { BalancedColumns } from "@/components/cocoon/BalancedColumns";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/cocoon/MapView";
import { Empty, PageHeader, Pill, SimLabel, timeAgo } from "@/components/cocoon/ui";
import { RoleGate } from "@/components/cocoon/AppShell";
import { SosButton, IncidentPanel } from "@/components/cocoon/SosPanel";
import { useDemoState } from "@/lib/cocoon/store";
import { activeTrip, openIncident } from "@/lib/cocoon/access";
import {
  advanceTrip,
  checkIn,
  endTrip,
  sendConcern,
  simulateMissedCheckIn,
  stopTripSharing,
  resumeTripSharing,
  updateResultText,
} from "@/lib/cocoon/actions";
import { profileById } from "@/lib/cocoon/seed";
import { ShareSheet } from "@/components/cocoon/ShareSheet";
import { AutoAlertsCard } from "@/components/cocoon/AutoAlertsCard";
import { ArrivalScene } from "@/components/cocoon/ArrivalScene";
import type { ShareKind } from "@/lib/cocoon/share";
import { formatClock, formatDistance, usePrefs } from "@/lib/cocoon/locale";
import type { LatLng } from "@/lib/cocoon/types";
import { PrivateJourneyPanel } from "@/components/cocoon/PrivateJourneyPanel";

export const Route = createFileRoute("/trip")({
  head: () => ({
    meta: [
      { title: "Your journey · Cocoon" },
      {
        name: "description",
        content:
          "Private journeys and manual check-ins for opted-in in-app guardians, alongside a separate local demo. No background dispatch.",
      },
      { property: "og:title", content: "Your journey · Cocoon" },
      {
        property: "og:description",
        content:
          "Private journeys, manual check-ins and owner history. Guardians must open their account inbox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="space-y-6">
      <PrivateJourneyPanel />
      <details className="border-t pt-4">
        <summary className="cursor-pointer font-display text-xl">
          Local journey demo · simulated check-ins
        </summary>
        <div className="pt-5">
          <RoleGate role="traveller">
            <TripPage />
          </RoleGate>
        </div>
      </details>
    </div>
  ),
});

const NOTE_LABEL = {
  trip_started: "Trip started",
  check_in: "Check-in",
  check_in_missed: "Check-in missed",
  user_concern: "Concern reported",
  sos_confirmed: "SOS confirmed",
  responder_ack: "Responder update",
  trip_completed: "Trip completed",
} as const;

function TripPage() {
  const { units } = usePrefs();
  const [stepFocus, setStepFocus] = useState<LatLng | null>(null);
  const s = useDemoState();
  const trip = activeTrip(s);
  const [concern, setConcern] = useState("");
  const [share, setShare] = useState<ShareKind | null>(null);
  const inc = openIncident(s);
  const last = s.trips.find((t) => t.travellerId === s.actorIds.traveller);
  const notes = s.notifications.filter((n) => n.tripId === (trip ?? last)?.id);

  if (!trip)
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Guardian Mode" title="No active journey" />
        {last && !inc ? (
          <ArrivalScene destination={last.destination} />
        ) : (
          <Empty
            title={last ? `Last trip to ${last.destination} completed` : "Plan a route to begin"}
          >
            {last
              ? "Trip sharing stopped when you arrived."
              : "Choose a route, pick a guardian, and start."}
            <div className="mt-3">
              <Button asChild className="rounded-full">
                <Link to="/explore" search={{ to: "d-metro" }}>
                  Plan a safer route
                </Link>
              </Button>
            </div>
          </Empty>
        )}
        {inc && <IncidentPanel />}
        <NotesList notes={notes} />
      </div>
    );

  const g = profileById(trip.guardianId);
  return (
    <div>
      <PageHeader eyebrow="Guardian Mode · active" title={trip.destination}>
        <span className="flex flex-wrap items-center gap-2">
          <Pill tone="plum">
            ETA {trip.etaMinutes} min · ~
            {formatClock(new Date(Date.now() + trip.etaMinutes * 60000))}
          </Pill>
          <Pill tone={trip.sharing === "active" ? "sage" : "muted"}>
            {trip.sharing === "active" ? `Sharing with ${g?.name}` : "Not shared"}
          </Pill>
          <SimLabel>Simulated progress — not live GPS</SimLabel>
          {trip.checkInMissed && <Pill tone="amber">Check-in missed</Pill>}
        </span>
      </PageHeader>
      <BalancedColumns className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <MapView
            className="h-[44vh] min-h-[300px] overflow-hidden rounded-3xl border"
            routes={[
              {
                id: trip.routeId,
                path: trip.path,
                selected: true,
                dashed: trip.routeProvider === "seeded-demo" || !trip.routeId.startsWith("live-"),
              },
            ]}
            origin={trip.path[0]}
            destination={trip.path[trip.path.length - 1]}
            current={trip.lastLocation}
            focusPoint={stepFocus}
          />
          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {trip.routeProvider === "osm-foot"
                ? "OpenStreetMap walking route"
                : "Illustrative demo path — not street-accurate"}
            </span>
            {trip.routeDistanceKm !== undefined && (
              <span>
                {formatDistance(trip.routeDistanceKm * (1 - trip.progress), units)} left · simulated
              </span>
            )}
          </div>
          {!!trip.routeSteps?.length && (
            <details className="route-directions">
              <summary className="cursor-pointer p-4 text-sm font-medium">
                Walking directions · {trip.routeSteps.length} steps
              </summary>
              <ol className="max-h-72 overflow-y-auto border-t">
                {trip.routeSteps.map((step, i) => (
                  <li key={i}>
                    <button
                      className="flex w-full items-start gap-3 border-b p-3 text-left text-sm hover:bg-accent"
                      onClick={() => setStepFocus([...step.at])}
                    >
                      <span className="step-number">{i + 1}</span>
                      <span className="flex-1">{step.instruction}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistance(step.distanceM / 1000, units)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <p className="p-3 text-xs text-muted-foreground">
                Not live navigation. Observe crossings and local access rules.
              </p>
            </details>
          )}
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(trip.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Simulated progress"
          >
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${trip.progress * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => advanceTrip()}>
              Simulate walking ahead
            </Button>
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                const result = checkIn();
                toast(`Check-in: ${updateResultText(result)}`);
              }}
            >
              I'm okay — check in
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={simulateMissedCheckIn}>
              Demo: miss a check-in
            </Button>
            {trip.guardianId && (
              <Button
                variant="outline"
                onClick={() => {
                  if (trip.sharing === "active") {
                    stopTripSharing();
                    toast("Trip sharing stopped");
                  } else {
                    resumeTripSharing();
                    toast("Trip sharing resumed with your accepted guardian");
                  }
                }}
              >
                {trip.sharing === "active" ? "Stop sharing" : "Resume sharing"}
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/presence">Call my companion</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/kit">Safety Kit</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Last location update {timeAgo(trip.lastLocationAt)} · last check-in{" "}
            {trip.lastCheckInAt ? timeAgo(trip.lastCheckInAt) : "—"}
          </p>
        </div>
        <div className="space-y-4">
          <SosButton />
          <div className="card-soft space-y-2 p-4">
            <h2 className="text-lg font-semibold">Share manually via WhatsApp or other apps</h2>
            <p className="text-xs text-muted-foreground">
              Preview and edit first. You send it yourself — separate from in-app guardian updates.
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["trip", "Share journey"],
                  ["check_in", "Check-in"],
                  ["concern", "Concern"],
                  ["arrived", "Arrived"],
                ] as const
              ).map(([k, l]) => (
                <Button
                  key={k}
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setShare(k)}
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>
          <AutoAlertsCard />
          {share && (
            <ShareSheet
              initialKind={share}
              destination={trip.destination}
              etaMinutes={trip.etaMinutes}
              simulatedPosition={trip.lastLocation}
              onClose={() => setShare(null)}
            />
          )}
          {trip.sharing === "active" && (
            <form
              className="card-soft space-y-2 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                const result = sendConcern(concern.trim());
                setConcern("");
                toast(updateResultText(result));
              }}
            >
              <h2 className="text-lg font-semibold">Feeling uneasy?</h2>
              <p className="text-xs text-muted-foreground">
                Simulates a short structured update to demo guardian {g?.name}, not a real person or
                a transcript.
              </p>
              <input
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                maxLength={140}
                placeholder="Optional short note"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                aria-label="Concern note"
              />
              <Button type="submit" variant="outline" className="w-full rounded-full">
                Simulate concern update
              </Button>
            </form>
          )}
          <Button
            className="w-full rounded-full"
            size="lg"
            onClick={() => {
              endTrip();
              toast.success("Arrived — sharing stopped");
            }}
          >
            I've arrived · end trip
          </Button>
          <NotesList notes={notes} />
        </div>
      </BalancedColumns>
    </div>
  );
}

function NotesList({ notes }: { notes: ReturnType<typeof useDemoState>["notifications"] }) {
  if (!notes.length) return null;
  return (
    <div className="card-soft p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Guardian updates</h2>
        <SimLabel />
      </div>
      <ul className="mt-2 space-y-2 text-sm">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl bg-muted/60 p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <strong>{NOTE_LABEL[n.type]}</strong>
              <Pill
                tone={
                  n.delivery === "delivered"
                    ? "lavender"
                    : n.delivery === "failed"
                      ? "coral"
                      : "muted"
                }
              >
                {n.delivery}
              </Pill>
              <Pill tone={n.acknowledgedAt ? "sage" : "muted"}>
                {n.acknowledgedAt ? "acknowledged" : "not acknowledged"}
              </Pill>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{n.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
