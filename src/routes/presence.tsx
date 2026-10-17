import { BalancedColumns } from "@/components/cocoon/BalancedColumns";
import { PresenceBuddy } from "@/components/cocoon/PresenceBuddy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Backpack,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Settings2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion } from "motion/react";
import { BreathingGuide, Waveform, type CallPhase } from "@/components/cocoon/art";
import { SupportWorkspace } from "@/components/cocoon/SupportWorkspace";
import { LiveVoicePanel, type LiveVoiceControls } from "@/components/cocoon/LiveVoicePanel";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/cocoon/AppShell";
import { Pill, SimLabel } from "@/components/cocoon/ui";
import { SosButton } from "@/components/cocoon/SosPanel";
import { getState, now, setState, uid, useDemoState } from "@/lib/cocoon/store";
import { activeTrip, openIncident } from "@/lib/cocoon/access";
import { checkIn, sendConcern, updateResultText } from "@/lib/cocoon/actions";
import {
  demoProvider,
  isDeepVoice,
  listVoices,
  rankVoices,
  speak,
  type SpeakHandle,
} from "@/lib/cocoon/companion";
import { profileById } from "@/lib/cocoon/seed";
import type { ChatMessage, CompanionSettings } from "@/lib/cocoon/types";
import { usePrefs } from "@/lib/cocoon/locale";

export const Route = createFileRoute("/presence")({
  head: () => ({
    meta: [
      { title: "Cocoon Presence · your journey companion" },
      {
        name: "description",
        content:
          "A configurable voice companion that knows your trip context and keeps SOS one tap away.",
      },
      { property: "og:title", content: "Cocoon Presence" },
      { property: "og:description", content: "A calm, confident companion for your walk home." },
    ],
  }),
  component: () => (
    <RoleGate role="traveller">
      <Presence />
    </RoleGate>
  ),
});

const addMsg = (m: Omit<ChatMessage, "id" | "at">) =>
  setState((s) => ({ ...s, chat: [...s.chat, { ...m, id: uid("m"), at: now() }].slice(-100) }));
