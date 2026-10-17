import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveVoice, type LiveEvent } from "./use-live-voice";

/** Fully mocked browser media + sockets: no real permissions, network or provider session. */
type Listener = (e: unknown) => void;
class Emitter {
  listeners: Record<string, Listener[]> = {};
  addEventListener(t: string, l: Listener) {
    (this.listeners[t] ??= []).push(l);
  }
  removeEventListener(t: string, l: Listener) {
    this.listeners[t] = (this.listeners[t] ?? []).filter((x) => x !== l);
  }
  emit(t: string, e: unknown = {}) {
    for (const l of [...(this.listeners[t] ?? [])]) l(e);
  }
}
class MockChannel extends Emitter {
  readyState = "connecting";
  close = vi.fn(() => {
    this.readyState = "closed";
  });
}
const peers: MockPeer[] = [];
class MockPeer extends Emitter {
  connectionState = "new";
  iceGatheringState = "complete";
  localDescription: { sdp: string } | null = null;
  channel = new MockChannel();
  remote: unknown = null;
  close = vi.fn();
  addTrack = vi.fn();
  constructor() {
    super();
    peers.push(this);
  }
  createDataChannel() {
    return this.channel;
  }
  async createOffer() {
    return { type: "offer", sdp: "v=0 offer" };
  }
  async setLocalDescription(d: { sdp: string }) {
    this.localDescription = d;
  }
  async setRemoteDescription(d: unknown) {
    this.remote = d;
  }
}
const sockets: MockSocket[] = [];
class MockSocket {
  static OPEN = 1;
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) {
    sockets.push(this);
  }
  send(d: string) {
    this.sent.push(JSON.parse(d));
  }
  close = vi.fn(() => {
    this.readyState = 3;
  });
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  push(e: object) {
    this.onmessage?.({ data: JSON.stringify(e) });
  }
}
let track: { enabled: boolean; stop: ReturnType<typeof vi.fn>; addEventListener: () => void };
let getUserMedia: ReturnType<typeof vi.fn>;
const audio = {
  srcObject: null as unknown,
  muted: false,
  play: vi.fn(async () => {}),
  pause: vi.fn(),
};
const stream = () => ({ getTracks: () => [track], getAudioTracks: () => [track] });

