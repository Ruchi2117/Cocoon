import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { useProductionAuth } from "@/lib/production/auth";
import { readPrivateJourneys } from "@/lib/production/journey.functions";
import { INAPP_POLL_MS } from "@/lib/production/inapp-schema";
import type { PrivateJourney } from "@/lib/production/journey-schema";
import { JourneySnapshot } from "./JourneySnapshot";
export function JourneyGuardianView({ open }: { open: boolean }) {
  const { user } = useProductionAuth();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  if (!user || !open) return null;
  return visible ? (
    <VisibleGuardianJourneys key={user.id} userId={user.id} />
  ) : (
    <p>Journey view paused while hidden.</p>
  );
}
function VisibleGuardianJourneys({ userId }: { userId: string }) {
  const read = useServerFn(readPrivateJourneys);
  const mounted = useRef(true);
  const [fresh, setFresh] = useState<{ serverNow: string; journeys: PrivateJourney[] } | null>(
    null,
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const query = useQuery({
    queryKey: ["guardian-journeys", userId],
    queryFn: async () => {
      const result = await read({ data: { guardian: true } });
      if (mounted.current) setFresh(result);
      return result;
    },
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: INAPP_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return (
    <section aria-label="Shared private journeys" className="space-y-3 border-t pt-4">
      <h3 className="font-display text-xl">Active journeys shared with you</h3>
      <p className="text-sm">
        {"Inbox open · refreshes every 30 seconds"}. No background alert; check-in overdue is not
        proof of danger.
      </p>
      <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
        Refresh shared journeys
      </Button>
      {!fresh && !query.error && <p>Loading shared journeys…</p>}
      {query.error && <p role="alert">Shared journeys unavailable. Refresh to retry.</p>}
      {!query.error && fresh?.journeys.length === 0 && <p>No active permitted shared journeys.</p>}
      {!query.error &&
        fresh?.journeys.map((j) => (
          <article className="space-y-2 border-b py-3" key={j.id}>
            <h4>
              {j.traveller_name} · {j.destination}
            </h4>
            <JourneySnapshot journey={j} />
          </article>
        ))}
      {!query.error && fresh && (
        <p className="text-xs">
          Checked at server time {new Date(fresh.serverNow).toLocaleString()}. Revoked/stopped
          sharing disappears on the next retrieval; already seen information cannot be recalled.
        </p>
      )}
    </section>
  );
}
