import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectLiveVoice, type LiveVoiceOptions } from "./live-voice";
const stop = vi.fn(),
  close = vi.fn(),
  pause = vi.fn();
let peer: { connectionState: string; onconnectionstatechange: (() => void) | null };
let events: {
  onmessage: ((e: { data: string }) => void) | null;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  readyState: string;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};
const event = (type: string) => events.onmessage?.({ data: JSON.stringify({ type }) });
let permission: ReturnType<typeof vi.fn>;
let track: { stop: typeof stop; enabled: boolean };
const context = { name: "Arjun", style: "calm", country: null };
function options(signal = new AbortController().signal): LiveVoiceOptions {
  return { signal, context, onPhase: vi.fn(), onCaption: vi.fn(), onError: vi.fn() };
}
beforeEach(() => {
  vi.clearAllMocks();
  track = { stop, enabled: true };
  permission = vi.fn(async () => ({ getTracks: () => [track], getAudioTracks: () => [track] }));
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: permission } });
  vi.stubGlobal(
    "Audio",
    class {
      autoplay = false;
      muted = false;
      srcObject: unknown = null;
      pause = pause;
      play = vi.fn(async () => {});
    },
  );
  vi.stubGlobal(
    "RTCPeerConnection",
    class {
      constructor() {
        // Expose the mock peer so tests can drive browser connection events.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        peer = this;
      }
      connectionState = "new";
      ontrack: unknown = null;
      onconnectionstatechange: (() => void) | null = null;
      close = close;
      addTrack = vi.fn();
      createOffer = vi.fn(async () => ({ sdp: "v=0 mock-offer" }));
      setLocalDescription = vi.fn(async () => {});
      setRemoteDescription = vi.fn(async () => {});
      createDataChannel = vi.fn(
        () =>
          (events = {
            onmessage: null,
            onopen: null,
            onclose: null,
            readyState: "open",
            send: vi.fn(),
            close: vi.fn(),
          }),
      );
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("v=0 mock-answer")),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe("live voice resource lifecycle (mocked, no real microphone/provider)", () => {
  it("closes microphone, peer and audio exactly once", async () => {
    const handle = await connectLiveVoice(options());
    handle.close();
    handle.close();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);
  });
  it("stops late microphone permission results after cancellation", async () => {
    let resolvePermission: (stream: unknown) => void = () => {};
    permission.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePermission = resolve;
        }),
    );
    const c = new AbortController();
    const result = connectLiveVoice(options(c.signal));
    c.abort();
    resolvePermission({ getTracks: () => [track], getAudioTracks: () => [track] });
    await expect(result).rejects.toThrow("cancelled");
    expect(stop).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("cleans up when the provider refuses the call", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: "Not configured" }, { status: 503 }));
    await expect(connectLiveVoice(options())).rejects.toThrow("Not configured");
    expect(stop).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("does not request microphone access for an already cancelled call", async () => {
    const c = new AbortController();
    c.abort();
    await expect(connectLiveVoice(options(c.signal))).rejects.toThrow("cancelled");
    expect(permission).not.toHaveBeenCalled();
  });
  it("muting changes the microphone track and aborting releases it", async () => {
    const c = new AbortController();
    const handle = await connectLiveVoice(options(c.signal));
    handle.mute(true);
    expect(track.enabled).toBe(false);
    handle.mute(false);
    expect(track.enabled).toBe(true);
    c.abort();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});

describe("live voice event handling", () => {
  it("keeps speaking until the playback buffer drains", async () => {
    const o = options();
    const h = await connectLiveVoice(o);
    event("response.created");
    event("output_audio_buffer.started");
    event("response.done");
    expect(o.onPhase).toHaveBeenLastCalledWith("speaking");
    event("output_audio_buffer.stopped");
    expect(o.onPhase).toHaveBeenLastCalledWith("listening");
    h.close();
  });
  it("interrupts generation and buffered playback, without cancelling idle responses", async () => {
    const h = await connectLiveVoice(options());
    h.interrupt();
    expect(events.send).not.toHaveBeenCalled();
    event("response.created");
    event("output_audio_buffer.started");
    h.interrupt();
    expect(events.send.mock.calls.map(([data]) => JSON.parse(data as string).type)).toEqual([
      "response.cancel",
      "output_audio_buffer.clear",
    ]);
    h.close();
  });
  it("releases devices and notifies the UI when the channel closes", async () => {
    const onClosed = vi.fn();
    const o = { ...options(), onClosed };
    await connectLiveVoice(o);
    events.onclose?.();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(o.onPhase).toHaveBeenLastCalledWith("error");
  });
  it("allows a brief connection recovery, then closes a prolonged disconnect", async () => {
    vi.useFakeTimers();
    try {
      const o = options();
      await connectLiveVoice(o);
      peer.connectionState = "disconnected";
      peer.onconnectionstatechange?.();
      await vi.advanceTimersByTimeAsync(4000);
      peer.connectionState = "connected";
      peer.onconnectionstatechange?.();
      await vi.advanceTimersByTimeAsync(5000);
      expect(stop).not.toHaveBeenCalled();
      peer.connectionState = "disconnected";
      peer.onconnectionstatechange?.();
      await vi.advanceTimersByTimeAsync(8000);
      expect(stop).toHaveBeenCalledTimes(1);
      expect(o.onPhase).toHaveBeenLastCalledWith("error");
    } finally {
      vi.useRealTimers();
    }
  });
});
