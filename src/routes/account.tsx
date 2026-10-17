import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useProductionAuth } from "@/lib/production/auth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import {
  accountData,
  savePreferences,
  inviteGuardian,
  confirmGuardian,
  revokeGuardian,
  acknowledgeAlert,
  updateEmergency,
} from "@/lib/production/actions.functions";
import type { Rules, OutboxMessage, TripSnapshot } from "@/lib/notify/engine";
import { WHATSAPP_DISABLED, VOICE_DISABLED } from "@/lib/production/provider-policy";
export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Private account · Cocoon" },
      {
        name: "description",
        content: "Private guardian consent, automatic alert preferences and delivery status.",
      },
      { property: "og:title", content: "Private account · Cocoon" },
      {
        property: "og:description",
        content:
          "Private guardian consent and SOS records. Paid voice and WhatsApp remain disabled.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});
const initial: Rules["enabled"] = {
  trip_started: false,
  checkin_overdue: false,
  concern: false,
  sos: false,
  arrived: false,
};
function AccountPage() {
  const { user, ready } = useProductionAuth(),
    cache = useQueryClient(),
    navigate = useNavigate();
  const read = useServerFn(accountData),
    save = useServerFn(savePreferences),
    invite = useServerFn(inviteGuardian),
    confirm = useServerFn(confirmGuardian),
    revoke = useServerFn(revokeGuardian),
    ack = useServerFn(acknowledgeAlert),
    update = useServerFn(updateEmergency);
  const query = useQuery({
    queryKey: ["production-account", user?.id],
    queryFn: () => read(),
    enabled: !!user,
  });
  const [displayName, setName] = useState("Traveller"),
    [rules, setRules] = useState(initial),
    [grace, setGrace] = useState(5),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [contactName, setContactName] = useState(""),
    [email, setEmail] = useState(""),
    [link, setLink] = useState(""),
    [token, setToken] = useState(""),
    [phone, setPhone] = useState(""),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    if (query.data) {
      setName(query.data.profile?.display_name ?? "Traveller");
      setRules((query.data.prefs?.enabled as unknown as Rules["enabled"]) ?? initial);
      setGrace(query.data.prefs?.grace_minutes ?? 5);
    }
  }, [query.data]);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const invitation =
      hash.get("guardian") ?? sessionStorage.getItem("cocoon-guardian-invitation") ?? "";
    setToken(invitation);
    if (invitation) sessionStorage.setItem("cocoon-guardian-invitation", invitation);
    if (hash.has("guardian")) history.replaceState(null, "", window.location.pathname);
  }, []);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      if (user) await query.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request unavailable.");
    } finally {
      setBusy(false);
    }
  };
  if (!ready) return <p>Checking account…</p>;
  if (!user)
    return (
      <section className="space-y-4">
        <h1 className="font-poster text-4xl">YOUR PRIVATE COCOON.</h1>
        <p>
          Sign in for private guardian enrollment and SOS records. WhatsApp and natural AI voice are
          disabled under the zero-payment policy. The local demo remains available.
        </p>
        <div className="flex flex-wrap gap-3">
          {(["google", "lovable"] as const).map((provider) => (
            <Button
              key={provider}
              onClick={() =>
                void run(async () => {
                  const result = await lovable.auth.signInWithOAuth(provider, {
                    redirect_uri: window.location.origin + "/account",
                  });
                  if (result.error) throw result.error;
                })
              }
            >
              Sign in with {provider === "google" ? "Google" : "Lovable"}
            </Button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
      </section>
    );
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="font-poster text-4xl">YOUR PRIVATE COCOON.</h1>
        <Button
          variant="outline"
          onClick={() =>
            void run(async () => {
              await cache.cancelQueries();
              cache.clear();
              await supabase.auth.signOut();
              await navigate({ to: "/account", replace: true });
            })
          }
        >
          Sign out
        </Button>
      </div>
      <p>Signed in as {user.email}. Private production records are separate from the local demo.</p>
      {query.error && <p role="alert">Could not load private account data.</p>}
      <form
        className="space-y-3 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => save({ data: { displayName, enabled: rules, graceMinutes: grace } }));
        }}
      >
        <h2 className="font-display text-2xl">Automatic alert preferences</h2>
        <label className="block">
          Display name
          <input
            className="ml-3 border bg-card p-2"
            value={displayName}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <p>
          WhatsApp business notifications only. Authority dispatch and nearby broadcast are
          unavailable.
        </p>
        {(Object.keys(initial) as (keyof typeof initial)[]).map((event) => (
          <label key={event} className="block">
            <input
              type="checkbox"
              checked={rules[event]}
              onChange={(e) => setRules({ ...rules, [event]: e.target.checked })}
            />{" "}
            {
              {
                trip_started: "Journey started",
                checkin_overdue: "Check-in overdue (not proof of danger)",
                concern: "Concern you deliberately authorize",
                sos: "SOS you deliberately confirm",
                arrived: "Arrival you confirm",
              }[event]
            }
          </label>
        ))}
        <label className="block">
          Overdue grace (minutes)
          <input
            className="ml-3 w-20 border bg-card p-2"
            type="number"
            min={1}
            max={60}
            value={grace}
            onChange={(e) => setGrace(Number(e.target.value))}
          />
        </label>
        <Button disabled={busy}>Save private preferences</Button>
      </form>
      <form
        className="space-y-3 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const result = await invite({ data: { name: contactName, email } });
            setLink(
              window.location.origin + "/account#guardian=" + encodeURIComponent(result.token),
            );
          });
        }}
      >
        <h2 className="font-display text-2xl">Invite a guardian</h2>
        <input
          aria-label="Guardian name"
          className="border bg-card p-2"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          maxLength={60}
          placeholder="Name"
          required
        />
        <input
          aria-label="Guardian email"
          className="ml-2 border bg-card p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Their sign-in email"
          required
        />
        <Button className="ml-2" disabled={busy}>
          Create invitation
        </Button>
        {link && (
          <div>
            <p>
              Share this invitation yourself. It expires in seven days; only the named verified
              account can accept.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(link)}
            >
              Copy invitation
            </Button>
          </div>
        )}
      </form>
      <form
        className="space-y-3 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => confirm({ data: { token, phone, consent: true } }));
        }}
      >
        <h2 className="font-display text-2xl">Confirm a guardian invitation</h2>
        <input
          aria-label="Invitation token"
          className="w-full border bg-card p-2"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Invitation token"
          autoComplete="off"
          required
        />
        <input
          aria-label="Your WhatsApp number"
          className="border bg-card p-2"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+country code and number"
          required
        />
        <label className="block">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{" "}
          I own this number and opt into this traveller’s WhatsApp safety alerts.
        </label>
        <Button disabled={!consent || busy}>Confirm WhatsApp consent</Button>
      </form>
      <div className="border-t pt-4">
        <h2 className="font-display text-2xl">Your guardian connections</h2>
        {query.data?.contacts.map((g) => (
          <div className="my-3 flex flex-wrap items-center gap-3" key={g.id}>
            <span>
              {g.name} · {g.consent.replaceAll("_", " ")}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || g.consent === "opted_out"}
              onClick={() => void run(() => revoke({ data: g.id }))}
            >
              Revoke consent
            </Button>
          </div>
        ))}
      </div>
      <div className="border-t pt-4">
        <h2 className="font-display text-2xl">Emergency sessions</h2>
        {query.data?.sessions.map((s) => {
          const trip = s.payload as unknown as TripSnapshot;
          return (
            <div className="my-3 space-y-2" key={s.id}>
              <p>
                {trip.destination} · {trip.status} · {new Date(s.created_at).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy || trip.status !== "active"}
                  onClick={() => void run(() => update({ data: { id: s.id, action: "check_in" } }))}
                >
                  Check in
                </Button>
                <Button
                  size="sm"
                  disabled={busy || trip.status !== "active"}
                  onClick={() => void run(() => update({ data: { id: s.id, action: "arrived" } }))}
                >
                  I’ve arrived
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || trip.status !== "active"}
                  onClick={() =>
                    void run(() => update({ data: { id: s.id, action: "cancelled" } }))
                  }
                >
                  Cancel
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t pt-4">
        <h2 className="font-display text-2xl">Alert delivery & acknowledgement</h2>
        <p>
          Queued and accepted are not delivered. Acknowledgement is a separate action by your
          guardian.
        </p>
        <p>
          {WHATSAPP_DISABLED} Open this page and refresh to read permitted records; there is no
          background or push delivery.
        </p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Refresh status
        </Button>
        {query.data?.messages.map((m) => {
          const payload = m.payload as unknown as OutboxMessage;
          return (
            <div key={m.id} className="my-3 border-b pb-3">
              <p>
                {payload.event} · {m.status} ·{" "}
                {payload.acknowledgedAt ? "Guardian acknowledged" : "No acknowledgement"}
              </p>
              {payload.lastError && <p>{payload.lastError}</p>}
              {query.data?.contacts.some(
                (g) => g.id === m.recipient_id && g.recipient_id === user.id,
              ) && (
                <Button
                  size="sm"
                  disabled={busy || !!payload.acknowledgedAt}
                  onClick={() => void run(() => ack({ data: m.id }))}
                >
                  Acknowledge this alert
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p role="alert">{error}</p>}
      <Link to="/presence" className="underline">
        Presence · browser demo / disabled natural voice ↗
      </Link>
      <p className="text-sm">{VOICE_DISABLED}</p>
    </section>
  );
}

