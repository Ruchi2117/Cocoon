import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CaptureSession,
  capturePlan,
  kitContacts,
  phoneHref,
  supportMessage,
} from "./support-session";
const events = () => ({ onStream: vi.fn(), onFile: vi.fn(), onError: vi.fn(), onEnd: vi.fn() });
class Recorder {
  static isTypeSupported = () => true;
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["mock audio"]) });
    this.onstop?.();
  }
}
function fakeStream() {
  const stop = vi.fn();
  const track = { stop, addEventListener: vi.fn() };
  return { stream: { getTracks: () => [track] } as unknown as MediaStream, stop };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("support capture lifecycle", () => {
  it("preserves low battery with audio, allows explicit override and short unknown-battery clips", () => {
    expect(capturePlan("video", { level: 0.15, charging: false }).mode).toBe("audio");
    expect(capturePlan("video", { level: 0.15, charging: false }, false).mode).toBe("video");
    expect(capturePlan("video", null).maxSeconds).toBe(45);
  });
  it("stops late permission streams after cancellation without recording", async () => {
    let resolve!: (stream: MediaStream) => void;
    const permission = new Promise<MediaStream>((r) => {
      resolve = r;
    });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => permission } });
    vi.stubGlobal("MediaRecorder", Recorder);
    const e = events(),
      s = new CaptureSession(e),
      { stream, stop } = fakeStream();
    const pending = s.start("audio", 180);
    s.stop();
    resolve(stream);
    await expect(pending).rejects.toThrow("cancelled");
    expect(stop).toHaveBeenCalled();
    expect(e.onFile).not.toHaveBeenCalled();
    expect(e.onStream).not.toHaveBeenCalledWith(stream);
  });
  it("enforces duration and stops tracks while retaining the completed local clip", async () => {
    vi.useFakeTimers();
    const { stream, stop } = fakeStream();
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    vi.stubGlobal("MediaRecorder", Recorder);
    const e = events(),
      s = new CaptureSession(e);
    await s.start("audio", 2);
    vi.advanceTimersByTime(2000);
    expect(stop).toHaveBeenCalled();
    expect(e.onFile).toHaveBeenCalledOnce();
    expect(e.onEnd).toHaveBeenCalledOnce();
    expect(e.onStream).toHaveBeenLastCalledWith(null);
  });
  it("disposes resources without delivering a capture to an unmounted page", async () => {
    const { stream, stop } = fakeStream();
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    vi.stubGlobal("MediaRecorder", Recorder);
    const e = events(),
      s = new CaptureSession(e);
    await s.start("video", 45);
    s.dispose();
    expect(stop).toHaveBeenCalled();
    expect(e.onFile).not.toHaveBeenCalled();
    expect(e.onEnd).not.toHaveBeenCalled();
  });
  it("validates saved phone contacts and includes only deliberately entered note/location", () => {
    expect(phoneHref("+91 (98765) 43210")).toBe("tel:+919876543210");
    expect(phoneHref("javascript:alert(1)")).toBeNull();
    expect(
      kitContacts(
        JSON.stringify({
          trustedName: "Friend",
          trustedNumber: "+919876543210",
          securityNumber: "no",
        }),
      ),
    ).toHaveLength(1);
    expect(kitContacts("null")).toEqual([]);
    const note = supportMessage("Please call", "Library entrance", "Friend");
    expect(note).toContain("Location I entered: Library entrance");
    expect(note).not.toContain("GPS");
    expect(supportMessage("", "")).toContain("Location not included.");
  });
});
