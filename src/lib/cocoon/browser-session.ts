import {
  INTENTS,
  roomProvider,
  type PresenceIntent,
  type RoomProvider,
  type RoomReply,
  type ScriptContext,
} from "./presence-script";

export type SessionPhase =
  "idle" | "connecting" | "listening" | "thinking" | "speaking" | "muted" | "error" | "ended";
export type SessionMode = "text" | "voice";
export interface BrowserVoice {
  id: string;
  name: string;
  lang: string;
  local: boolean;
}
export interface SessionMessage extends RoomReply {
  id: number;
  from: "you" | "companion";
}
export interface SessionSnapshot {
  phase: SessionPhase;
  active: boolean;
  mode: SessionMode;
  intent: PresenceIntent;
  messages: SessionMessage[];
  interim: string;
  notice: string;
  speaker: boolean;
  voices: BrowserVoice[];
  voiceId: string;
  rate: number;
  recognitionSupported: boolean;
  speechSupported: boolean;
}
export const INITIAL_SESSION: SessionSnapshot = {
  phase: "idle",
  active: false,
  mode: "text",
  intent: "company",
  messages: [],
  interim: "",
  notice: "",
  speaker: false,
  voices: [],
  voiceId: "",
  rate: 1,
  recognitionSupported: false,
  speechSupported: false,
};
export interface RecognitionCallbacks {
  start(): void;
  result(text: string, final: boolean): void;
  end(): void;
  error(code: string): void;
}
export interface SpeechCallbacks {
  start(): void;
  end(): void;
  error(): void;
}
export interface BrowserSpeechPort {
  recognitionSupported: boolean;
  speechSupported: boolean;
  listen(callbacks: RecognitionCallbacks): () => void;
  speak(text: string, voiceId: string, rate: number, callbacks: SpeechCallbacks): () => void;
  voices(): BrowserVoice[];
  onVoicesChanged(callback: () => void): () => void;
}

