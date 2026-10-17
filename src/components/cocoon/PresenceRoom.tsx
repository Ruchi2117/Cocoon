import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Captions,
  CaptionsOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ShieldAlert,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SupportWorkspace } from "@/components/cocoon/SupportWorkspace";
import { SosButton } from "@/components/cocoon/SosPanel";
import { ScriptedPresenceDemo } from "@/components/cocoon/ScriptedPresenceDemo";
import { CallCharacter } from "@/components/cocoon/CallCharacter";
import { WaveText } from "@/components/cocoon/WaveText";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { useProductionAuth } from "@/lib/production/auth";
import { supabase } from "@/integrations/supabase/client";
import { kitContacts, phoneHref, type KitContact } from "@/lib/cocoon/support-session";
import {
  CALL_LIMIT_SECONDS,
  GUEST_CALL_LIMIT_SECONDS,
  RELATIONSHIPS,
  RIDES,
  VOICES,
  callContextSchema,
  callLimits,
  type CallContextInput,
} from "@/lib/cocoon/call-persona";

type Line = { id: number; who: "you" | "them"; text: string };
const blank = {
  mode: "pretend" as "pretend" | "company",
  alias: "Didi",
  relationship: "sister" as keyof typeof RELATIONSHIPS,
  voice: "marin" as keyof typeof VOICES,
  language: "en" as "en" | "hinglish",
  ride: "" as "" | keyof typeof RIDES,
  arrival: "",
  eta: "",
  safeWord: "",
  audioConsent: false,
  roleplayAck: false,
  ageAck: false,
};
const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

/** Build the validated context sent once with the call start. Exported for tests. */
export function toCallContext(f: typeof blank): CallContextInput {
  return {
    mode: f.mode,
    alias: f.alias,
    relationship: f.relationship,
    voice: f.voice,
    language: f.language,
    ride: f.ride || null,
    arrival: f.arrival.trim() || null,
    etaMinutes: f.eta ? Number(f.eta) : null,
    safeWord: f.safeWord.trim() || null,
    audioConsent: f.audioConsent as true,
    roleplayAck: f.roleplayAck as true,
    ageAck: f.ageAck as true,
  };
}

