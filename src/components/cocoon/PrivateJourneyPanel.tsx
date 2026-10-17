import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useProductionAuth } from "@/lib/production/auth";
import { inappAccountData } from "@/lib/production/inapp.functions";
import { readPrivateJourneys, writePrivateJourney } from "@/lib/production/journey.functions";
import { JOURNEY_LIMITATION, type JourneyInput } from "@/lib/production/journey-schema";
import type { z } from "zod";
import type { locationInput } from "@/lib/production/security";
import { JourneySnapshot } from "./JourneySnapshot";
function localDateInput(date: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function PrivateJourneyPanel({ destination: suggested = "" }: { destination?: string }) {
  const { user, ready } = useProductionAuth();
  const cache = useQueryClient();
  const read = useServerFn(readPrivateJourneys),
    contactsRead = useServerFn(inappAccountData),
    write = useServerFn(writePrivateJourney);
  const journeys = useQuery({
    queryKey: ["private-journeys", user?.id],
    queryFn: () => read({ data: { guardian: false } }),
    enabled: !!user,
    retry: false,
  });
  const contacts = useQuery({
    queryKey: ["inapp-account", user?.id],
    queryFn: () => contactsRead(),
    enabled: !!user,
    retry: false,
  });
  const [destination, setDestination] = useState(suggested),
    [due, setDue] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [note, setNote] = useState("");
  const [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [location, setLocation] = useState<z.infer<typeof locationInput> | null>(null),
    [consent, setConsent] = useState(false),
    [locating, setLocating] = useState(false);
  const generation = useRef(0),
    request = useRef<{ signature: string; key: string } | null>(null),
    identity = useRef(user?.id);
  identity.current = user?.id;
  useEffect(() => {
    setDestination(suggested);
    setReview(false);
  }, [suggested]);
  const invalidatePendingLocation = () => {
    generation.current++;
  };
  useEffect(() => {
    generation.current++;
    request.current = null;
    setReview(false);
    setSelected([]);
    setNote("");
    setMessage("");
    setLocation(null);
    setConsent(false);
    setLocating(false);
    setBusy(false);
    setDue(localDateInput(new Date(Date.now() + 30 * 60000)));
    return invalidatePendingLocation;
  }, [user?.id]);
  const edit = () => {
    setReview(false);
    request.current = null;
  };
  const clearLocation = () => {
    generation.current++;
    setLocation(null);
    setConsent(false);
    setLocating(false);
    edit();
  };
  const locate = () => {
    clearLocation();
    const current = ++generation.current;
    if (!navigator.geolocation) {
      setMessage("Location unavailable. Continue without it.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (current !== generation.current) return;
        setLocation({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: p.timestamp,
        });
        setLocating(false);
      },
      () => {
        if (current !== generation.current) return;
        setLocating(false);
        setMessage("Location denied or unavailable. Continue without it.");
      },
      { maximumAge: 0, timeout: 10000, enableHighAccuracy: true },
    );
  };
  const active = journeys.data?.journeys.find((j) => j.status === "active");
  const eligible =
    contacts.data?.contacts.filter(
      (g) =>
        g.traveller_id === user?.id &&
        g.consent === "opted_in" &&
        !g.revoked_at &&
        g.journey_opt_in,
    ) ?? [];
  const save = async (action: JourneyInput["action"]) => {
    if (!user || busy) return;
    const actor = user.id;
    setBusy(true);
    setMessage("");
    try {
      const payload = {
        action,
        ...(action === "start"
          ? { destination, recipientIds: selected }
          : { journeyId: active?.id }),
        ...(["start", "check_in"].includes(action)
          ? { expectedAt: new Date(due).toISOString() }
          : {}),
        note,
        location: consent ? location : null,
        locationConsent: consent,
      };
      const signature = JSON.stringify(payload);
      if (request.current?.signature !== signature)
        request.current = { signature, key: crypto.randomUUID() };
      const result = await write({ data: { ...payload, requestKey: request.current.key } });
      if (identity.current !== actor) return;
      setMessage(
        `${result.duplicate ? "Existing action confirmed" : "Journey saved"}. Only current permitted in-app status is available; nobody was sent an external message.`,
      );
      request.current = null;
      clearLocation();
      setNote("");
      setReview(false);
      await cache.invalidateQueries({ queryKey: ["private-journeys", actor] });
      await journeys.refetch();
    } catch (e) {
      if (identity.current === actor)
        setMessage(e instanceof Error ? e.message : "Journey unavailable. Retry.");
    } finally {
      if (identity.current === actor) setBusy(false);
    }
  };
  const refresh = () => {
    clearLocation();
    void journeys.refetch();
    void contacts.refetch();
  };
  return (
    <section className="min-w-0 space-y-4 border-t py-5" aria-label="Private journey">
      <p className="eyebrow">REAL ACCOUNT / PRIVATE JOURNEY</p>
      <h2 className="font-display text-2xl">Your journey & check-ins</h2>
      <p className="text-sm">{JOURNEY_LIMITATION} The local journey demo is separate.</p>
      {!ready ? (
        <p role="status">Checking account…</p>
      ) : !user ? (
        <Link className="underline" to="/account">
          Sign in for private journeys ↗
        </Link>
      ) : (
        <>
          <Button
            variant="outline"
            disabled={busy || journeys.isFetching || contacts.isFetching}
            onClick={refresh}
          >
            Refresh private journeys & guardians
          </Button>
          {journeys.isPending && <p role="status">Loading private journeys…</p>}
          {(journeys.error || contacts.error) && (
            <p role="alert">
              Private journeys or guardians unavailable. Refresh to retry; no change is confirmed.
            </p>
          )}
          {!journeys.isPending && !journeys.error && !contacts.error && (
            <>
              {active && (
                <article className="space-y-3 border-b pb-4">
                  <h3 className="font-display text-xl">{active.destination}</h3>
                  <JourneySnapshot journey={active} />
                  <p className="text-xs">
                    Status checked at server time{" "}
                    {new Date(journeys.data?.serverNow ?? "").toLocaleString()}. Refresh for current
                    overdue status.
                  </p>
                </article>
              )}
              {!active && (
                <label className="block text-sm">
                  Journey destination
                  <input
                    className="mt-1 block w-full min-w-0 border bg-card p-2"
                    value={destination}
                    maxLength={160}
                    disabled={busy}
                    onChange={(e) => {
                      edit();
                      setDestination(e.target.value);
                    }}
                  />
                </label>
              )}
              {!active && (
                <fieldset className="space-y-2" disabled={busy}>
                  <legend>Choose up to five journey-consenting guardians</legend>
                  {eligible.map((g) => (
                    <label className="block text-sm" key={g.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(g.id)}
                        onChange={(e) => {
                          edit();
                          setSelected(
                            e.target.checked
                              ? [...selected, g.id]
                              : selected.filter((id) => id !== g.id),
                          );
                        }}
                      />{" "}
                      {g.name}
                    </label>
                  ))}
                  {!eligible.length && (
                    <p>
                      No journey-consenting guardians. Ask an existing opted-in guardian to enable
                      journey status in their account.
                    </p>
                  )}
                  <Link to="/account" className="underline">
                    Manage in-app connections ↗
                  </Link>
                </fieldset>
              )}
              <label className="block text-sm">
                {active ? "Next expected check-in" : "Expected check-in time"}
                <input
                  className="mt-1 block w-full min-w-0 border bg-card p-2"
                  type="datetime-local"
                  value={due}
                  disabled={busy}
                  onChange={(e) => {
                    edit();
                    setDue(e.target.value);
                  }}
                />
                <small>Your local time · must be in the future, within 24 hours.</small>
              </label>
              <label className="block text-sm">
                Journey note (optional)
                <textarea
                  className="mt-1 block w-full border bg-card p-2"
                  value={note}
                  maxLength={500}
                  disabled={busy}
                  onChange={(e) => {
                    edit();
                    setNote(e.target.value);
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={locating || busy} onClick={locate}>
                  Use one-time journey location
                </Button>
                {locating && (
                  <Button variant="ghost" onClick={clearLocation}>
                    Cancel location request
                  </Button>
                )}
              </div>
              {location && (
                <div className="space-y-2 text-sm">
                  <p>
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · ±
                    {Math.round(location.accuracy)} m ·{" "}
                    {new Date(location.timestamp).toLocaleString()} · one-time only
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={consent}
                      disabled={busy}
                      onChange={(e) => {
                        edit();
                        setConsent(e.target.checked);
                      }}
                    />{" "}
                    Include this fresh snapshot in this journey update
                  </label>
                  <Button variant="ghost" disabled={busy} onClick={clearLocation}>
                    Remove journey location
                  </Button>
                </div>
              )}
              <p className="text-xs">
                A check-in without a new consented snapshot clears the previous shared snapshot.
                Stop sharing and arrival/cancellation deny further guardian access; your own history
                remains.
              </p>
              {!active ? (
                <>
                  <Button
                    disabled={
                      busy ||
                      locating ||
                      !destination.trim() ||
                      !due ||
                      selected.length < 1 ||
                      selected.length > 5 ||
                      selected.some((id) => !eligible.some((g) => g.id === id))
                    }
                    onClick={() => setReview(true)}
                  >
                    Review private journey
                  </Button>
                  {review && (
                    <div className="space-y-3 border-l-2 pl-4" aria-label="Journey review">
                      <p>
                        Start a private journey to {destination}, expected check-in{" "}
                        {new Date(due).toLocaleString()}, shared with{" "}
                        {eligible
                          .filter((g) => selected.includes(g.id))
                          .map((g) => g.name)
                          .join(", ")}
                        .{" "}
                        {consent && location
                          ? "Your selected one-time snapshot will be included."
                          : "No location will be shared."}
                      </p>
                      <p>
                        No safety guarantee or background alert. This does not start or change the
                        local demo.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="h-auto whitespace-normal py-2"
                          disabled={busy || locating}
                          onClick={() => void save("start")}
                        >
                          Confirm start private journey
                        </Button>
                        <Button variant="outline" disabled={busy} onClick={() => setReview(false)}>
                          Back to edit journey
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy || locating || !due} onClick={() => void save("check_in")}>
                    I'm okay · private check-in
                  </Button>
                  <Button disabled={busy || locating} onClick={() => void save("arrived")}>
                    I've arrived · finish private journey
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || locating}
                    onClick={() => void save("cancelled")}
                  >
                    Cancel private journey
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || !active.sharing}
                    onClick={() => void save("stop_sharing")}
                  >
                    Stop private sharing
                  </Button>
                </div>
              )}
              <details className="space-y-3 border-t pt-4">
                <summary className="cursor-pointer">Your private journey history</summary>
                {!journeys.data?.journeys.length && <p>No private journeys yet.</p>}
                {journeys.data?.journeys.map((j) => (
                  <article key={j.id} className="space-y-2 border-b py-3">
                    <h3>
                      {j.destination} · {new Date(j.created_at).toLocaleString()}
                    </h3>
                    <JourneySnapshot journey={j} />
                  </article>
                ))}
              </details>
            </>
          )}
        </>
      )}
      {message && (
        <p role="status" className="break-words">
          {message}
        </p>
      )}
    </section>
  );
}