/** One explicit listening turn, one bounded utterance at a time. Never restarts recognition. */
export class BrowserSession {
  private state: SessionSnapshot;
  private subscribers = new Set<(value: SessionSnapshot) => void>();
  private generation = 0;
  private sequence = 0;
  private turn = 0;
  private disposed = false;
  private visible = true;
  private stopRecognition: (() => void) | undefined;
  private stopSpeech: (() => void) | undefined;
  private stopVoiceEvents: () => void;
  private lastReply: string = "";
  constructor(
    private port: BrowserSpeechPort,
    private provider: RoomProvider = roomProvider,
    private context: () => Omit<ScriptContext, "intent" | "turn"> = () => ({ country: null }),
  ) {
    this.state = {
      ...INITIAL_SESSION,
      recognitionSupported: port.recognitionSupported,
      speechSupported: port.speechSupported,
      voices: port.voices(),
    };
    this.stopVoiceEvents = port.onVoicesChanged(() => {
      const voices = port.voices();
      const missing = this.state.voiceId && !voices.some((v) => v.id === this.state.voiceId);
      if (missing) this.interrupt();
      this.patch({
        voices,
        ...(missing
          ? {
              voiceId: "",
              notice:
                "Selected voice is no longer available. Device default selected; playback has stopped.",
            }
          : {}),
      });
    });
  }
  snapshot = () => this.state;
  subscribe(callback: (value: SessionSnapshot) => void) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }
  private patch(update: Partial<SessionSnapshot>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...update };
    this.subscribers.forEach((fn) => fn(this.state));
  }
  private invalidate() {
    ++this.generation;
    const rec = this.stopRecognition,
      speech = this.stopSpeech;
    this.stopRecognition = undefined;
    this.stopSpeech = undefined;
    rec?.();
    speech?.();
    this.patch({ interim: "" });
  }
  private valid(token: number) {
    return !this.disposed && this.visible && this.state.active && token === this.generation;
  }
  private append(from: SessionMessage["from"], reply: RoomReply) {
    this.patch({
      messages: [...this.state.messages, { ...reply, from, id: ++this.sequence }].slice(-30),
    });
  }
  private resting() {
    return this.state.mode === "text" ? ("idle" as const) : ("muted" as const);
  }
  start(intent = this.state.intent) {
    if (!this.visible || this.disposed) return;
    this.invalidate();
    this.turn = 0;
    this.patch({ active: true, intent, phase: this.resting(), notice: "" });
    const text = INTENTS[intent].opening;
    this.lastReply = text;
    this.append("companion", { text });
    this.play(text);
  }
  setIntent(intent: PresenceIntent) {
    if (this.state.active) this.start(intent);
    else this.patch({ intent });
  }
  setMode(mode: SessionMode) {
    this.invalidate();
    this.patch({
      mode,
      speaker: mode === "voice" && this.port.speechSupported,
      phase: this.state.active ? (mode === "text" ? "idle" : "muted") : this.state.phase,
      notice:
        mode === "voice"
          ? "Browser voice selected. Listening starts only when you press Listen once."
          : "Text mode. Microphone and playback stopped.",
    });
  }
  setSpeaker(enabled: boolean) {
    this.invalidate();
    this.patch({
      speaker: enabled && this.port.speechSupported,
      phase: this.state.active ? this.resting() : this.state.phase,
      notice:
        enabled && !this.port.speechSupported
          ? "Speech playback is unsupported. Replies remain available as text."
          : "",
    });
  }
  setVoice(id: string) {
    this.interrupt();
    this.patch({ voiceId: this.state.voices.some((v) => v.id === id) ? id : "" });
  }
  setRate(rate: number) {
    this.interrupt();
    this.patch({ rate: Number.isFinite(rate) ? Math.min(1.3, Math.max(0.7, rate)) : 1 });
  }
  listen() {
    if (!this.visible || this.disposed || !this.state.active || this.state.mode !== "voice") return;
    this.invalidate();
    if (!this.port.recognitionSupported) {
      this.patch({
        phase: "muted",
        notice:
          "Speech recognition is unsupported here. Type your message; no microphone was started.",
      });
      return;
    }
    const token = this.generation;
    this.patch({ phase: "connecting", notice: "Waiting for browser microphone permission…" });
    const failure = (code: string) => {
      if (!this.valid(token)) return;
      this.invalidate();
      const notices: Record<string, string> = {
        "not-allowed":
          "Microphone permission denied. Type instead, or change your browser permission and explicitly retry Listen once.",
        "service-not-allowed":
          "Browser speech service is blocked. Type instead; listening will not restart.",
        "audio-capture": "No microphone is available. You can continue by typing.",
        network:
          "Browser speech lost its connection. Type instead, or explicitly retry Listen once.",
        "no-speech": "No speech was detected. Type instead, or explicitly try Listen once again.",
      };
      this.patch({
        phase: "error",
        notice:
          notices[code] ??
          "Listening stopped unexpectedly. Type instead or explicitly retry; the microphone will not restart.",
      });
    };
    try {
      const stop = this.port.listen({
        start: () => {
          if (this.valid(token)) this.patch({ phase: "listening", notice: "" });
        },
        result: (text, final) => {
          if (!this.valid(token)) return;
          this.patch({ interim: text.slice(0, 1000) });
          if (final && text.trim()) void this.send(text);
        },
        end: () => {
          if (this.valid(token)) {
            this.invalidate();
            this.patch({
              phase: "muted",
              notice: "Listening finished. Press Listen once for another turn, or type.",
            });
          }
        },
        error: failure,
      });
      if (this.valid(token)) this.stopRecognition = stop;
      else stop();
    } catch {
      failure("start-failed");
    }
  }
  async send(input: string) {
    const text = input.trim().slice(0, 1000);
    if (!text || !this.visible || this.disposed) return;
    if (!this.state.active) this.patch({ active: true });
    this.invalidate();
    const token = this.generation;
    this.append("you", { text });
    this.patch({ phase: "thinking", notice: "" });
    try {
      const reply = await this.provider.reply(text, {
        ...this.context(),
        intent: this.state.intent,
        turn: this.turn++,
      });
      if (!this.valid(token)) return;
      const safe = { ...reply, text: reply.text.slice(0, 1600) };
      this.lastReply = safe.text;
      this.append("companion", safe);
      this.play(safe.text);
    } catch {
      if (this.valid(token))
        this.patch({
          phase: "error",
          notice:
            "The scripted reply did not finish. Submit a new text turn or choose a guided intention. No alert was sent.",
        });
    }
  }
  private play(text: string) {
    if (!this.state.speaker || !this.port.speechSupported || !this.state.active || !this.visible) {
      this.patch({ phase: this.resting() });
      return;
    }
    const token = this.generation;
    this.patch({ phase: "connecting", notice: "Preparing browser playback…" });
    const error = () => {
      if (!this.valid(token)) return;
      this.invalidate();
      this.patch({
        phase: "error",
        notice:
          "Browser playback failed. Read the reply or press Repeat last reply to explicitly retry.",
      });
    };
    try {
      const stop = this.port.speak(text, this.state.voiceId, this.state.rate, {
        start: () => {
          if (this.valid(token)) this.patch({ phase: "speaking", notice: "" });
        },
        end: () => {
          if (this.valid(token)) {
            ++this.generation;
            this.stopSpeech = undefined;
            this.patch({ phase: this.resting(), notice: "" });
          }
        },
        error,
      });
      if (this.valid(token)) this.stopSpeech = stop;
      else stop();
    } catch {
      error();
    }
  }
  repeat() {
    if (!this.lastReply || !this.state.active || !this.visible) return;
    this.invalidate();
    if (!this.port.speechSupported) {
      this.patch({
        phase: this.resting(),
        notice: "Playback is unsupported. The last reply is available in the transcript.",
      });
      return;
    }
    this.patch({ speaker: true });
    this.play(this.lastReply);
  }
  interrupt() {
    this.invalidate();
    if (this.state.active)
      this.patch({
        phase: this.resting(),
        notice: "Stopped. Listening will start only on your next explicit action.",
      });
  }
  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) {
      this.invalidate();
      this.patch({
        phase: this.state.active ? "muted" : this.state.phase,
        notice: this.state.active
          ? "Session paused while the page was hidden. Microphone and playback stopped; resume explicitly."
          : this.state.notice,
      });
    }
  }
  end() {
    this.invalidate();
    this.patch({
      active: false,
      phase: "ended",
      notice: "Session ended. Microphone and playback stopped.",
    });
  }
  clear() {
    this.end();
    this.lastReply = "";
    this.turn = 0;
    this.patch({ messages: [], notice: "Conversation cleared from this page." });
  }
  dispose() {
    this.invalidate();
    this.stopVoiceEvents();
    this.subscribers.clear();
    this.lastReply = "";
    this.state = { ...INITIAL_SESSION };
    this.disposed = true;
  }
}

