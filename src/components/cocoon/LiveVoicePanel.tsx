import { useProductionAuth, bearerHeaders } from "@/lib/production/auth";
import { Link } from "@tanstack/react-router";
import { PresenceBuddy } from "./PresenceBuddy";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { connectLiveVoice, type LiveVoiceHandle } from "@/lib/cocoon/live-voice";
import { useDemoState } from "@/lib/cocoon/store";
import { usePrefs } from "@/lib/cocoon/locale";
import { activeTrip } from "@/lib/cocoon/access";
import { type CallPhase, Waveform } from "./art";
import { GEMINI_LIVE_UNAVAILABLE, VOICE_DISABLED } from "@/lib/production/provider-policy";

export interface LiveVoiceControls {
  startSupport: () => boolean;
  end: () => void;
}
export function LiveVoicePanel({
  controlRef,
  onEnded,
}: {
  controlRef?: Ref<LiveVoiceControls>;
  onEnded?: () => void;
}) {
  const { user } = useProductionAuth();
  const [audioConsent, setAudioConsent] = useState(false);
  const [contextConsent, setContextConsent] = useState(false);
  const s = useDemoState(),
    prefs = usePrefs(),
    trip = activeTrip(s);
  const [available, setAvailable] = useState(false),
    [checked, setChecked] = useState(false);
  const [phase, setPhase] = useState<CallPhase>("idle"),
    [error, setError] = useState(""),
    [caption, setCaption] = useState("");
  const [on, setOn] = useState(false),
    [muted, setMuted] = useState(false),
    [speaker, setSpeaker] = useState(true);
  const [intention, setIntention] = useState<"company" | "grounding" | "next-step">("company");
  const [situation, setSituation] = useState("");
  const [shareTrip, setShareTrip] = useState(false);
  const starting = useRef(false);
  const audioChoices = useRef({ muted: false, speaker: true });
  const conn = useRef<LiveVoiceHandle | null>(null),
    ctrl = useRef<AbortController | null>(null);
  useEffect(() => {
    const c = new AbortController();
    void bearerHeaders()
      .then((headers) => fetch("/api/companion/voice", { signal: c.signal, headers }))
      .then((r) => r.json())
      .then((d: { available?: boolean }) => {
        if (!c.signal.aborted) {
          setAvailable(!!d.available);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!c.signal.aborted) setChecked(true);
      });
    return () => {
      c.abort();
      ctrl.current?.abort();
      conn.current?.close();
    };
  }, [user?.id]);
  const end = () => {
    ctrl.current?.abort();
    starting.current = false;
    conn.current?.close();
    conn.current = null;
    setOn(false);
    setPhase("idle");
    setMuted(false);
    setSpeaker(true);
    audioChoices.current = { muted: false, speaker: true };
    setCaption("");
    onEnded?.();
  };
  const start = async (supportMode = false) => {
    if (starting.current || conn.current || !available || !audioConsent) return;
    starting.current = true;
    setError("");
    setCaption("");
    setOn(true);
    setPhase("connecting");
    const c = new AbortController();
    ctrl.current = c;
    let ended = false;
    try {
      const connection = await connectLiveVoice({
        signal: c.signal,
        contextConsent,
        context: {
          supportMode,
          intention,
          ...(contextConsent ? { situation: situation.trim() } : {}),
          name: s.companion.name,
          style: s.companion.style,
          country: prefs.country,
          ...(trip && shareTrip && contextConsent
            ? {
                destination: trip.destination,
                eta: trip.etaMinutes,
                sharing: trip.sharing === "active",
              }
            : {}),
        },
        onClosed: () => {
          ended = true;
          if (!c.signal.aborted && ctrl.current === c) {
            starting.current = false;
            conn.current = null;
            setOn(false);
            setPhase((value) => (value === "error" ? "error" : "idle"));
            setMuted(false);
            setSpeaker(true);
            audioChoices.current = { muted: false, speaker: true };
            onEnded?.();
          }
        },
        onPhase: (p) => {
          if (!c.signal.aborted) setPhase(p);
        },
        onCaption: (t) => {
          if (!c.signal.aborted) setCaption(t);
        },
        onError: (t) => {
          if (!c.signal.aborted) setError(t);
        },
      });
      if (c.signal.aborted || ended || ctrl.current !== c) connection.close();
      else {
        conn.current = connection;
        connection.mute(audioChoices.current.muted);
        connection.speaker(audioChoices.current.speaker);
      }
    } catch (e) {
      if (!c.signal.aborted && ctrl.current === c) {
        starting.current = false;
        setError(e instanceof Error ? e.message : "Voice unavailable.");
        setPhase("error");
        setOn(false);
      }
    }
  };
  useImperativeHandle(controlRef, () => ({
    startSupport: () => {
      if (!available || !audioConsent) {
        setError(
          "Natural voice is not connected. Choose Browser demo explicitly to try scripted support, or use the contact and SOS controls.",
        );
        return false;
      }
      if (!on) void start(true);
      return true;
    },
    end,
  }));
  return (
    <section className="live-voice-panel">
      <div className="presence-kicker">
        <span>COCOON PRESENCE / NATURAL VOICE</span>
        <span>{available ? "Provider configured" : "Disabled · zero payment"}</span>
      </div>
      <div className="presence-title">
        A LITTLE
        <br />
        <em>COMPANY.</em>
      </div>
      <PresenceBuddy
        phase={muted && phase === "listening" ? "muted" : phase}
        onInterrupt={() => conn.current?.interrupt()}
      />
      <p className="text-center text-sm" aria-live="polite">
        {on
          ? phase === "connecting"
            ? "Connecting securely…"
            : phase === "error"
              ? "Connection interrupted"
              : `${s.companion.name} · ${phase}`
          : "Natural AI voice · disabled"}
      </p>
      <div className="my-4 flex justify-center">
        <Waveform active={phase === "speaking" || phase === "listening"} tone="light" />
      </div>
      <p
        className="mx-auto min-h-16 max-w-lg text-center text-sm leading-relaxed"
        aria-live="polite"
      >
        {caption ||
          (available
            ? "Speak naturally, interrupt, or take a quiet moment. The companion is AI, and cannot contact authorities."
            : VOICE_DISABLED)}
      </p>
      {!available && (
        <p className="mx-auto mb-4 max-w-lg text-center text-xs leading-relaxed">
          {GEMINI_LIVE_UNAVAILABLE}
        </p>
      )}
      {!on && (
        <fieldset className="voice-brief" disabled={!checked || !available}>
          {!user && (
            <Link to="/account" className="underline">
              Private account · natural voice stays disabled ↗
            </Link>
          )}
          <label>
            <input
              type="checkbox"
              checked={audioConsent}
              onChange={(e) => setAudioConsent(e.target.checked)}
            />{" "}
            I choose to share microphone audio with OpenAI for this AI call.
          </label>
          <label>
            <input
              type="checkbox"
              checked={contextConsent}
              onChange={(e) => setContextConsent(e.target.checked)}
            />{" "}
            Include my optional note and selected demo trip summary.
          </label>
          <legend>What would help right now?</legend>
          <div className="voice-intentions">
            {(
              [
                ["company", "Keep me company"],
                ["grounding", "Help me feel grounded"],
                ["next-step", "Find my next step"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={intention === value}
                onClick={() => setIntention(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            Anything you want your companion to know?{" "}
            <small>Optional - shared with the AI when you call</small>
            <textarea
              value={situation}
              maxLength={300}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="I'm waiting for my ride and would like some company."
            />
          </label>
          {trip && (
            <label className="voice-trip-choice">
              <input
                type="checkbox"
                checked={shareTrip}
                onChange={(e) => setShareTrip(e.target.checked)}
              />{" "}
              Share my demo destination, ETA and sharing status with the AI
            </label>
          )}
          <p>
            Exact coordinates, contact details and recordings are excluded. You can call without a
            trip.
          </p>
        </fieldset>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {on ? (
          <>
            <button
              className="voice-control"
              onClick={() => {
                audioChoices.current.muted = !muted;
                conn.current?.mute(!muted);
                setMuted(!muted);
              }}
              aria-label={muted ? "Unmute live microphone" : "Mute live microphone"}
              aria-pressed={muted}
            >
              {muted ? <MicOff /> : <Mic />}
            </button>
            <button className="voice-end" onClick={end}>
              <PhoneOff size={20} /> End call
            </button>
            <button
              className="voice-control"
              onClick={() => {
                audioChoices.current.speaker = !speaker;
                conn.current?.speaker(!speaker);
                setSpeaker(!speaker);
              }}
              aria-pressed={!speaker}
              aria-label={speaker ? "Mute live speaker" : "Unmute live speaker"}
            >
              {speaker ? <Volume2 /> : <VolumeX />}
            </button>
          </>
        ) : (
          <button
            className="voice-start"
            onClick={() => void start()}
            disabled={!available || !checked || !audioConsent}
          >
            <Phone size={18} />
            {!checked
              ? "Checking connection…"
              : available
                ? `Call ${s.companion.name}`
                : "Live voice not connected"}
          </button>
        )}
      </div>
      {on && (phase === "speaking" || phase === "thinking") && (
        <button
          className="voice-control mx-auto mt-4 flex"
          onClick={() => conn.current?.interrupt()}
        >
          Let me speak
        </button>
      )}
      {on && muted && (
        <p role="status" className="mt-3 text-center text-sm">
          Microphone muted - the AI cannot hear you.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-amber">
          {error}
        </p>
      )}
      <p className="mt-7 border-t border-background/20 pt-4 text-xs leading-relaxed opacity-75">
        Starting a live call shares microphone audio, your chosen note and any opted-in trip summary
        with the configured AI provider. This panel does not save audio or transcripts. Ending the
        call closes the connection and microphone. Guardian updates and SOS require the app's
        separate buttons.
      </p>
    </section>
  );
}
