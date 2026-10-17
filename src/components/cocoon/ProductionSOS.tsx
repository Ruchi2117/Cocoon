import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useProductionAuth } from "@/lib/production/auth";
import { accountData, submitSOS } from "@/lib/production/actions.functions";
import type { locationInput } from "@/lib/production/security";
import type { z } from "zod";
import { WHATSAPP_DISABLED } from "@/lib/production/provider-policy";
export function ProductionSOS() {
  const { user } = useProductionAuth(),
    read = useServerFn(accountData),
    submit = useServerFn(submitSOS);
  const query = useQuery({
    queryKey: ["production-account", user?.id],
    queryFn: () => read(),
    enabled: !!user,
  });
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [note, setNote] = useState(""),
    [location, setLocation] = useState<z.infer<typeof locationInput> | null>(null),
    [locationConsent, setConsent] = useState(false),
    [pending, setPending] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const generation = useRef(0),
    key = useRef<string | null>(null);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const close = () => {
    generation.current++;
    setPending(false);
    setOpen(false);
    setLocation(null);
    setConsent(false);
  };
  const locate = () => {
    const id = ++generation.current;
    setLocation(null);
    setConsent(false);
    if (!navigator.geolocation) {
      setMessage("Location unavailable; continue with a note.");
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (id !== generation.current) return;
        setLocation({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: p.timestamp,
        });
        setPending(false);
      },
      () => {
        if (id !== generation.current) return;
        setPending(false);
        setMessage("Location denied or unavailable; continue without it.");
      },
      { maximumAge: 0, timeout: 10000, enableHighAccuracy: true },
    );
  };
  const contacts =
    query.data?.contacts.filter(
      (g) => g.traveller_id === user?.id && g.consent === "opted_in" && !g.revoked_at,
    ) ?? [];
  return (
    <section className="space-y-3 border-t py-4">
      <p className="text-xs">PRIVATE ACCOUNT / GUARDIAN SOS WIRING</p>
      <p className="text-sm" role="status">
        {WHATSAPP_DISABLED}
      </p>
      {!user ? (
        <p>
          <Link to="/account" className="underline">
            Sign in to configure automatic SOS ↗
          </Link>
        </p>
      ) : !open ? (
        <Button
          variant="destructive"
          onClick={() => {
            key.current = crypto.randomUUID();
            setMessage("");
            setSelected([]);
            setNote("");
            setOpen(true);
          }}
        >
          Prepare a private SOS record
        </Button>
      ) : (
        <div className="space-y-3">
          <h3 className="font-display text-xl">Confirm a guardian SOS</h3>
          <p>
            WhatsApp is disabled. Saving creates a private SOS record and unsent queue entries; it
            does not notify anyone. No authority dispatch or nearby broadcast.
          </p>
          {contacts.length ? (
            contacts.map((g) => (
              <label className="block" key={g.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(g.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? [...selected, g.id] : selected.filter((id) => id !== g.id),
                    )
                  }
                />{" "}
                {g.name} · WhatsApp consent confirmed
              </label>
            ))
          ) : (
            <p>
              No confirmed guardians.{" "}
              <Link to="/account" className="underline">
                Manage enrollment ↗
              </Link>
            </p>
          )}
          <label className="block">
            Optional note
            <textarea
              className="mt-2 w-full border bg-card p-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </label>
          <Button variant="outline" onClick={locate} disabled={pending || busy}>
            Use current one-time location
          </Button>
          {pending && (
            <Button
              variant="ghost"
              onClick={() => {
                generation.current++;
                setPending(false);
              }}
            >
              Cancel location request
            </Button>
          )}
          {location && (
            <div>
              <p>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)} · ±
                {Math.round(location.accuracy)} m · {new Date(location.timestamp).toLocaleString()}{" "}
                · not live tracking
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={locationConsent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                Include this snapshot in my guardian alert
              </label>
              <Button
                variant="ghost"
                onClick={() => {
                  generation.current++;
                  setLocation(null);
                  setConsent(false);
                }}
              >
                Remove location
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={
                busy ||
                pending ||
                !selected.length ||
                !query.data?.prefs ||
                (query.data.prefs.enabled as Record<string, boolean>)["sos"] !== true
              }
              onClick={() =>
                void (async () => {
                  if (!key.current) return;
                  setBusy(true);
                  try {
                    const result = await submit({
                      data: {
                        requestKey: key.current,
                        recipientIds: selected,
                        channel: "whatsapp",
                        note,
                        location: locationConsent ? location : null,
                        locationConsent,
                        destination: "Emergency support request",
                      },
                    });
                    setMessage(
                      `SOS saved. ${result.created.length + result.duplicates.length} unsent queue entry(s). WhatsApp disabled — nobody notified.`,
                    );
                    await query.refetch();
                    close();
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : "SOS could not be saved.");
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              Save private SOS record only
            </Button>
            <Button variant="outline" disabled={busy} onClick={close}>
              Cancel
            </Button>
          </div>
          <Link to="/account" className="underline">
            Preferences & delivery status ↗
          </Link>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