interface NativeRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0?: { transcript: string } }>;
      }) => void)
    | null;
}
/** Construct only after hydration. Browser recognition may use the browser vendor's online service. */
export function browserSpeechPort(): BrowserSpeechPort {
  const win = window as unknown as {
    SpeechRecognition?: new () => NativeRecognition;
    webkitSpeechRecognition?: new () => NativeRecognition;
  };
  const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  const supported = !!synth && typeof window.SpeechSynthesisUtterance === "function";
  return {
    recognitionSupported: !!Recognition,
    speechSupported: supported,
    voices: () =>
      synth
        ?.getVoices()
        .map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang, local: v.localService })) ?? [],
    onVoicesChanged: (callback) => {
      synth?.addEventListener("voiceschanged", callback);
      return () => synth?.removeEventListener("voiceschanged", callback);
    },
    listen(callback) {
      if (!Recognition) throw new Error("Unsupported");
      const rec = new Recognition();
      let cancelled = false;
      rec.lang = navigator.language || "en-US";
      rec.continuous = false;
      rec.interimResults = true;
      rec.onstart = () => {
        if (!cancelled) callback.start();
      };
      rec.onend = () => {
        if (!cancelled) callback.end();
      };
      rec.onerror = (e) => {
        if (!cancelled) callback.error(e.error);
      };
      rec.onresult = (e) => {
        if (cancelled) return;
        let text = "",
          final = false;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (!result) continue;
          text += result[0]?.transcript ?? "";
          final ||= result.isFinal;
        }
        callback.result(text, final);
      };
      const stop = () => {
        cancelled = true;
        rec.onstart = null;
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        try {
          rec.abort();
        } catch {
          /* stopped */
        }
      };
      try {
        rec.start();
      } catch (e) {
        stop();
        throw e;
      }
      return stop;
    },
    speak(text, voiceId, rate, callback) {
      if (!supported) throw new Error("Unsupported");
      synth.cancel();
      let cancelled = false;
      let index = 0;
      const bounded = text.slice(0, 1600);
      const parts =
        bounded
          .match(/[^.!?]+[.!?]?/g)
          ?.map((p) => p.trim())
          .filter(Boolean) ?? [];
      const chunks: string[] = [];
      for (const part of parts)
        for (let i = 0; i < part.length; i += 240) chunks.push(part.slice(i, i + 240));
      let utterance: SpeechSynthesisUtterance | undefined;
      const next = () => {
        if (cancelled) return;
        const text = chunks[index++];
        if (!text) {
          callback.end();
          return;
        }
        const u = new SpeechSynthesisUtterance(text);
        utterance = u;
        const voice = synth.getVoices().find((v) => v.voiceURI === voiceId);
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        }
        u.rate = rate;
        u.onstart = () => {
          if (!cancelled && index === 1) callback.start();
        };
        u.onend = () => {
          if (!cancelled) {
            u.onend = null;
            try {
              next();
            } catch {
              cancelled = true;
              synth.cancel();
              callback.error();
            }
          }
        };
        u.onerror = () => {
          if (!cancelled) {
            cancelled = true;
            synth.cancel();
            callback.error();
          }
        };
        synth.speak(u);
      };
      const stop = () => {
        cancelled = true;
        if (utterance) {
          utterance.onstart = null;
          utterance.onend = null;
          utterance.onerror = null;
        }
        synth.cancel();
      };
      try {
        next();
      } catch (e) {
        stop();
        throw e;
      }
      return stop;
    },
  };
}
