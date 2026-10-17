import { Link, useHydrated } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
import {
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Settings2,
  Volume2,
  VolumeX,
  Square,
  RotateCcw,
  Pause,
  Play,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PresenceBuddy } from "@/components/cocoon/PresenceBuddy";
import { useBrowserSession } from "@/components/cocoon/useBrowserSession";
import { useDemoState } from "@/lib/cocoon/store";
import { activeTrip } from "@/lib/cocoon/access";
import { usePrefs } from "@/lib/cocoon/locale";
import { type PresenceAction } from "@/lib/cocoon/presence-script";
import type { SessionPhase } from "@/lib/cocoon/browser-session";

const labels: Record<SessionPhase, string> = {
  idle: "Here, in your own time",
  connecting: "Starting browser speech",
  listening: "Listening · one turn",
  thinking: "Choosing a scripted reply",
  speaking: "Speaking · browser voice",
  muted: "Mic off · your turn",
  error: "Paused · action needed",
  ended: "Session ended",
};
/** Collapsed, explicitly scripted browser-speech demo. Never the primary call, never AI. */
export function ScriptedPresenceDemo({ onSos }: { onSos: () => void }) {
  const prefs = usePrefs();
  const demo = useDemoState();
  const trip = activeTrip(demo);
  const { snapshot: s, controller } = useBrowserSession(() => ({
    country: prefs.country,
    ...(trip ? { demoDestination: trip.destination } : {}),
  }));
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState(false);
  const [still, setStill] = useState(false);
  const [dim, setDim] = useState(false);
  const [visible, setVisible] = useState(true);
  const [, setCaptureStop] = useState(0);
  const scene = useRef<HTMLElement>(null);
  const inView = useInView(scene);
  const hydrated = useHydrated();
  const reducePreference = useReducedMotion();
  const reduced = hydrated && !!reducePreference;
  const previousMode = useRef(s.mode);
  const previousActive = useRef(s.active);
  const captionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hide = () => {
      setVisible(!document.hidden);
      if (document.hidden) setCaptureStop((v) => v + 1);
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    if ((previousActive.current && !s.active) || previousMode.current !== s.mode)
      setCaptureStop((v) => v + 1);
    previousActive.current = s.active;
    previousMode.current = s.mode;
  }, [s.active, s.mode]);
  useEffect(() => {
    const el = captionRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.messages.length, s.interim]);
  const last = [...s.messages].reverse().find((m) => m.from === "companion");
  const openSOS = () => {
    controller.current?.interrupt();
    onSos();
  };
  const action = (action: PresenceAction) => {
    if (action === "sos") openSOS();
    if (action === "recording") {
      controller.current?.interrupt();
      document
        .getElementById("presence-desk")
        ?.scrollIntoView({ behavior: "instant", block: "start" });
    }
  };
  return (
    <div className="night-room" data-still={still || reduced || !visible || !inView} data-dim={dim}>
      <section
        className="listening-room"
        ref={scene}
        aria-label="Night listening room"
        data-phase={s.phase}
      >
        <div className="room-architecture" aria-hidden="true">
          <svg viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
            <path
              className="room-window"
              d="M80 530V190q0-100 115-100t115 100v340Zm710 0V190q0-100 115-100t115 100v340Z"
            />
            <path
              className="room-tracery"
              d="M195 90v440M80 275h230M905 90v440m-115-255h230M0 600q600-75 1200 0M0 635q600-40 1200 0M0 670h1200"
            />
            <path
              className="room-skyline"
              d="M80 470h35v-80h35v45h40v-70h50v95h70m480 10h40v-55h40v-85h45v113h40v-60h65"
            />
            <path
              className="room-curtain"
              d="M38 0q50 230 12 575M354 0q-60 230-13 575M745 0q50 230 12 575M1065 0q-60 230-13 575"
            />
            <path
              className="room-stars"
              d="M131 216h9m-4-4v8m92-63h9m-4-4v8m634 82h9m-4-4v8m91-95h9m-4-4v8"
            />
            <path className="room-table" d="M370 691h460m-390 0-30 69m380-69 30 69" />
          </svg>
        </div>
        <div className="room-topline">
          <span>
            <i /> {s.mode === "text" ? "Text companion" : "Browser speech"} · scripted
          </span>
          <div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDim(!dim)}
              aria-label={dim ? "Brighten the room" : "Dim the room"}
              aria-pressed={dim}
            >
              <Sparkles size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStill(!still)}
              disabled={reduced}
              aria-label={
                reduced
                  ? "Reduced motion enabled"
                  : still
                    ? "Resume scene motion"
                    : "Pause scene motion"
              }
              aria-pressed={still || reduced}
            >
              {still || reduced ? <Play size={18} /> : <Pause size={18} />}
            </Button>
          </div>
        </div>
        <div className="room-center">
          <PresenceBuddy phase={s.phase} onInterrupt={() => controller.current?.interrupt()} />
          <p className="room-status" role="status">
            <span className="room-status-dot" />
            {labels[s.phase]}
          </p>
          <div className="room-caption" aria-live="polite">
            {s.interim ? (
              <p>“{s.interim}”</p>
            ) : (
              <p>
                {last?.text ??
                  "A little company. A moment to ground yourself. One next step. What would help tonight?"}
              </p>
            )}
          </div>
        </div>
        <div className="room-console">
          <div className="room-mode" aria-label="Conversation mode">
            <Button
              variant="ghost"
              aria-pressed={s.mode === "text"}
              onClick={() => controller.current?.setMode("text")}
            >
              <MessageCircle size={16} /> Text first
            </Button>
            <Button
              variant="ghost"
              aria-pressed={s.mode === "voice"}
              onClick={() => controller.current?.setMode("voice")}
            >
              <Volume2 size={16} /> Browser voice
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettings(!settings)}
              aria-label="Voice settings"
              aria-expanded={settings}
              title="Voice settings"
            >
              <Settings2 size={18} />
            </Button>
          </div>
          <div className="room-call-controls">
            {!s.active ? (
              <Button onClick={() => controller.current?.start()}>
                Begin {s.mode === "text" ? "text session" : "browser session"}
              </Button>
            ) : (
              <>
                {s.mode === "voice" && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      s.phase === "listening" || s.phase === "connecting"
                        ? controller.current?.interrupt()
                        : controller.current?.listen()
                    }
                    title="Listening is one explicit turn"
                  >
                    <>
                      {s.phase === "listening" ? <MicOff size={18} /> : <Mic size={18} />}{" "}
                      {s.phase === "listening" || s.phase === "connecting"
                        ? "Stop listening / playback"
                        : "Listen once"}
                    </>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => controller.current?.interrupt()}
                  disabled={!["speaking", "thinking", "connecting", "listening"].includes(s.phase)}
                  aria-label="Stop speaking or pending turn"
                  title="Stop speaking or pending turn"
                >
                  <Square size={18} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => controller.current?.repeat()}
                  disabled={!last || !s.speechSupported}
                  aria-label="Repeat last reply"
                  title="Repeat last reply"
                >
                  <RotateCcw size={18} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => controller.current?.setSpeaker(!s.speaker)}
                  aria-pressed={s.speaker}
                  disabled={!s.speechSupported}
                  aria-label={s.speaker ? "Mute browser playback" : "Enable browser playback"}
                  title="Browser playback"
                >
                  {s.speaker ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    controller.current?.end();
                    setInput("");
                  }}
                >
                  <PhoneOff size={18} /> End
                </Button>
              </>
            )}
          </div>
          {s.notice && (
            <p className="room-notice" role={s.phase === "error" ? "alert" : "status"}>
              {s.notice}
            </p>
          )}
          {s.mode === "voice" && !s.recognitionSupported && hydrated && (
            <p className="room-notice">
              Recognition unavailable here. Type instead; browser playback may still be available.
            </p>
          )}
          {settings && (
            <div className="room-settings">
              <label>
                Browser voice
                <select
                  value={s.voiceId}
                  disabled={!s.speechSupported}
                  onChange={(e) => controller.current?.setVoice(e.target.value)}
                >
                  <option value="">Device default</option>
                  {s.voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {v.lang}
                      {v.local ? " · local voice" : " · browser service"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Speaking rate · {s.rate.toFixed(1)}×
                <input
                  type="range"
                  min="0.7"
                  max="1.3"
                  step="0.1"
                  value={s.rate}
                  disabled={!s.speechSupported}
                  onChange={(e) => controller.current?.setRate(Number(e.target.value))}
                />
              </label>
              <p>
                {s.speechSupported
                  ? s.voices.length
                    ? "Changing voice or rate stops current playback. Repeat only when you choose."
                    : "No named voices reported yet. Device default may be available."
                  : "Speech playback is unavailable. Full text companion remains usable."}
              </p>
            </div>
          )}
        </div>
      </section>
      <section className="room-conversation" aria-label="Guided conversation">
        <div className="room-dialogue">
          <div className="transcript-heading">
            <h2>In your own words.</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                controller.current?.clear();
                setInput("");
                setCaptureStop((v) => v + 1);
              }}
            >
              Clear session
            </Button>
          </div>
          <div
            className="room-transcript"
            ref={captionRef}
            role="log"
            aria-label="Session transcript"
            aria-live="polite"
          >
            {s.messages.length === 0 ? (
              <p className="transcript-empty">
                Choose an intention or type a message. No microphone needed.
              </p>
            ) : (
              s.messages.map((m) => (
                <div className="room-turn" data-from={m.from} key={m.id}>
                  <span>{m.from === "you" ? "You" : "Cocoon · scripted"}</span>
                  <p>{m.text}</p>
                  {m.actions && (
                    <div className="room-reply-actions">
                      {m.actions.map((a) =>
                        a === "journey" ? (
                          <Link key={a} to="/trip">
                            Open Journey ↗
                          </Link>
                        ) : a === "kit" ? (
                          <Link key={a} to="/kit">
                            Safety Kit ↗
                          </Link>
                        ) : (
                          <Button variant="outline" size="sm" key={a} onClick={() => action(a)}>
                            {a === "sos" ? "Review SOS options" : "Recording & sharing"}
                          </Button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <form
            className="room-compose"
            onSubmit={(e) => {
              e.preventDefault();
              const text = input;
              setInput("");
              void controller.current?.send(text);
            }}
          >
            <label className="sr-only" htmlFor="presence-message">
              Your message
            </label>
            <textarea
              id="presence-message"
              rows={2}
              value={input}
              maxLength={1000}
              placeholder="What’s on your mind?"
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              aria-label="Send message"
              title="Send message"
            >
              <Send size={20} />
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