beforeEach(() => {
  peers.length = 0;
  sockets.length = 0;
  track = { enabled: true, stop: vi.fn(), addEventListener: () => {} };
  getUserMedia = vi.fn(async () => stream());
  audio.srcObject = null;
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("RTCPeerConnection", MockPeer);
  vi.stubGlobal("WebSocket", MockSocket);
  vi.stubGlobal(
    "MediaStream",
    class {
      constructor(public tracks: unknown[]) {}
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const flush = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
function mount(
  prepare: () => Promise<Record<string, unknown>> = vi.fn(async () => ({
    token: "t",
    context: { alias: "Didi" },
  })),
) {
  const events: LiveEvent[] = [];
  const hook = renderHook(() => useLiveVoice({ onEvent: (e) => void events.push(e) }));
  (hook.result.current.audioRef as { current: unknown }).current = audio;
  return { hook, events, prepare };
}
async function connect(t: ReturnType<typeof mount>) {
  act(() => t.hook.result.current.start(t.prepare));
  await flush();
  const s = sockets.at(-1)!;
  act(() => s.open());
  const p = peers.at(-1)!;
  act(() => s.push({ type: "gateway.session.created", transport: { type: "webrtc", sdp: "ans" } }));
  await flush();
  p.connectionState = "connected";
  p.channel.readyState = "open";
  act(() => p.channel.emit("open"));
  return { s, p };
}

describe("useLiveVoice lifecycle (mocked)", () => {
  it("sends token/context with the SDP once, applies the answer, then heartbeats and app.ready", async () => {
    const t = mount();
    const { s, p } = await connect(t);
    expect(s.sent[0]).toMatchObject({ type: "app.start", sdp: "v=0 offer", token: "t" });
    expect(p.remote).toEqual({ type: "answer", sdp: "ans" });
    expect(s.sent.map((m) => m["type"])).toEqual(["app.start", "gateway.heartbeat", "app.ready"]);
    expect(t.hook.result.current.status).toBe("connected");
  });
  it("cancel while prepare is pending never opens a socket and releases the microphone", async () => {
    let resolve: (v: Record<string, unknown>) => void = () => {};
    const t = mount(vi.fn(() => new Promise<Record<string, unknown>>((r) => (resolve = r))));
    act(() => t.hook.result.current.start(t.prepare));
    await flush();
    act(() => t.hook.result.current.stop());
    resolve({ token: "t" });
    await flush();
    expect(sockets).toHaveLength(0);
    expect(track.stop).toHaveBeenCalled();
    expect(t.hook.result.current.status).toBe("closed");
  });
  it("a late microphone permission after stop stops its tracks and creates no peer", async () => {
    let grant: (v: unknown) => void = () => {};
    getUserMedia.mockImplementation(() => new Promise((r) => (grant = r)));
    const t = mount();
    act(() => t.hook.result.current.start(t.prepare));
    act(() => t.hook.result.current.stop());
    grant(stream());
    await flush();
    expect(track.stop).toHaveBeenCalled();
    expect(peers).toHaveLength(0);
  });
  it("permission refusal surfaces an error without a socket", async () => {
    getUserMedia.mockRejectedValue(new Error("Permission denied"));
    const t = mount();
    act(() => t.hook.result.current.start(t.prepare));
    await flush();
    expect(t.hook.result.current.error).toMatch(/Permission denied/);
    expect(sockets).toHaveLength(0);
  });
  it("socket error / media failure stops capture and reports the error", async () => {
    const t = mount();
    const { s, p } = await connect(t);
    p.connectionState = "failed";
    act(() => p.emit("connectionstatechange"));
    expect(t.hook.result.current.error).toMatch(/media connection failed/);
    expect(track.stop).toHaveBeenCalled();
    expect(s.sent.at(-1)).toEqual({ type: "session.close" });
  });
  it("server time limit ends the call with a clear message", async () => {
    const t = mount();
    const { s } = await connect(t);
    act(() => s.push({ type: "app.limit", seconds: 300 }));
    expect(t.hook.result.current.error).toMatch(/time limit/);
    expect(track.stop).toHaveBeenCalled();
  });
  it("setup timeout when no session answer arrives", async () => {
    vi.useFakeTimers();
    const t = mount();
    act(() => t.hook.result.current.start(t.prepare));
    await flush();
    act(() => sockets[0]!.open());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50_000);
    });
    expect(t.hook.result.current.error).toMatch(/did not start/);
  });
  it("hidden tab keeps the call; unmount stops it", async () => {
    const t = mount();
    const { s } = await connect(t);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(t.hook.result.current.status).toBe("connected");
    t.hook.unmount();
    expect(s.sent.at(-1)).toEqual({ type: "session.close" });
    expect(track.stop).toHaveBeenCalled();
  });
  it("mute toggles the mic track; resumePlayback reports blocked audio", async () => {
    const t = mount();
    await connect(t);
    act(() => t.hook.result.current.setMuted(true));
    expect(track.enabled).toBe(false);
    expect(t.hook.result.current.muted).toBe(true);
    audio.srcObject = {};
    audio.play.mockRejectedValueOnce(new Error("blocked"));
    await act(async () => t.hook.result.current.resumePlayback());
    expect(t.hook.result.current.playbackBlocked).toBe(true);
  });
  it("stale events from a finished first call do not reach the second call", async () => {
    const t = mount();
    const first = await connect(t);
    act(() => first.s.push({ type: "session.closed", usage: { seconds: 20 } }));
    expect(t.hook.result.current.status).toBe("closed");
    await connect(t);
    const before = t.events.length;
    act(() => first.s.push({ type: "session.output_transcript.delta", delta: "stale" }));
    expect(t.events.length).toBe(before);
    expect(t.hook.result.current.status).toBe("connected");
  });
});