const setCompanion = (p: Partial<CompanionSettings>) =>
  setState((s) => ({ ...s, companion: { ...s.companion, ...p } }));

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  abort: () => void;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean } & ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
function getSR(): (new () => Rec) | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as {
    SpeechRecognition?: new () => Rec;
    webkitSpeechRecognition?: new () => Rec;
  };
  return W.SpeechRecognition ?? W.webkitSpeechRecognition ?? null;
}
const PHASE_LABEL: Record<CallPhase, string> = {
  idle: "Ready",
  connecting: "Starting browser voice…",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Something went wrong",
  muted: "Mic muted — type below",
};
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function Presence() {
  const [voiceMode, setVoiceMode] = useState<"demo" | "live">("demo");
  const [showCalm, setShowCalm] = useState(false);
  const [captureStopSignal, setCaptureStopSignal] = useState(0);
  const naturalVoice = useRef<LiveVoiceControls>(null);
  const supportRequested = useRef(false);
  const prefs = usePrefs();
  const s = useDemoState();
  const c = s.companion;
  const trip = activeTrip(s);
  const guardian = trip?.sharing === "active" ? profileById(trip.guardianId) : null;
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const previousChatCount = useRef(s.chat.length);
  const live = useRef({
    inCall: false,
    muted: false,
    rec: null as Rec | null,
    speech: null as SpeakHandle | null,
    timers: [] as number[],
    busy: false,
    turn: 0,
    mounted: true,
  });
  const cleanupLatest = useRef(() => {});

  useEffect(() => {
    const load = () => setVoices(rankVoices(listVoices().filter((v) => v.lang.startsWith("en"))));
    load();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", load);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }
    return () => {};
  }, []);
  useEffect(() => {
    if (s.chat.length > previousChatCount.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    previousChatCount.current = s.chat.length;
  }, [s.chat.length]);
  useEffect(() => {
    if (!connectedAt) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [connectedAt]);

  const stopRec = () => {
    const r = live.current.rec;
    live.current.rec = null;
    if (r) {
      r.onend = null;
      r.onresult = null;
      r.onerror = null;
      try {
        r.abort();
      } catch {
        /* already stopped */
      }
    }
    setInterim("");
  };
  const stopSpeech = () => {
    live.current.speech?.cancel();
    live.current.speech = null;
  };
  const cleanup = () => {
    live.current.turn++;
    live.current.inCall = false;
    live.current.busy = false;
    stopRec();
    stopSpeech();
    live.current.timers.forEach((t) => clearTimeout(t));
    live.current.timers = [];
  };
  cleanupLatest.current = cleanup;
  useEffect(() => {
    const session = live.current;
    session.mounted = true;
    return () => {
      session.mounted = false;
      cleanupLatest.current();
    };
  }, []);

  const listen = () => {
    if (!live.current.inCall) return;
    if (live.current.muted) return setPhase("muted");
    const SR = getSR();
    setPhase("listening");
    if (!SR) {
      setPhase("muted");
      setMicNote("Speech recognition isn't supported in this browser — type your replies below.");
      return;
    }
    stopRec();
    const rec = new SR();
    rec.lang = navigator.language.startsWith("en") ? navigator.language : "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let txt = "";
      let final = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        txt += r[0]?.transcript ?? "";
        if (r.isFinal) final = true;
      }
      setInterim(txt);
      if (final && txt.trim()) void handleUser(txt);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        live.current.muted = true;
        setMuted(true);
        setMicNote("Microphone permission was blocked. You can keep talking by typing below.");
        setPhase("muted");
      } else if (e.error === "network") {
        live.current.muted = true;
        setMuted(true);
        setPhase("muted");
        setMicNote(
          "Browser speech recognition lost its connection. Type below, or unmute to retry.",
        );
      } else if (e.error === "audio-capture") {
        live.current.muted = true;
        setMuted(true);
        setPhase("muted");
        setMicNote("No microphone is available. You can still type your replies.");
      }
    };
    rec.onend = () => {
      if (live.current.rec !== rec) return;
      live.current.rec = null;
      // Keep the turn open while the call is live (no recording is kept; nothing is saved but final text).
      if (live.current.inCall && !live.current.muted && !live.current.busy)
        live.current.timers.push(window.setTimeout(listen, 350));
    };
    live.current.rec = rec;
    try {
      rec.start();
    } catch {
      /* start race; onend will retry */
    }
  };

  const say = (text: string) => {
    const st = getState();
    if (!st.companion.speak || !("speechSynthesis" in window)) {
      live.current.busy = false;
      return listen();
    }
    setPhase("speaking");
    live.current.speech = speak(text, st.companion.voiceURI, st.companion.style, {
      onEnd: () => {
        live.current.speech = null;
        live.current.busy = false;
        if (live.current.inCall) listen();
        else setPhase("idle");
      },
    });
  };

  const handleUser = async (text: string) => {
    const t = text.trim().slice(0, 1000);
    if (!t) return;
    stopRec();
    stopSpeech(); // interruption: a new turn always cancels prior speech
    live.current.busy = true;
    const turn = ++live.current.turn;
    addMsg({ from: "user", text: t });
    setPhase("thinking");
    const st = getState();
    try {
      const r = await demoProvider.reply(t, {
        settings: st.companion,
        trip: activeTrip(st),
        guardianName: guardian?.name ?? null,
        incidentOpen: !!openIncident(st),
        history: st.chat,
        country: prefs.country,
      });
      await new Promise((res) => setTimeout(res, 380));
      if (!live.current.mounted || live.current.turn !== turn) return;
      addMsg({ from: "companion", text: r.text, actions: r.actions });
      if (live.current.inCall || getState().companion.speak) say(r.text);
      else live.current.busy = false;
      if (!live.current.inCall && !live.current.speech) setPhase("idle");
    } catch {
      if (!live.current.mounted || live.current.turn !== turn) return;
      live.current.busy = false;
      setPhase("error");
      setMicNote(
        "That reply didn't complete. Try again or use the journey actions; SOS is still available.",
      );
    }
  };

  const startCall = () => {
    const supporting = supportRequested.current;
    supportRequested.current = false;
    cleanup();
    live.current.inCall = true;
    live.current.muted = muted;
    setInCall(true);
    setMicNote(
      getSR()
        ? null
        : "Speech recognition isn't supported here — you'll type, and " +
            c.name +
            " will speak back.",
    );
    setPhase("connecting");
    live.current.timers.push(
      window.setTimeout(() => {
        if (!live.current.inCall) return;
        setConnectedAt(Date.now());
        const name = s.companion.name;
        const greet = supporting
          ? `I’m ${name}, your AI companion. We can take one thing at a time. Do you need help reaching someone now?`
          : trip
            ? `Hi, I’m ${name}, your AI companion. Your demo journey is set for ${trip.destination}, about ${trip.etaMinutes} minutes out. I'm here. How are you doing?`
            : `Hi, I’m ${name}, your AI companion. Would you like to talk about your day, or focus on your next step?`;
        addMsg({ from: "companion", text: greet });
        live.current.busy = true;
        say(greet);
      }, 900),
    );
  };
  const endCall = () => {
    setCaptureStopSignal((value) => value + 1);
    cleanup();
    setInCall(false);
    setConnectedAt(null);
    setPhase("idle");
    addMsg({ from: "system", text: "Call ended. Microphone and voice stopped." });
  };
  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    live.current.muted = m;
    if (m) {
      stopRec();
      if (phase === "listening") setPhase("muted");
    } else if (live.current.inCall && !live.current.busy) listen();
  };
  const interrupt = () => {
    if (phase !== "speaking") return;
    stopSpeech();
    live.current.busy = false;
    listen();
  };

  const action = (a: NonNullable<ChatMessage["actions"]>[number]) => {
    if (a === "guardian_update") setPendingConfirm(true);
    if (a === "check_in") {
      const result = checkIn();
      addMsg({
        from: "system",
        text: updateResultText(result),
      });
    }
    if (a === "share_eta")
      addMsg({
        from: "system",
        text: trip
          ? `Sharing: destination ${trip.destination}, ETA ${trip.etaMinutes} min, latest simulated location.`
          : "No active trip.",
      });
    if (a === "sos") document.getElementById("sos-zone")?.scrollIntoView({ behavior: "smooth" });
  };
  const lastCompanion = [...s.chat].reverse().find((m) => m.from === "companion");
  const elapsed = connectedAt ? Math.floor((Date.now() - connectedAt) / 1000) + tick * 0 : 0;

  return (
    <div className="presence-studio grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="provider-switch lg:col-span-2" aria-label="Voice mode">
        <div>
          <p className="eyebrow">Cocoon Presence</p>
          <h1 className="font-poster text-4xl">
            YOUR NIGHT.
            <br />
            <em>A LITTLE LIGHT.</em>
          </h1>
          <p className="presence-studio-intro">
            A voice beside you. Space to talk, type, or take a quiet moment.
          </p>
        </div>
        <div className="flex gap-1">
          <button
            aria-pressed={voiceMode === "demo"}
            onClick={() => {
              cleanup();
              setInCall(false);
              setConnectedAt(null);
              setPhase("idle");
              setCaptureStopSignal((value) => value + 1);
              setVoiceMode("demo");
            }}
          >
            Browser demo
          </button>
          <button
            aria-pressed={voiceMode === "live"}
            onClick={() => {
              cleanup();
              setInCall(false);
              setConnectedAt(null);
              setPhase("idle");
              setCaptureStopSignal((value) => value + 1);
              setVoiceMode("live");
            }}
          >
            Natural AI voice
          </button>
        </div>
      </div>
      <BalancedColumns className="grid gap-6 lg:grid-cols-[1fr_340px] lg:col-span-2">
        {voiceMode === "live" ? (
          <LiveVoicePanel
            controlRef={naturalVoice}
            onEnded={() => setCaptureStopSignal((value) => value + 1)}
          />
        ) : (
          <section className="presence-conversation card-soft flex min-h-[70vh] flex-col overflow-hidden">
            <div className="presence-call-stage relative overflow-hidden bg-foreground px-5 pb-6 pt-4 text-background">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  Browser voice demo
                </span>
                <span className="text-xs opacity-75">
                  {inCall && connectedAt
                    ? `Connected · ${fmt(elapsed)}`
                    : inCall
                      ? "Connecting"
                      : "Not in a call"}
                </span>
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={() => {
                      if (c.speak) {
                        stopSpeech();
                        live.current.busy = false;
                        if (live.current.inCall) listen();
                      }
                      setCompanion({ speak: !c.speak });
                    }}
                    aria-label={c.speak ? "Turn speaker off" : "Turn speaker on"}
                    aria-pressed={c.speak}
                    className="rounded-full p-2 hover:bg-background/10"
                  >
                    {c.speak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => setShowSettings((v) => !v)}
                    aria-label="Companion settings"
                    className="rounded-full p-2 hover:bg-background/10"
                  >
                    <Settings2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-col items-center text-center">
                <PresenceBuddy phase={phase} onInterrupt={interrupt} />
                <p className="font-display text-4xl font-semibold tracking-tight">{c.name}</p>
                <p className="mt-1 text-sm opacity-80" aria-live="polite">
                  {PHASE_LABEL[phase]}
                  {phase === "speaking" && " · tap the cocoon to interrupt"}
                </p>
                <div className="mt-2 h-8">
                  <Waveform
                    active={phase === "speaking" || phase === "listening"}
                    tone={phase === "speaking" ? "coral" : "light"}
                  />
                </div>
                <div
                  className="mt-2 min-h-[3rem] max-w-md text-[15px] leading-relaxed"
                  aria-live="polite"
                >
                  {interim ? (
                    <p className="italic opacity-80">“{interim}”</p>
                  ) : inCall && lastCompanion ? (
                    <p>{lastCompanion.text}</p>
                  ) : (
                    <p className="opacity-70">
                      {trip
                        ? `Following your trip to ${trip.destination} · ETA ${trip.etaMinutes} min`
                        : "No active trip — I can still keep you company."}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-4">
                  {inCall && (
                    <button
                      onClick={toggleMute}
                      aria-pressed={muted}
                      aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                      className={`grid h-14 w-14 place-items-center rounded-full border-2 border-background/40 ${muted ? "bg-background text-foreground" : "hover:bg-background/10"}`}
                    >
                      {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </button>
                  )}
                  {inCall ? (
                    <button
                      onClick={endCall}
                      className="flex h-16 items-center gap-2 rounded-full bg-coral px-7 font-semibold text-destructive-foreground shadow-lg"
                    >
                      <PhoneOff className="h-6 w-6" /> End call
                    </button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={startCall}
                      className="flex h-16 items-center gap-2 rounded-full bg-lime px-7 font-semibold text-foreground shadow-lg"
                    >
                      <Phone className="h-6 w-6" /> Call {c.name}
                    </motion.button>
                  )}
                  <Link
                    to="/kit"
                    className="grid h-14 w-14 place-items-center rounded-full border-2 border-background/40 hover:bg-background/10"
                    aria-label="Open Safety Kit"
                  >
                    <Backpack className="h-6 w-6" />
                  </Link>
                </div>
                {micNote && (
                  <p className="mt-3 max-w-md text-xs text-amber" role="status">
                    {micNote}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b bg-amber/10 px-4 py-2 text-xs">
              <button
                className="underline"
                onClick={() => {
                  cleanup();
                  setInCall(false);
                  setConnectedAt(null);
                  setPhase("idle");
                  setState((x) => ({ ...x, chat: [] }));
                }}
              >
                Clear conversation
              </button>
              <span className="text-muted-foreground">
                {demoProvider.label}. Uses your device's built-in voice — not a human, not a phone
                line, can't see your surroundings. Cocoon keeps only text turns in this browser.
                Browser speech recognition may use your browser's online speech service.
              </span>
            </div>
            {showSettings && <SettingsPanel voices={voices} />}
            <div
              className="max-h-[40vh] flex-1 space-y-3 overflow-y-auto p-4"
              aria-live="polite"
              aria-label="Captions and transcript"
            >
              {s.chat.length === 0 && (
                <div className="py-4 text-center">
                  <p className="font-display text-xl">Or just type to {c.name}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {[
                      "Hi!",
                      "How long until I arrive?",
                      "Who can see my trip?",
                      "I feel uncomfortable",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => void handleUser(q)}
                        className="rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-accent"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {s.chat.map((m) => (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={m.id}
                  className={
                    m.from === "user"
                      ? "flex justify-end"
                      : m.from === "system"
                        ? "flex justify-center"
                        : ""
                  }
                >
                  {m.from === "system" ? (
                    <p className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {m.text}
                    </p>
                  ) : (
                    <div
                      className={
                        m.from === "user"
                          ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
                          : "max-w-[85%] text-[15px] leading-relaxed"
                      }
                    >
                      {m.text}
                      {m.actions && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.actions.map((a) => (
                            <Button
                              key={a}
                              size="sm"
                              variant={a === "sos" ? "destructive" : "secondary"}
                              className="rounded-full"
                              onClick={() => action(a)}
                            >
                              {
                                {
                                  guardian_update: `Update ${guardian?.name ?? "guardian"}`,
                                  sos: "SOS options",
                                  check_in: "Log check-in",
                                  share_eta: "What's shared?",
                                }[a]
                              }
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              {pendingConfirm && (
                <div className="rounded-2xl border bg-background p-3 text-sm">
                  Send {guardian?.name} a structured “feeling uncomfortable” update with your ETA
                  and location? Our conversation won't be shared.
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        const result = sendConcern("");
                        setPendingConfirm(false);
                        addMsg({
                          from: "system",
                          text: updateResultText(result),
                        });
                      }}
                    >
                      Yes, send
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingConfirm(false)}>
                      Not now
                    </Button>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <form
              className="flex items-center gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const t = input;
                setInput("");
                void handleUser(t);
              }}
            >
              <input
                value={input}
                maxLength={1000}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Type to ${c.name}…`}
                className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2.5 text-sm"
                aria-label="Message"
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0 rounded-full"
                disabled={!input.trim() || phase === "thinking"}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </section>
        )}
        <aside className="space-y-4" id="sos-zone">
          <SosButton />
          <div className="card-soft p-4">
            <p className="eyebrow">A quiet moment</p>
            <h2 className="font-poster mt-2 text-3xl">Find your rhythm.</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              If you're somewhere comfortable, follow a gentle breathing guide. Keep urgent actions
              within reach.
            </p>
            <button
              className="mt-3 text-sm underline"
              aria-expanded={showCalm}
              onClick={() => setShowCalm(!showCalm)}
            >
              {showCalm ? "Close calm guide" : "Open calm guide"}
            </button>
            {showCalm && (
              <div className="mt-5">
                <BreathingGuide onClose={() => setShowCalm(false)} />
              </div>
            )}
          </div>
          {!trip && (
            <p className="text-sm text-muted-foreground">
              Tip:{" "}
              <Link className="underline" to="/explore" search={{ to: "d-metro" }}>
                start a journey
              </Link>{" "}
              so {c.name} can use your destination and ETA.
            </p>
          )}
          <div className="card-soft p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Privacy</p>
            The mic listens only while a call is on and unmuted, and stops the moment you end the
            call or leave this page. Guardians receive structured updates, never transcripts.
            Nothing escalates without your confirmation.
          </div>
        </aside>
      </BalancedColumns>
      <div className="presence-support-tools lg:col-span-2">
        <SupportWorkspace
          voiceLabel={voiceMode === "live" ? "Natural voice when configured" : "Browser voice demo"}
          stopSignal={captureStopSignal}
          onStopSupport={() => {
            endCall();
            naturalVoice.current?.end();
          }}
          onStartSupport={() => {
            if (voiceMode === "live") return naturalVoice.current?.startSupport() ?? false;
            setVoiceMode("demo");
            supportRequested.current = true;
            startCall();
            return true;
          }}
        />
      </div>
    </div>
  );
}

function SettingsPanel({ voices }: { voices: SpeechSynthesisVoice[] }) {
  const c = useDemoState().companion;
  const [mem, setMem] = useState("");
  const deep = voices.filter(isDeepVoice);
  return (
    <div className="grid gap-3 border-b bg-muted/40 p-4 text-sm sm:grid-cols-2">
      <label>
        Companion name
        <input
          value={c.name}
          maxLength={20}
          onChange={(e) => setCompanion({ name: e.target.value || "Arjun" })}
          className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
        />
      </label>
      <label>
        Voice
        <select
          value={c.voiceURI ?? ""}
          onChange={(e) => setCompanion({ voiceURI: e.target.value || null })}
          className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
        >
          <option value="">Device default</option>
          {deep.length > 0 && (
            <optgroup label="Deeper voices">
              {deep.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="All English voices">
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
              </option>
            ))}
          </optgroup>
        </select>
        {voices.length === 0 ? (
          <span className="text-xs text-muted-foreground">No voices reported by this browser.</span>
        ) : (
          <button
            type="button"
            className="mt-1 text-xs underline"
            onClick={() =>
              speak(
                `Hi, I'm ${c.name}. I'll stay with you until you get there.`,
                c.voiceURI,
                c.style,
              )
            }
          >
            Preview voice
          </button>
        )}
        <span className="block text-xs text-muted-foreground">
          Voices are your device's built-in ones; "Natural" or "Enhanced" voices sound best.
        </span>
      </label>
      <fieldset>
        <legend>Style</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {(["casual", "protective", "calm", "playful"] as const).map((st) => (
            <button
              type="button"
              key={st}
              onClick={() => setCompanion({ style: st })}
              className={`rounded-full border px-3 py-1 capitalize ${c.style === st ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              {st}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Chattiness: {["Quiet", "Balanced", "Chatty"][c.chattiness - 1]}
        <input
          type="range"
          min={1}
          max={3}
          value={c.chattiness}
          onChange={(e) => setCompanion({ chattiness: Number(e.target.value) as 1 | 2 | 3 })}
          className="mt-2 w-full accent-[var(--plum)]"
        />
      </label>
      <div className="sm:col-span-2">
        <p>Remember (only what you approve)</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {c.memories.map((m) => (
            <Pill key={m} tone="lavender">
              {m}{" "}
              <button
                aria-label={`Forget ${m}`}
                onClick={() => setCompanion({ memories: c.memories.filter((x) => x !== m) })}
              >
                ×
              </button>
            </Pill>
          ))}
        </div>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (mem.trim()) {
              setCompanion({ memories: [...c.memories, mem.trim()].slice(-5) });
              setMem("");
            }
          }}
        >
          <input
            value={mem}
            onChange={(e) => setMem(e.target.value)}
            placeholder="e.g. I prefer the main road"
            className="flex-1 rounded-xl border bg-background px-3 py-2"
          />
          <Button size="sm" type="submit">
            Save
          </Button>
        </form>
      </div>
    </div>
  );
}
