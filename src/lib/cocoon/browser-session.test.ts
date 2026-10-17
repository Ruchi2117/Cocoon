import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BrowserSession,
  browserSpeechPort,
  type BrowserSpeechPort,
  type RecognitionCallbacks,
  type SpeechCallbacks,
} from "./browser-session";
import { roomProvider, type RoomProvider } from "./presence-script";
function fixture(options: Partial<BrowserSpeechPort> = {}, provider: RoomProvider = roomProvider) {
  const recognition: RecognitionCallbacks[] = [],
    speeches: SpeechCallbacks[] = [];
  const recStop = vi.fn(),
    speechStop = vi.fn();
  let voiceChange = () => {};
  const port: BrowserSpeechPort = {
    recognitionSupported: true,
    speechSupported: true,
    listen: vi.fn((c) => {
      recognition.push(c);
      return recStop;
    }),
    speak: vi.fn((_t, _v, _r, c) => {
      speeches.push(c);
      return speechStop;
    }),
    voices: vi.fn(() => [{ id: "local", name: "Local voice", lang: "en", local: true }]),
    onVoicesChanged: vi.fn((c) => {
      voiceChange = c;
      return vi.fn();
    }),
    ...options,
  };
  const session = new BrowserSession(port, provider);
  return {
    session,
    port,
    recognition,
    speeches,
    recStop,
    speechStop,
    voiceChange: () => voiceChange(),
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("explicit bounded browser companion lifecycle", () => {
  it("text first never opens recognition or speech, maintains ephemeral replies", async () => {
    const f = fixture();
    f.session.start("ground");
    await f.session.send("one shape");
    expect(f.port.listen).not.toHaveBeenCalled();
    expect(f.port.speak).not.toHaveBeenCalled();
    expect(f.session.snapshot().messages.map((m) => m.from)).toEqual([
      "companion",
      "you",
      "companion",
    ]);
    f.session.dispose();
    expect(f.session.snapshot().messages).toEqual([]);
  });
  it("one explicit listen cannot restart after final result, duplicate/late events or speech completion", async () => {
    const f = fixture();
    f.session.setMode("voice");
    f.session.start();
    f.speeches[0]?.end();
    f.session.listen();
    const r = f.recognition[0];
    r?.start();
    expect(f.session.snapshot().phase).toBe("listening");
    r?.result("hello", true);
    r?.result("duplicate echo", true);
    r?.end();
    await Promise.resolve();
    f.speeches[1]?.start();
    f.speeches[1]?.end();
    expect(f.port.listen).toHaveBeenCalledTimes(1);
    expect(f.session.snapshot().messages.filter((m) => m.from === "you")).toHaveLength(1);
    expect(f.session.snapshot().phase).toBe("muted");
    f.session.listen();
    expect(f.port.listen).toHaveBeenCalledTimes(2);
  });
  it.each([
    "not-allowed",
    "service-not-allowed",
    "network",
    "audio-capture",
    "no-speech",
    "unexpected",
  ])("%s error stops mic without automatic restart and typing still works", async (code) => {
    const f = fixture();
    f.session.setMode("voice");
    f.session.start();
    f.session.listen();
    f.recognition[0]?.error(code);
    f.recognition[0]?.end();
    expect(f.session.snapshot().phase).toBe("error");
    expect(f.recStop).toHaveBeenCalled();
    expect(f.port.listen).toHaveBeenCalledTimes(1);
    await f.session.send("continue by text");
    expect(f.session.snapshot().messages.some((m) => m.text === "continue by text")).toBe(true);
  });
  it("recognition unsupported and thrown start both give recoverable explicit fallback", () => {
    const a = fixture({ recognitionSupported: false });
    a.session.setMode("voice");
    a.session.start();
    a.session.listen();
    expect(a.port.listen).not.toHaveBeenCalled();
    expect(a.session.snapshot().notice).toContain("unsupported");
    const b = fixture({
      listen: () => {
        throw new Error("start");
      },
    });
    b.session.setMode("voice");
    b.session.start();
    b.session.listen();
    expect(b.session.snapshot().phase).toBe("error");
  });
  it("speech unsupported stays text readable; repeat never attempts missing playback", async () => {
    const f = fixture({ speechSupported: false });
    f.session.setMode("voice");
    f.session.start();
    await f.session.send("company");
    f.session.repeat();
    expect(f.port.speak).not.toHaveBeenCalled();
    expect(f.session.snapshot().messages).toHaveLength(3);
    expect(f.session.snapshot().notice).toContain("unsupported");
  });
  it("interrupt/repeat is explicit and old synthesis errors/completion cannot affect new speech", () => {
    const f = fixture();
    f.session.setMode("voice");
    f.session.start();
    const old = f.speeches[0];
    old?.start();
    f.session.interrupt();
    expect(f.session.snapshot().phase).toBe("muted");
    expect(f.port.listen).not.toHaveBeenCalled();
    expect(f.speechStop).toHaveBeenCalledTimes(1);
    f.session.repeat();
    f.speeches[1]?.start();
    old?.error();
    old?.end();
    expect(f.session.snapshot().phase).toBe("speaking");
    expect(f.port.speak).toHaveBeenCalledTimes(2);
    f.speeches[1]?.end();
    f.speeches[1]?.error();
    expect(f.session.snapshot().phase).toBe("muted");
  });
  it("hide cancels pending recognition and speech, returns without resuming", () => {
    const f = fixture();
    f.session.setMode("voice");
    f.session.start();
    f.session.listen();
    const old = f.recognition[0];
    f.session.setVisible(false);
    old?.start();
    old?.result("late", true);
    f.session.setVisible(true);
    expect(f.session.snapshot().phase).toBe("muted");
    expect(f.port.listen).toHaveBeenCalledTimes(1);
    expect(f.port.speak).toHaveBeenCalledTimes(1);
    f.session.listen();
    expect(f.port.listen).toHaveBeenCalledTimes(2);
  });
  it.each(["end", "hide", "mode", "dispose"])(
    "%s invalidates late reply and old recognition callbacks",
    async (reason) => {
      let resolve: ((v: { text: string }) => void) | undefined;
      const f = fixture(
        {},
        {
          reply: () =>
            new Promise((done) => {
              resolve = done;
            }),
        },
      );
      f.session.start();
      const pending = f.session.send("pending");
      if (reason === "end") f.session.end();
      if (reason === "hide") f.session.setVisible(false);
      if (reason === "mode") f.session.setMode("voice");
      if (reason === "dispose") f.session.dispose();
      resolve?.({ text: "late private reply" });
      await pending;
      expect(f.session.snapshot().messages.some((m) => m.text === "late private reply")).toBe(
        false,
      );
      expect(f.port.listen).not.toHaveBeenCalled();
    },
  );
  it("newer submitted turn supersedes earlier pending response", async () => {
    const resolvers: Array<(v: { text: string }) => void> = [];
    const f = fixture({}, { reply: () => new Promise((done) => resolvers.push(done)) });
    f.session.start();
    const a = f.session.send("first"),
      b = f.session.send("second");
    resolvers[1]?.({ text: "current" });
    await b;
    resolvers[0]?.({ text: "old" });
    await a;
    expect(f.session.snapshot().messages.at(-1)?.text).toBe("current");
    expect(f.session.snapshot().messages.some((m) => m.text === "old")).toBe(false);
  });
  it("voice list changes clear unavailable preference, rate is bounded and settings stop playback", () => {
    const f = fixture();
    f.session.setMode("voice");
    f.session.start();
    f.session.setVoice("local");
    f.session.setRate(10);
    expect(f.session.snapshot().rate).toBe(1.3);
    f.session.setRate(0.1);
    expect(f.session.snapshot().rate).toBe(0.7);
    vi.mocked(f.port.voices).mockReturnValue([]);
    f.voiceChange();
    expect(f.session.snapshot().voiceId).toBe("");
    expect(f.session.snapshot().notice).toContain("no longer available");
  });
  it("history is capped at 30 and input/reply payloads bounded", async () => {
    const provider = { reply: vi.fn(async (_text: string) => ({ text: "x".repeat(2000) })) };
    const f = fixture({}, provider);
    f.session.start();
    for (let i = 0; i < 20; i++) await f.session.send("a".repeat(2000));
    expect(f.session.snapshot().messages).toHaveLength(30);
    expect(f.session.snapshot().messages.at(-1)?.text.length).toBe(1600);
    expect(provider.reply.mock.calls[0]?.[0].length).toBe(1000);
  });
  it("synthesis failures do not restart mic; mode change cancels speech and removes autoplay", () => {
    const f = fixture();
    f.session.setMode("voice");
    f.session.start();
    f.speeches[0]?.error();
    expect(f.session.snapshot().phase).toBe("error");
    expect(f.port.listen).not.toHaveBeenCalled();
    f.session.setMode("text");
    expect(f.session.snapshot().speaker).toBe(false);
    expect(f.session.snapshot().phase).toBe("idle");
  });
});
describe("native browser adapter mocked without devices", () => {
  it("queues one bounded utterance at a time and cancel blocks every late chunk", () => {
    const utterances: Array<{
      text: string;
      onend?: () => void;
      onstart?: () => void;
      onerror?: () => void;
      rate?: number;
    }> = [];
    class Utterance {
      onend: (() => void) | null = null;
      onstart: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    const speak = vi.fn((u) => utterances.push(u));
    const cancel = vi.fn();
    vi.stubGlobal("speechSynthesis", {
      speak,
      cancel,
      getVoices: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const port = browserSpeechPort(),
      end = vi.fn(),
      error = vi.fn();
    const stop = port.speak("a".repeat(2000), "", 1, { start: vi.fn(), end, error });
    expect(speak).toHaveBeenCalledTimes(1);
    expect(utterances[0]?.text.length).toBe(240);
    utterances[0]?.onend?.();
    expect(speak).toHaveBeenCalledTimes(2);
    const stale = utterances[1]?.onend;
    stop();
    stale?.();
    expect(speak).toHaveBeenCalledTimes(2);
    expect(end).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    port.speak("b".repeat(500), "", 1, { start: vi.fn(), end, error });
    speak.mockImplementationOnce(() => {
      throw new Error("later chunk failed");
    });
    const nextChunk = utterances[2]?.onend;
    expect(() => nextChunk?.()).not.toThrow();
    expect(error).toHaveBeenCalledTimes(1);
    nextChunk?.();
    expect(error).toHaveBeenCalledTimes(1);
  });
  it("recognition abort detaches all callbacks, start exceptions abort safely", () => {
    const callbacks: unknown[] = [];
    class Recognition {
      lang = "";
      continuous = false;
      interimResults = false;
      onstart = null;
      onend = null;
      onresult = null;
      onerror = null;
      start = vi.fn(() => {
        callbacks.push(this);
        throw new Error("denied");
      });
      abort = vi.fn();
    }
    vi.stubGlobal("SpeechRecognition", Recognition);
    const port = browserSpeechPort();
    expect(() =>
      port.listen({ start: vi.fn(), result: vi.fn(), error: vi.fn(), end: vi.fn() }),
    ).toThrow("denied");
    const rec = callbacks[0] as Recognition;
    expect(rec.abort).toHaveBeenCalledTimes(1);
    expect(rec.onresult).toBe(null);
  });
});
