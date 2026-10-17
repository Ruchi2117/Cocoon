import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useProductionAuth } from "@/lib/production/auth";
import {
  confirmInAppGuardian,
  inappAccountData,
  inviteInAppGuardian,
  openInAppAlert,
  retrieveInAppInbox,
  revokeInAppGuardian,
} from "@/lib/production/inapp.functions";
import { INAPP_LIMITATION, INAPP_POLL_MS, type InAppAlert } from "@/lib/production/inapp-schema";
import { publicMapUrl } from "@/lib/cocoon/share";
import { setJourneyConsent } from "@/lib/production/journey.functions";
import { JourneyGuardianView } from "./JourneyGuardianView";

export function InAppGuardians() {
  const { user } = useProductionAuth();
  const read = useServerFn(inappAccountData),
    invite = useServerFn(inviteInAppGuardian),
    confirm = useServerFn(confirmInAppGuardian),
    revoke = useServerFn(revokeInAppGuardian),
    retrieve = useServerFn(retrieveInAppInbox),
    open = useServerFn(openInAppAlert),
    journeyConsent = useServerFn(setJourneyConsent);
  const [visible, setVisible] = useState(false),
    [inboxOpen, setInboxOpen] = useState(false);
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [token, setToken] = useState(""),
    [consent, setConsent] = useState(false),
    [link, setLink] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [opened, setOpened] = useState<InAppAlert | null>(null);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const query = useQuery({
    queryKey: ["inapp-account", user?.id],
    queryFn: () => read(),
    enabled: !!user,
  });
  const inbox = useQuery({
    queryKey: ["inapp-inbox", user?.id],
    queryFn: () => retrieve(),
    enabled: !!user && visible && inboxOpen,
    refetchInterval: visible && inboxOpen ? INAPP_POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
  });
  useEffect(() => {
    const sync = () => {
      setVisible(document.visibilityState === "visible");
      setOpened(null);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const invitation = hash.get("inapp") ?? sessionStorage.getItem("cocoon-inapp-invitation") ?? "";
    setToken(invitation);
    if (invitation) sessionStorage.setItem("cocoon-inapp-invitation", invitation);
    if (hash.has("inapp")) history.replaceState(null, "", window.location.pathname);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  useEffect(() => {
    setOpened(null);
    setInboxOpen(false);
  }, [user?.id]);
  // Poll results are authoritative for current consent; clear an open detail if access disappears.
  useEffect(() => {
    if (inbox.data)
      setOpened((old) => (old && inbox.data.some((a) => a.id === old.id) ? old : null));
    if (inbox.error) setOpened(null);
  }, [inbox.data, inbox.error]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await query.refetch();
      if (inboxOpen && visible) await inbox.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "In-app request unavailable.");
      setOpened(null);
    } finally {
      setBusy(false);
    }
  };
  if (!user) return null;
  return (
    <section className="space-y-4 border-t pt-4">
      <h2 className="font-display text-2xl">In-app guardian alerts · real account</h2>
      <p>{INAPP_LIMITATION}</p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const result = await invite({ data: { name, email } });
            setLink(window.location.origin + "/account#inapp=" + encodeURIComponent(result.token));
          });
        }}
      >
        <label>
          Guardian name
          <input
            className="mt-1 block w-full border bg-card p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
          />
        </label>
        <label>
          Guardian sign-in email
          <input
            className="mt-1 block w-full border bg-card p-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <Button disabled={busy}>Create in-app invitation</Button>
      </form>
      {link && (
        <div>
          <p>
            Share this invitation yourself; expires in seven days and accepts only the invited
            verified email.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              void run(async () => {
                await navigator.clipboard.writeText(link);
              })
            }
          >
            Copy in-app invitation
          </Button>
        </div>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await confirm({ data: { token, consent: true } });
            setToken("");
            setConsent(false);
            sessionStorage.removeItem("cocoon-inapp-invitation");
          });
        }}
      >
        <h3 className="font-display text-xl">Accept in-app guardian invitation</h3>
        <label>
          In-app invitation token
          <input
            className="mt-1 block w-full border bg-card p-2"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label className="block">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />{" "}
          I opt into this traveller’s in-app SOS alerts, including any note and location snapshot
          they choose. No phone number or WhatsApp consent.
        </label>
        <Button disabled={busy || !consent}>Confirm in-app consent</Button>
      </form>
      {query.error && <p role="alert">In-app connections unavailable; refresh to retry.</p>}
      <div>
        <h3 className="font-display text-xl">In-app connections</h3>
        {query.data?.contacts.map((g) => (
          <div className="my-2 flex flex-wrap items-center gap-3" key={g.id}>
            <span>
              {g.name} · {g.traveller_id === user.id ? "Your guardian" : "You are the guardian"} ·{" "}
              {g.consent.replaceAll("_", " ")}
            </span>
            {g.recipient_id === user.id && g.consent === "opted_in" && !g.revoked_at && (
              <label className="text-sm">
                <input
                  type="checkbox"
                  checked={g.journey_opt_in ?? false}
                  disabled={busy}
                  onChange={(e) => {
                    const consent = e.target.checked;
                    void run(async () => {
                      await journeyConsent({ data: { id: g.id, consent } });
                    });
                  }}
                />{" "}
                I also consent to this traveller’s selected journey status, check-ins and optional
                snapshots while my inbox is open.
              </label>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !!g.revoked_at}
              onClick={() =>
                void run(async () => {
                  await revoke({ data: g.id });
                  setOpened(null);
                })
              }
            >
              Revoke in-app consent
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-display text-xl">Guardian inbox</h3>
        <Button
          variant="outline"
          onClick={() => {
            setOpened(null);
            setInboxOpen(!inboxOpen);
          }}
        >
          {inboxOpen ? "Close guardian inbox" : "Open guardian inbox"}
        </Button>
        {inboxOpen && (
          <>
            <p role="status">
              {visible
                ? "Inbox open · checks every 30 seconds"
                : "Inbox paused while this page is hidden"}
              . Delivered means retrieved by your signed-in inbox; read means explicitly opened, not
              proof you acted.
            </p>
            <Button
              variant="outline"
              disabled={!visible || inbox.isFetching || busy}
              onClick={() => void inbox.refetch()}
            >
              Refresh guardian inbox
            </Button>
            {inbox.isPending && <p>Loading guardian inbox…</p>}
            {inbox.error && (
              <p role="alert">
                Inbox unavailable; no delivery is confirmed here. Refresh to retry.
              </p>
            )}
            {!inbox.error && inbox.data?.length === 0 && <p>No in-app alerts.</p>}
            {!inbox.error &&
              inbox.data?.map((a) => (
                <article className="space-y-2 border-b py-3" key={a.id}>
                  <p>
                    SOS from {a.traveller_name} · {new Date(a.created_at).toLocaleString()}
                  </p>
                  <p>
                    {a.read_at
                      ? "Read · explicitly opened"
                      : a.delivered_at
                        ? "Delivered · inbox retrieved"
                        : "Stored"}{" "}
                    · {a.acknowledged_at ? "Acknowledged" : "Not acknowledged"}
                  </p>
                  <Button
                    size="sm"
                    disabled={busy || !visible}
                    onClick={() =>
                      void run(async () => {
                        const id = user.id;
                        const result = await open({ data: { id: a.id, acknowledge: false } });
                        if (identity.current === id && document.visibilityState === "visible")
                          setOpened(result);
                      })
                    }
                  >
                    Open SOS alert
                  </Button>
                </article>
              ))}
            {opened && visible && (
              <div className="space-y-2 border-l-2 pl-4" aria-label="Opened guardian SOS">
                <h4 className="font-display text-xl">SOS from {opened.traveller_name}</h4>
                <p className="whitespace-pre-wrap break-words">
                  {opened.note || "No note shared."}
                </p>
                {opened.location ? (
                  <>
                    <p>
                      {opened.location.latitude.toFixed(5)}, {opened.location.longitude.toFixed(5)}{" "}
                      · ±{Math.round(opened.location.accuracy)} m ·{" "}
                      {new Date(opened.location.timestamp).toLocaleString()} · one-time snapshot,
                      not live tracking
                    </p>
                    <a
                      className="underline"
                      href={publicMapUrl([opened.location.latitude, opened.location.longitude])}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open shared snapshot on map ↗
                    </a>
                  </>
                ) : (
                  <p>No location shared.</p>
                )}
                <p>
                  Acknowledgement means you chose to acknowledge, not that help is dispatched or
                  arriving.
                </p>
                <Button
                  disabled={busy || !!opened.acknowledged_at}
                  onClick={() =>
                    void run(async () => {
                      const id = user.id;
                      const result = await open({ data: { id: opened.id, acknowledge: true } });
                      if (identity.current === id && document.visibilityState === "visible")
                        setOpened(result);
                    })
                  }
                >
                  {opened.acknowledged_at ? "Acknowledged" : "Acknowledge this in-app SOS"}
                </Button>
                <Button variant="ghost" onClick={() => setOpened(null)}>
                  Close alert
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <JourneyGuardianView open={inboxOpen} />
      <div>
        <h3 className="font-display text-xl">Your sent in-app SOS alerts</h3>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Refresh in-app status
        </Button>
        {query.data?.sent.map((a) => (
          <p className="my-2" key={a.id}>
            {query.data.contacts.find((g) => g.id === a.enrollment_id)?.name ?? "Guardian"} ·{" "}
            {a.read_at
              ? "Read · opened"
              : a.delivered_at
                ? "Delivered · inbox retrieved"
                : "Stored · not retrieved"}{" "}
            · {a.acknowledged_at ? "Acknowledged" : "Not acknowledged"}
          </p>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