function TrustedDialer({ contacts }: { contacts: KitContact[] }) {
  return (
    <div className="call-dialer">
      <p className="night-eyebrow">Call a real person instead</p>
      {contacts.length ? (
        <ul>
          {contacts.map((c) => (
            <li key={c.number}>
              <a href={phoneHref(c.number) ?? undefined}>
                <Phone size={16} /> {c.name}
                <span>{c.number}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          No trusted numbers saved on this device. <Link to="/kit">Add them in Safety Kit ↗</Link>
        </p>
      )}
      <small>Opens your phone’s dialler. You place the call; Cocoon cannot see it.</small>
    </div>
  );
}

export function PresenceRoom() {
  const { user, ready } = useProductionAuth();
  const limits = callLimits(Boolean(user));
  const [form, setForm] = useState(blank);
  const [sos, setSos] = useState(false);
  const [captureStop, setCaptureStop] = useState(0);
  const [captions, setCaptions] = useState(true);
  const [speaker, setSpeaker] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [contacts, setContacts] = useState<KitContact[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lineId = useRef(0);
  const call = useLiveVoice({
    onEvent: (e: LiveEvent) => {
      const delta = typeof e["delta"] === "string" ? e["delta"] : "";
      if (
        e.type === "session.output_transcript.delta" ||
        e.type === "session.input_transcript.delta"
      ) {
        const who: Line["who"] = e.type === "session.output_transcript.delta" ? "them" : "you";
        if (who === "them") {
          setSpeaking(true);
          clearTimeout(speakTimer.current);
          speakTimer.current = setTimeout(() => setSpeaking(false), 1200);
        }
        if (!delta) return;
        // Ephemeral captions only: last few rows in memory, never stored or sent anywhere.
        setLines((prev) => {
          const last = prev[prev.length - 1];
          if (last?.who === who)
            return [...prev.slice(0, -1), { ...last, text: (last.text + delta).slice(-600) }];
          return [...prev, { id: ++lineId.current, who, text: delta }].slice(-6);
        });
      }
    },
  });
  const live =
    call.status === "connecting" || call.status === "connected" || call.status === "stopping";

  useEffect(() => {
    try {
      setContacts(kitContacts(localStorage.getItem("cocoon-kit-v1")));
    } catch {
      setContacts([]);
    }
  }, []);
  useEffect(() => {
    if (call.status !== "connected") return;
    const started = Date.now();
    const t = setInterval(() => setElapsed((Date.now() - started) / 1000), 500);
    return () => clearInterval(t);
  }, [call.status]);
  useEffect(() => () => clearTimeout(speakTimer.current), []);
  // Captions are ephemeral: clear when a call ends.
  useEffect(() => {
    if (call.status === "closed") setLines([]);
  }, [call.status]);
  // Account switch or sign-out ends any call and drops captions.
  const userId = user?.id ?? null;
  const stopCall = call.stop;
  useEffect(() => {
    return () => {
      stopCall();
      setLines([]);
    };
  }, [userId, stopCall]);
  useEffect(() => {
    if (call.audioRef.current) call.audioRef.current.muted = !speaker;
  }, [speaker, call.audioRef]);

  const parsed = callContextSchema.safeParse(toCallContext(form));
  const start = () => {
    setSetupError(null);
    if (!parsed.success) {
      setSetupError(
        [form.roleplayAck, form.audioConsent, form.ageAck].every(Boolean)
          ? (parsed.error.issues[0]?.message ?? "Review the call setup.")
          : "Tick the three boxes in the setup to start the call.",
      );
      const box = document.querySelector<HTMLInputElement>(
        ".call-consent input:not(:checked), .call-prep input:invalid",
      );
      box?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      box?.focus({ preventScroll: true });
      return;
    }
    setLines([]);
    setElapsed(0);
    setCaptureStop((v) => v + 1);
    const context = parsed.data;
    call.start(async () => {
      if (!user) return { token: "", context }; // signed-out demo call, server-capped
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again to start a live call.");
      return { token, context };
    });
  };
  const openSOS = () => {
    setCaptureStop((v) => v + 1);
    setSos(true);
  };
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const state = !live
    ? "idle"
    : call.status === "connecting"
      ? "ringing"
      : call.status === "stopping"
        ? "ending"
        : speaking
          ? "speaking"
          : "listening";
  const statusText = {
    idle: call.status === "closed" ? "Call ended" : "Ready when you are",
    ringing: "Calling…",
    ending: "Hanging up…",
    speaking: `${form.alias} is talking`,
    listening: call.muted ? "You’re muted" : "On the line",
  }[state];

  return (
    <div className="night-room call-room" data-call={state}>
      <nav className="room-support-nav" aria-label="Private support">
        <Link to="/trip">
          Journey <ArrowUpRight size={15} />
        </Link>
        <Link to="/account">
          Account <ArrowUpRight size={15} />
        </Link>
        <Button variant="destructive" onClick={openSOS} aria-label="Open SOS options">
          <ShieldAlert size={18} /> SOS
        </Button>
      </nav>

      <section className="call-stage" aria-label="Live call">
        <div className="call-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <CallScenery />
        <p className="call-badge">
          <i /> AI voice · pretend call you set up
        </p>
        <div className="call-contact">
          <CallCharacter
            state={
              state === "ringing"
                ? "ringing"
                : state === "ending"
                  ? "ending"
                  : state === "speaking"
                    ? "speaking"
                    : state === "listening"
                      ? call.muted
                        ? "muted"
                        : "listening"
                      : "idle"
            }
            audioRef={call.audioRef}
            name={form.alias.trim()}
          />
          <WaveText as="h1" text={form.alias.trim() || "Your caller"} />
          <p className="call-relation">
            {RELATIONSHIPS[form.relationship]} ·{" "}
            {form.mode === "pretend" ? "expecting you" : "keeping you company"}
          </p>
          <p className="call-status" role="status">
            {statusText}
            {call.status === "connected" && (
              <span>
                {" "}
                · {clock(elapsed)} / {clock(user ? CALL_LIMIT_SECONDS : GUEST_CALL_LIMIT_SECONDS)}
              </span>
            )}
          </p>
        </div>

        {live && captions && (
          <div className="call-captions" aria-live="polite" aria-label="Live captions">
            {lines.length === 0 ? (
              <p className="call-caption-empty">Captions appear here. Not saved.</p>
            ) : (
              lines.map((l) => (
                <p key={l.id} data-who={l.who}>
                  <b>{l.who === "you" ? "You" : form.alias}</b> {l.text}
                </p>
              ))
            )}
          </div>
        )}

        {call.error && (
          <p className="call-error" role="alert">
            {call.error}
          </p>
        )}
        {call.playbackBlocked && (
          <Button variant="outline" onClick={call.resumePlayback}>
            <Volume2 size={18} /> Tap to hear {form.alias}
          </Button>
        )}

        <div className="call-controls">
          {live ? (
            <>
              <button
                type="button"
                className="call-btn"
                aria-pressed={call.muted}
                onClick={() => call.setMuted(!call.muted)}
                disabled={call.status !== "connected"}
              >
                {call.muted ? <MicOff /> : <Mic />}
                <span>{call.muted ? "Unmute" : "Mute"}</span>
              </button>
              <button
                type="button"
                className="call-btn"
                aria-pressed={!speaker}
                onClick={() => setSpeaker(!speaker)}
              >
                {speaker ? <Volume2 /> : <VolumeX />}
                <span>{speaker ? "Sound on" : "Sound off"}</span>
              </button>
              <button
                type="button"
                className="call-btn"
                aria-pressed={captions}
                onClick={() => setCaptions(!captions)}
              >
                {captions ? <Captions /> : <CaptionsOff />}
                <span>Captions</span>
              </button>
              <button
                type="button"
                className="call-btn call-end"
                onClick={call.stop}
                disabled={call.status === "stopping"}
              >
                <PhoneOff />
                <span>End call</span>
              </button>
            </>
          ) : ready ? (
            <button
              type="button"
              className="call-btn call-start"
              onClick={start}
              aria-describedby={parsed.success ? undefined : "call-start-hint"}
            >
              <Phone />
              <span>{user ? "Start call" : "Try a demo call"}</span>
            </button>
          ) : null}
        </div>
        {!live && ready && (setupError || !parsed.success) && (
          <p
            id="call-start-hint"
            className="call-start-hint"
            data-alert={setupError ? "true" : undefined}
            role={setupError ? "alert" : undefined}
          >
            {setupError ?? "Tick the three boxes in the setup to start."}
          </p>
        )}
        {/* Always mounted so the controller can attach remote audio before the call starts. */}
        <audio ref={call.audioRef} className="sr-only" aria-label="Call audio" />

        {!live && ready && !user && (
          <div className="call-unavailable call-guest" role="status">
            <strong>Demo call · real AI voice, 2 minutes, no sign-in</strong>
            <p>
              Demo calls use network-based (IP-based) limits; shared networks may share a limit.{" "}
              <Link to="/account">Sign in ↗</Link> for 5-minute calls.
            </p>
          </div>
        )}
        {!live && call.error && <TrustedDialer contacts={contacts} />}
      </section>

      {!live && (
        <section className="call-prep" aria-label="Call setup">
          <div className="call-prep-head">
            <p className="night-eyebrow">Before you call</p>
            <h2>Who’s picking up?</h2>
          </div>
          <div className="call-mode" role="radiogroup" aria-label="Call type">
            {(
              [
                [
                  "pretend",
                  "Pretend familiar call",
                  "They’re expecting you. Good for a tense ride.",
                ],
                ["company", "Normal company", "A friendly voice to talk to."],
              ] as const
            ).map(([v, title, hint]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={form.mode === v}
                onClick={() => set("mode", v)}
              >
                <strong>{title}</strong>
                <span>{hint}</span>
              </button>
            ))}
          </div>
          <div className="call-fields">
            <label>
              Name they’ll use
              <input
                value={form.alias}
                maxLength={24}
                onChange={(e) => set("alias", e.target.value)}
              />
            </label>
            <label>
              They are your
              <select
                value={form.relationship}
                onChange={(e) => set("relationship", e.target.value as typeof form.relationship)}
              >
                {Object.entries(RELATIONSHIPS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Voice
              <select
                value={form.voice}
                onChange={(e) => set("voice", e.target.value as typeof form.voice)}
              >
                {Object.entries(VOICES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Language
              <select
                value={form.language}
                onChange={(e) => set("language", e.target.value as typeof form.language)}
              >
                <option value="en">English</option>
                <option value="hinglish">Hinglish</option>
              </select>
            </label>
          </div>
          <details className="call-optional">
            <summary>Optional: ride, arrival & safe word</summary>
            <div className="call-fields">
              <label>
                Getting there by
                <select
                  value={form.ride}
                  onChange={(e) => set("ride", e.target.value as typeof form.ride)}
                >
                  <option value="">Don’t say</option>
                  {Object.entries(RIDES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Heading to (general place)
                <input
                  value={form.arrival}
                  maxLength={80}
                  placeholder="e.g. hostel gate"
                  onChange={(e) => set("arrival", e.target.value)}
                />
              </label>
              <label>
                About how many minutes
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={form.eta}
                  onChange={(e) => set("eta", e.target.value)}
                />
              </label>
              <label>
                Safe word
                <input
                  value={form.safeWord}
                  maxLength={24}
                  placeholder="e.g. mango"
                  onChange={(e) => set("safeWord", e.target.value)}
                />
              </label>
            </div>
            <small>
              Avoid exact addresses. If you say the safe word, the voice only reminds you of the SOS
              button — it can’t alert anyone.
            </small>
          </details>
          <div className="call-consent">
            <label>
              <input
                type="checkbox"
                checked={form.roleplayAck}
                onChange={(e) => set("roleplayAck", e.target.checked)}
              />
              I understand this is an AI voice playing a pretend role. It can’t see me, track me,
              come to me or contact anyone.
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.audioConsent}
                onChange={(e) => set("audioConsent", e.target.checked)}
              />
              Send my microphone audio and the details above through Lovable’s AI service to its
              voice provider (OpenAI GPT-Live) for this call. Cocoon doesn’t save audio or
              transcripts; Lovable’s and the provider’s own retention policies apply. Captions stay
              only on this screen until the call ends.
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.ageAck}
                onChange={(e) => set("ageAck", e.target.checked)}
              />
              I’m 18 or older, or a parent/guardian has said I can use AI voice services.
            </label>
          </div>
          <p className="call-fine">
            Up to {limits.seconds / 60} minutes per call, {limits.hourly} calls an hour,{" "}
            {limits.daily} a day.
            {!user &&
              " Network-based limits; shared networks may share the limit. Global availability caps also apply."}{" "}
            Uses this app’s Lovable AI credits; never billed to you.
          </p>
        </section>
      )}

      <details className="call-demo">
        <summary>Scripted browser demo (not AI, no live voice)</summary>
        <ScriptedPresenceDemo onSos={openSOS} />
      </details>

      <div id="presence-desk">
        <SupportWorkspace stopSignal={captureStop} openSignal={0} />
      </div>
      <Dialog open={sos} onOpenChange={setSos}>
        <DialogContent className="room-sos-dialog max-h-[85dvh] overflow-y-auto">
          <DialogTitle>SOS · your explicit choices</DialogTitle>
          <DialogDescription>
            Private in-app guardian alerts and the local demo are separate. No authority dispatch or
            background delivery. The AI call cannot send alerts.
          </DialogDescription>
          <div id="sos-zone">
            <SosButton compact />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Layered night town behind the call: drifting clouds, twinkling windows, swaying trees. */
function CallScenery() {
  return (
    <svg
      className="call-scenery"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <g className="cs-cloud cs-cloud-a">
        <ellipse cx="200" cy="120" rx="90" ry="18" />
        <ellipse cx="250" cy="108" rx="50" ry="16" />
      </g>
      <g className="cs-cloud cs-cloud-b">
        <ellipse cx="900" cy="80" rx="110" ry="16" />
        <ellipse cx="860" cy="70" rx="46" ry="14" />
      </g>
      <path className="cs-hill-far" d="M0 470q200-90 400-30t400-40 400 30v170H0z" />
      <g className="cs-town">
        {[60, 130, 190, 980, 1050, 1120].map((x, i) => (
          <g key={x}>
            <rect x={x} y={400 - (i % 3) * 40} width="54" height={200 + (i % 3) * 40} />
            <rect
              className="cs-win"
              style={{ animationDelay: `${i * 0.9}s` }}
              x={x + 14}
              y={430 - (i % 3) * 40}
              width="9"
              height="11"
            />
            <rect
              className="cs-win"
              style={{ animationDelay: `${i * 1.3 + 0.5}s` }}
              x={x + 31}
              y={460 - (i % 3) * 40}
              width="9"
              height="11"
            />
          </g>
        ))}
      </g>
      <g className="cs-trees">
        {[20, 260, 330, 860, 930, 1170].map((x, i) => (
          <g
            key={x}
            className="cs-tree"
            style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${x}px 600px` }}
          >
            <rect x={x - 3} y="520" width="6" height="80" />
            <path d={`M${x} ${430 + (i % 2) * 30}l34 100h-68z`} />
          </g>
        ))}
      </g>
      <path className="cs-hill-near" d="M0 540q300-50 600-10t600-20v90H0z" />
    </svg>
  );
}
