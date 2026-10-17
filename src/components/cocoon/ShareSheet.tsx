import { useEffect, useMemo, useState } from "react";
import { Copy, MessageCircle, MessageSquare, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  buildMessage,
  intlDigits,
  logHandoff,
  smsUrl,
  whatsappUrl,
  type LocationSnapshot,
  type ShareKind,
} from "@/lib/cocoon/share";
import type { LatLng } from "@/lib/cocoon/types";

const KIND_LABEL: Record<ShareKind, string> = {
  trip: "Journey started",
  check_in: "Check-in",
  arrived: "Arrived",
  concern: "I'm concerned",
};

interface Contact {
  name: string;
  number: string;
}
function kitContacts(): Contact[] {
  try {
    const k = JSON.parse(localStorage.getItem("cocoon-kit-v1") ?? "{}") as Partial<
      Record<"trustedName" | "trustedNumber" | "security" | "securityNumber", string>
    >;
    return [
      { name: k.trustedName || "Trusted person", number: k.trustedNumber ?? "" },
      { name: k.security || "Security", number: k.securityNumber ?? "" },
    ].filter((c) => c.number.trim());
  } catch {
    return [];
  }
}

export function ShareSheet({
  initialKind,
  destination,
  etaMinutes,
  simulatedPosition,
  onClose,
}: {
  initialKind: ShareKind;
  destination: string;
  etaMinutes: number;
  simulatedPosition: LatLng;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ShareKind>(initialKind);
  const [includeLoc, setIncludeLoc] = useState(false); // excluded by default
  const [snap, setSnap] = useState<LocationSnapshot | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recipient, setRecipient] = useState(""); // "" = choose in WhatsApp
  const [edited, setEdited] = useState<string | null>(null);

  useEffect(() => setContacts(kitContacts()), []);

  const generated = useMemo(
    () => buildMessage({ kind, destination, etaMinutes, location: includeLoc ? snap : null }),
    [kind, destination, etaMinutes, includeLoc, snap],
  );
  const text = edited ?? generated;
  const chosen = contacts.find((c) => c.number === recipient);
  const chosenValid = chosen ? intlDigits(chosen.number) : null;
  const canWebShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const useGps = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available in this browser.");
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setSnap({
          at: [p.coords.latitude, p.coords.longitude],
          takenAt: new Date(),
          accuracy: `device location, about ±${Math.round(p.coords.accuracy)} m`,
        });
        setEdited(null);
        setLocBusy(false);
      },
      () => {
        setLocBusy(false);
        toast.error(
          "Location permission denied — you can share without it or use the demo position.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const copyText = () =>
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        logHandoff({ kind, channel: "copy", includedLocation: includeLoc && !!snap });
        toast.success("Message copied — paste it into any app.");
      })
      .catch(() => toast.error("Couldn't copy — select the text and copy it manually."));

  return (
    <div
      className="fixed inset-0 z-[1200] grid place-items-end bg-foreground/40 p-3 sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
    >
      <div className="panel-ink max-h-[92vh] w-full max-w-lg overflow-y-auto bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Share outside Cocoon</p>
            <h2 id="share-title" className="font-poster text-4xl">
              Send an update
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Update type">
          {(Object.keys(KIND_LABEL) as ShareKind[]).map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k);
                setEdited(null);
              }}
              className={`rounded-full border px-3 py-1 text-sm ${kind === k ? "bg-foreground text-background" : ""}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <fieldset className="mt-4 rounded-2xl border p-3 text-sm">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={includeLoc}
              onChange={(e) => {
                setIncludeLoc(e.target.checked);
                setEdited(null);
              }}
            />
            Include a location snapshot
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Off by default. A one-time map link with time and accuracy — not live tracking.
          </p>
          {includeLoc && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={useGps}
                disabled={locBusy}
              >
                {locBusy ? "Locating…" : "Use my device location"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => {
                  setSnap({
                    at: simulatedPosition,
                    takenAt: new Date(),
                    accuracy: "simulated demo position, not real GPS",
                  });
                  setEdited(null);
                }}
              >
                Use demo position
              </Button>
              {!snap && (
                <span className="text-xs text-muted-foreground">Pick a source to add it.</span>
              )}
            </div>
          )}
        </fieldset>

        <label className="mt-4 grid gap-1 text-sm">
          <span className="font-medium">Message (you can edit)</span>
          <textarea
            value={text}
            onChange={(e) => setEdited(e.target.value)}
            rows={6}
            className="rounded-xl border bg-background p-3 text-sm"
          />
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Times use your device's time zone. No chat transcript or private trip link is included.
        </p>

        <label className="mt-3 grid gap-1 text-sm">
          <span className="font-medium">WhatsApp recipient</span>
          <select
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="rounded-xl border bg-background px-3 py-2"
          >
            <option value="">Choose in WhatsApp</option>
            {contacts.map((c) => (
              <option key={c.number} value={c.number}>
                {c.name} · {c.number}
              </option>
            ))}
          </select>
        </label>
        {chosen && !chosenValid && (
          <p className="mt-1 text-xs text-coral" role="alert">
            This number needs a full international format (e.g. +44 7700 900123). You'll choose the
            recipient in WhatsApp instead.
          </p>
        )}
        {!contacts.length && (
          <p className="mt-1 text-xs text-muted-foreground">
            Save contacts in Safety Kit to pick one here.
          </p>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild className="rounded-full sm:col-span-2" size="lg">
            <a
              href={whatsappUrl(text, chosenValid ? chosen!.number : null)}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                logHandoff({ kind, channel: "whatsapp", includedLocation: includeLoc && !!snap })
              }
            >
              <MessageCircle className="h-4 w-4" /> Open WhatsApp — you send it there
            </a>
          </Button>
          {canWebShare && (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() =>
                navigator
                  .share({ text })
                  .then(() =>
                    logHandoff({
                      kind,
                      channel: "web_share",
                      includedLocation: includeLoc && !!snap,
                    }),
                  )
                  .catch(() => {})
              }
            >
              <Share2 className="h-4 w-4" /> Share…
            </Button>
          )}
          <Button variant="outline" className="rounded-full" onClick={copyText}>
            <Copy className="h-4 w-4" /> Copy message
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <a
              href={smsUrl(text, chosenValid ? chosen!.number : null)}
              onClick={() =>
                logHandoff({ kind, channel: "sms", includedLocation: includeLoc && !!snap })
              }
            >
              <MessageSquare className="h-4 w-4" /> Text message
            </a>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cocoon only opens the app — it can't see whether the message was sent, delivered or read,
          and this doesn't count as a guardian acknowledgement. If WhatsApp doesn't open, copy the
          message instead.
        </p>
      </div>
    </div>
  );
}
