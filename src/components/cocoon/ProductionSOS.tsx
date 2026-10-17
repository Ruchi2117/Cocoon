import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useProductionAuth } from "@/lib/production/auth";
import {
  inappAccountData,
  readEmergencyDraft,
  submitInAppSOS,
} from "@/lib/production/inapp.functions";
import { WHATSAPP_DISABLED } from "@/lib/production/provider-policy";
import { INAPP_LIMITATION, type inappSOSInput } from "@/lib/production/inapp-schema";
import type { locationInput } from "@/lib/production/security";
import type { z } from "zod";
export function ProductionSOS() {
  const { user, ready } = useProductionAuth();
  return (
    <section className="space-y-3 border-t py-4">
      <p className="text-xs">PRIVATE ACCOUNT / REAL IN-APP GUARDIAN SOS</p>
      <p className="text-sm">{INAPP_LIMITATION} The local SOS demo is separate.</p>
      <p className="text-sm" role="status">
        {WHATSAPP_DISABLED}
      </p>
      {ready === false ? (
        <p>Checking account…</p>
      ) : user ? (
        <OwnerSOS key={user.id} userId={user.id} />
      ) : (
        <Link to="/account" className="underline">
          Sign in for real in-app guardian SOS ↗
        </Link>
      )}
    </section>
  );
}
function OwnerSOS({ userId }: { userId: string }) {
  const read = useServerFn(inappAccountData),
    draftRead = useServerFn(readEmergencyDraft),
    submit = useServerFn(submitInAppSOS),
    cache = useQueryClient();
  const query = useQuery({
    queryKey: ["inapp-account", userId],
    queryFn: () => read(),
    retry: false,
  });
  const draft = useQuery({
    queryKey: ["emergency-draft", userId],
    queryFn: () => draftRead(),
    retry: false,
  });
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [note, setNote] = useState(""),
    [includeDraft, setInclude] = useState(false),
    [introduction, setIntroduction] = useState(""),
    [help, setHelp] = useState(""),
    [location, setLocation] = useState<z.infer<typeof locationInput> | null>(null),
    [locationConsent, setConsent] = useState(false),
    [locating, setLocating] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [review, setReview] = useState<Omit<z.infer<typeof inappSOSInput>, "requestKey"> | null>(
    null,
  );
  const generation = useRef(0),
    mounted = useRef(true),
    request = useRef<{ signature: string; key: string } | null>(null),
    prepared = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    const invalidate = () => {
      mounted.current = false;
      generation.current++;
    };
    return invalidate;
  }, []);
  const contacts =
    query.data?.contacts.filter(
      (g) => g.traveller_id === userId && g.consent === "opted_in" && !g.revoked_at,
    ) ?? [];
  const valid =
    selected.length >= 1 &&
    selected.length <= 5 &&
    selected.every((id) => contacts.some((g) => g.id === id));
  const edit = () => {
    setReview(null);
    prepared.current = null;
  };
  const clear = () => {
    generation.current++;
    setOpen(false);
    setSelected([]);
    setNote("");
    setInclude(false);
    setIntroduction("");
    setHelp("");
    setLocation(null);
    setConsent(false);
    setLocating(false);
    setReview(null);
    request.current = null;
    prepared.current = null;
  };
  const refresh = async () => {
    setReview(null);
    prepared.current = null;
    await query.refetch();
    await draft.refetch();
  };
  const locate = () => {
    edit();
    const current = ++generation.current;
    setLocation(null);
    setConsent(false);
    if (!navigator.geolocation) {
      setMessage("Location unavailable; continue without it.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!mounted.current || current !== generation.current) return;
        setLocation({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: p.timestamp,
        });
        setLocating(false);
      },
      () => {
        if (!mounted.current || current !== generation.current) return;
        setLocating(false);
        setMessage("Location denied or unavailable; continue without it.");
      },
      { maximumAge: 0, timeout: 10000, enableHighAccuracy: true },
    );
  };
  const prepare = () => {
    if (!valid || !draft.data || busy || locating || query.error || draft.error) return;
    if (!prepared.current) prepared.current = new Date().toISOString();
    setReview({
      recipientIds: [...selected].sort(),
      channel: "in_app",
      note,
      location: locationConsent ? location : null,
      locationConsent,
      content: {
        includeDraft,
        introduction: includeDraft ? introduction : "",
        helpInstructions: includeDraft ? help : "",
        senderName: draft.data.senderName,
        preparedAt: prepared.current,
      },
    });
  };
  const send = async () => {
    if (!review || busy || !valid) return;
    const signature = JSON.stringify(review);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    setMessage("");
    try {
      const result = await submit({ data: { ...review, requestKey: request.current.key } });
      if (!mounted.current) return;
      clear();
      setMessage(
        `${result.duplicate ? "Existing SOS confirmed" : "SOS stored"} for ${result.count} selected recipient(s). Stored is not retrieved, read or acknowledged. See each recipient’s receipts in Account. No external dispatch.`,
      );
      await cache.invalidateQueries({ queryKey: ["inapp-account", userId] });
    } catch (e) {
      if (mounted.current)
        setMessage(
          e instanceof Error
            ? e.message
            : "SOS not confirmed stored. Retry the same review, or edit for a new request.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      {!open ? (
        <Button
          variant="destructive"
          onClick={() => {
            clear();
            setMessage("");
            setOpen(true);
            void query.refetch();
            void draft.refetch();
          }}
        >
          Prepare in-app guardian SOS
        </Button>
      ) : (
        <>
          <h3 className="font-display text-xl">What will be sent / who receives it</h3>
          <p>
            Explicitly choose 1–5 currently opted-in guardians. Saving a preference never sends an
            alert. No newly accepted contacts are automatically chosen.
          </p>
          <Button
            variant="outline"
            disabled={busy || query.isFetching || draft.isFetching}
            onClick={() => void refresh()}
          >
            Refresh in-app guardians & emergency preferences
          </Button>
          {(query.isPending || draft.isPending) && (
            <p role="status">Loading private SOS preferences…</p>
          )}
          {(query.error || draft.error) && (
            <p role="alert">SOS preferences or guardians unavailable. Refresh before reviewing.</p>
          )}
          <fieldset disabled={busy} className="space-y-3">
            {contacts.map((g) => (
              <label key={g.id} className="block">
                <input
                  type="checkbox"
                  checked={selected.includes(g.id)}
                  onChange={(e) => {
                    edit();
                    setSelected(
                      e.target.checked ? [...selected, g.id] : selected.filter((id) => id !== g.id),
                    );
                  }}
                />{" "}
                {g.name} · in-app consent confirmed
                {draft.data?.draft?.preferredRecipientIds.includes(g.id)
                  ? " · preferred (not selected automatically)"
                  : ""}
              </label>
            ))}
            {!contacts.length && !query.isPending && (
              <p>No confirmed guardians. Manage enrollment in Account.</p>
            )}
            {selected.some((id) => !contacts.some((g) => g.id === id)) && (
              <p role="alert">
                A selected guardian is no longer eligible. Clear unavailable selections and review
                again.
              </p>
            )}
            {selected.some((id) => !contacts.some((g) => g.id === id)) && (
              <Button
                variant="outline"
                onClick={() => {
                  edit();
                  setSelected(selected.filter((id) => contacts.some((g) => g.id === id)));
                }}
              >
                Remove unavailable recipients
              </Button>
            )}
            <label className="block">
              Optional note
              <textarea
                className="mt-1 w-full border bg-card p-2"
                maxLength={500}
                value={note}
                onChange={(e) => {
                  edit();
                  setNote(e.target.value);
                }}
              />
            </label>
            <label className="block">
              <input
                type="checkbox"
                checked={includeDraft}
                onChange={(e) => {
                  edit();
                  setInclude(e.target.checked);
                  if (e.target.checked) {
                    setIntroduction(draft.data?.draft?.introduction ?? "");
                    setHelp(draft.data?.draft?.helpInstructions ?? "");
                  } else {
                    setIntroduction("");
                    setHelp("");
                  }
                }}
              />{" "}
              Include an optional emergency introduction / help instructions in this SOS only
            </label>
            {includeDraft && (
              <>
                <label className="block">
                  Introduction for this SOS (optional)
                  <textarea
                    className="mt-1 w-full border bg-card p-2"
                    value={introduction}
                    maxLength={300}
                    onChange={(e) => {
                      edit();
                      setIntroduction(e.target.value);
                    }}
                  />
                </label>
                <label className="block">
                  Help instructions for this SOS (optional)
                  <textarea
                    className="mt-1 w-full border bg-card p-2"
                    value={help}
                    maxLength={500}
                    onChange={(e) => {
                      edit();
                      setHelp(e.target.value);
                    }}
                  />
                </label>
                <p>These edits affect this SOS snapshot only, not your saved draft.</p>
              </>
            )}
            <Button variant="outline" disabled={locating} onClick={locate}>
              Use current one-time location
            </Button>
            {locating && (
              <Button
                variant="ghost"
                onClick={() => {
                  generation.current++;
                  setLocating(false);
                  edit();
                }}
              >
                Cancel location request
              </Button>
            )}
            {location && (
              <>
                <p>
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · ±
                  {Math.round(location.accuracy)} m ·{" "}
                  {new Date(location.timestamp).toLocaleString()} · not live tracking
                </p>
                <label className="block">
                  <input
                    type="checkbox"
                    checked={locationConsent}
                    onChange={(e) => {
                      edit();
                      setConsent(e.target.checked);
                    }}
                  />{" "}
                  Include this snapshot in my guardian alert
                </label>
                <Button
                  variant="ghost"
                  onClick={() => {
                    generation.current++;
                    setLocation(null);
                    setConsent(false);
                    edit();
                  }}
                >
                  Remove location
                </Button>
              </>
            )}
            <Button
              disabled={
                !valid ||
                locating ||
                !draft.data ||
                !!query.error ||
                !!draft.error ||
                query.isFetching ||
                draft.isFetching
              }
              onClick={prepare}
            >
              Review in-app SOS
            </Button>
            {review && (
              <div aria-label="SOS review" className="space-y-2 border-l-2 pl-4">
                <p>
                  Sender: {review.content?.senderName} · account {userId}
                </p>
                <p>
                  Prepared:{" "}
                  {review.content?.preparedAt &&
                    new Date(review.content.preparedAt).toLocaleString()}
                </p>
                <p>
                  Recipients:{" "}
                  {contacts
                    .filter((g) => review.recipientIds.includes(g.id))
                    .map((g) => g.name)
                    .join(", ")}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  Introduction:{" "}
                  {review.content?.includeDraft
                    ? review.content.introduction || "Not included."
                    : "Draft omitted."}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  Help / instructions:{" "}
                  {review.content?.includeDraft
                    ? review.content.helpInstructions || "Not included."
                    : "Draft omitted."}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  Note: {review.note || "No note shared."}
                </p>
                <p>
                  {review.location
                    ? `Location: ${review.location.latitude}, ${review.location.longitude} · ±${review.location.accuracy} m · ${new Date(review.location.timestamp).toLocaleString()} · one-time, not live tracking`
                    : "No location shared."}
                </p>
                <p>
                  No transcripts, media, medical/contact scraping or journey details are included.
                  Stored alerts are immutable. Guardians must open their inbox; no authorities or
                  WhatsApp contacted.
                </p>
                <Button
                  variant="destructive"
                  className="h-auto whitespace-normal py-2"
                  disabled={
                    !valid || locating || query.isFetching || !!query.error || !!draft.error
                  }
                  onClick={() => void send()}
                >
                  Confirm in-app SOS to selected guardians
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => {
                clear();
                setMessage("");
              }}
            >
              Cancel
            </Button>
          </fieldset>
          <Link to="/account" className="underline">
            Emergency draft, preferences & per-recipient receipts ↗
          </Link>
        </>
      )}
      {message && (
        <p role="status" className="break-words">
          {message}
        </p>
      )}
    </div>
  );
}
