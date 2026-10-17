import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getWhatsAppStatus } from "@/lib/notify/status.functions";
import type { NotifyEvent } from "@/lib/notify/engine";

type Status = Awaited<ReturnType<typeof getWhatsAppStatus>>;
const LABEL: Record<NotifyEvent, string> = {
  trip_started: "Trip started",
  checkin_overdue: "Check-in overdue",
  concern: "Concern I report",
  sos: "SOS I trigger",
  arrived: "Arrived",
};
const KEY = "cocoon-alert-rules-v1";
interface Draft {
  enabled: Record<NotifyEvent, boolean>;
  graceMinutes: number;
}
const DEFAULT: Draft = {
  enabled: { trip_started: true, checkin_overdue: true, concern: true, sos: true, arrived: true },
  graceMinutes: 10,
};

/** Automatic WhatsApp alerts: real connection status + rule setup. Never simulates sends. */
export function AutoAlertsCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [err, setErr] = useState(false);
  const [draft, setDraft] = useState<Draft>(DEFAULT);
  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setErr(true);
    }, 8000);
    getWhatsAppStatus().then(
      (value) => {
        if (active) {
          setStatus(value);
          setErr(false);
        }
        window.clearTimeout(timeout);
      },
      () => {
        if (active) setErr(true);
        window.clearTimeout(timeout);
      },
    );
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const value = parsed as Partial<Draft>;
          const enabled = { ...DEFAULT.enabled };
          for (const event of Object.keys(LABEL) as NotifyEvent[]) {
            if (typeof value.enabled?.[event] === "boolean") enabled[event] = value.enabled[event];
          }
          setDraft({
            enabled,
            graceMinutes:
              typeof value.graceMinutes === "number" && Number.isFinite(value.graceMinutes)
                ? Math.min(60, Math.max(5, value.graceMinutes))
                : 10,
          });
        }
      }
    } catch {
      /* ignore */
    }
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);
  const save = (d: Draft) => {
    setDraft(d);
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  };
  const live = Boolean(status?.live);

  return (
    <section className="card-soft space-y-3 p-4" aria-labelledby="auto-alerts">
      <div>
        <p className="eyebrow">Automatic WhatsApp alerts</p>
        <h2 id="auto-alerts" className="text-lg font-semibold">
          Automatic alerts · unavailable
        </h2>
      </div>
      {!status && !err && <p className="text-sm text-muted-foreground">Checking connection…</p>}
      {(err || (status && !live)) && (
        <div
          role="status"
          className="flex gap-2 rounded-xl border border-coral/50 bg-coral/10 p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
          <div>
            <p className="font-semibold">WhatsApp not connected — automatic messages unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Automatic sending is disabled under the zero-payment policy. Your choices below are
              local drafts only; nobody is notified. No provider account or credentials are
              requested.
              {status && !status.paymentPolicyBlocked && (
                <>
                  {" "}
                  Missing: {!status.storageConfigured && "secure backend and sign-in; "}
                  {!status.repositoryConnected && "persistent alert queue and server scheduler; "}
                  {status.providerMissing.length > 0 &&
                    `WhatsApp business sender settings (${status.providerMissing.length})`}
                  .
                </>
              )}
            </p>
          </div>
        </div>
      )}
      {live && (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" /> Connected — alerts send from Cocoon's business number
        </p>
      )}

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Local demo setup draft only</legend>
        {(Object.keys(LABEL) as NotifyEvent[]).map((e) => (
          <label key={e} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.enabled[e]}
              onChange={(ev) =>
                save({ ...draft, enabled: { ...draft.enabled, [e]: ev.target.checked } })
              }
            />
            {LABEL[e]}
          </label>
        ))}
        <label className="flex items-center gap-2 pt-1 text-sm">
          Overdue after a missed check-in, wait
          <input
            type="number"
            min={5}
            max={60}
            value={draft.graceMinutes}
            onChange={(ev) =>
              save({
                ...draft,
                graceMinutes: Math.min(60, Math.max(5, Number(ev.target.value) || 10)),
              })
            }
            className="w-16 rounded-lg border bg-background px-2 py-1"
            aria-label="Grace period in minutes"
          />
          min
        </label>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        A missed check-in only means you didn't tap “I'm okay” — the message says so, and isn't
        proof of danger. Contacts receive alerts only after they opt in. Alerts contain destination
        and ETA, never chat transcripts, and are never triggered by the AI companion's guesses.
        {!live &&
          " These local drafts never enable production alerts. Save real preferences in your private account."}
      </p>
      <Link to="/account" className="text-sm underline">
        Private guardian enrollment & production preferences ↗
      </Link>
    </section>
  );
}

