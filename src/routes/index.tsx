import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoState } from "@/lib/cocoon/store";
import { activeTrip, publicReports } from "@/lib/cocoon/access";
import { DESTINATIONS, profileById } from "@/lib/cocoon/seed";
import { Pill, ReportCard, SimLabel } from "@/components/cocoon/ui";
import { SosButton } from "@/components/cocoon/SosPanel";
import { RoleGate } from "@/components/cocoon/AppShell";
import { CocoonWorld } from "@/components/cocoon/CocoonWorld";
import { CourageInvitation } from "@/components/cocoon/CourageStudio";
import { useEntryComplete } from "@/lib/cocoon/entry";
import { WelcomeExperience } from "./welcome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cocoon — Your Safer Route Companion" },
      {
        name: "description",
        content:
          "Explore walking routes, personal safety tools and a scripted companion demo. Paid voice and automatic WhatsApp are disabled.",
      },
      { property: "og:title", content: "Cocoon — Your Safer Route Companion" },
      {
        property: "og:description",
        content: "Safety-aware journeys for students and hostel residents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const entryComplete = useEntryComplete();
  if (!entryComplete) return <WelcomeExperience />;
  return (
    <RoleGate role="traveller">
      <div className="world-home">
        <CocoonWorld />
        <CourageInvitation />
        <section id="home-tools" className="world-home-tools">
          <details>
            <summary>Your journey tools · destinations, guardians & recent reports</summary>
            <HomeTools />
          </details>
        </section>
      </div>
    </RoleGate>
  );
}

function HomeTools() {
  const s = useDemoState();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const trip = activeTrip(s);
  const contacts = s.contacts.filter((c) => c.travellerId === s.actorIds.traveller);
  const reports = publicReports(s, "traveller").slice(0, 3);
  const matches = DESTINATIONS.filter((d) => d.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="space-y-5">
          <div className="relative">
            <p className="eyebrow">Make room for your next adventure</p>
            <h2 className="font-poster mt-2 text-5xl sm:text-6xl">
              Where to
              <br />
              <span className="text-coral">tonight?</span>
            </h2>
          </div>
          <div className="card-soft p-4">
            <label htmlFor="dest" className="sr-only">
              Destination
            </label>
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                id="dest"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Where are you going? Search any city"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
            <ul className="mt-2 divide-y">
              {matches.map((d) => (
                <li key={d.id}>
                  <button
                    className="flex w-full items-center justify-between py-2.5 text-left text-sm hover:text-primary"
                    onClick={() => nav({ to: "/explore", search: { to: d.id } })}
                  >
                    {d.label} <ArrowRight className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {matches.length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">
                  Search “{q}” worldwide in the route explorer.
                </li>
              )}
            </ul>
            <Button asChild size="lg" className="mt-3 w-full rounded-full">
              <Link to="/explore" search={{ to: "d-metro", query: q.trim() }}>
                Plan a safer route
              </Link>
            </Button>
          </div>

          <div className="bg-plum-gradient rounded-3xl p-5">
            <p className="eyebrow !text-primary-foreground/70">Active journey</p>
            {trip ? (
              <>
                <p className="mt-1 font-display text-2xl">{trip.destination}</p>
                <p className="text-sm opacity-90">
                  ETA {trip.etaMinutes} min · sharing{" "}
                  {trip.sharing === "active" ? `with ${profileById(trip.guardianId)?.name}` : "off"}
                </p>
                <Button asChild variant="secondary" className="mt-3 rounded-full">
                  <Link to="/trip">Open journey</Link>
                </Button>
              </>
            ) : (
              <p className="mt-1 text-sm opacity-90">
                No journey in progress. Pick a destination to begin.
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <div className="card-soft relative overflow-hidden p-5">
            <h2 className="text-xl font-semibold">Your guardians</h2>
            <ul className="mt-3 space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span>
                    {profileById(c.guardianId)?.name}{" "}
                    <span className="text-muted-foreground">· {c.relation}</span>
                  </span>
                  <Pill
                    tone={
                      c.status === "accepted" ? "sage" : c.status === "invited" ? "amber" : "muted"
                    }
                  >
                    {c.status === "accepted"
                      ? "Connected"
                      : c.status === "invited"
                        ? "Invite pending"
                        : "Declined"}
                  </Pill>
                </li>
              ))}
            </ul>
          </div>
          <SosButton />
          <Link
            to="/kit"
            className="panel-ink block bg-lime p-4 text-foreground transition hover:-translate-y-0.5"
          >
            <p className="font-poster text-3xl">Safety Kit →</p>
            <p className="text-sm">Pack list, ride checks, country emergency directory.</p>
          </Link>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent reports</h2>
              <SimLabel>Demo data</SimLabel>
            </div>
            <div className="space-y-3">
              {reports.map((r) => (
                <ReportCard key={r.id} r={r} />
              ))}
            </div>
            <Link to="/reports" className="mt-2 inline-block text-sm text-primary underline">
              All reports
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
