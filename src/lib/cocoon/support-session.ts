export type CaptureMode = "audio" | "video";
export interface BatteryState {
  level: number;
  charging: boolean;
}
export function capturePlan(mode: CaptureMode, battery: BatteryState | null, powerSaving = true) {
  const low = !!battery && !battery.charging && battery.level < 0.2;
  const effective: CaptureMode = mode === "video" && low && powerSaving ? "audio" : mode;
  return {
    mode: effective,
    maxSeconds: effective === "audio" ? 180 : 45,
    reason:
      effective !== mode
        ? "Audio selected to preserve a battery below 20%."
        : battery
          ? "Battery reading is an estimate."
          : "Battery reading unavailable; short recording limits still apply.",
  };
}
export interface CaptureEvents {
  onStream: (stream: MediaStream | null) => void;
  onFile: (file: File) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}
export const MAX_CAPTURE_BYTES = 12 * 1024 * 1024;
/** Permission is requested only by start(). Stop/dispose also invalidate an unresolved permission request. */
export class CaptureSession {
  private generation = 0;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private bytes = 0;
  private failed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private events: CaptureEvents | null;
  constructor(events: CaptureEvents) {
    this.events = events;
  }
  async start(mode: CaptureMode, maxSeconds: number) {
    if (!this.events) throw new Error("This capture session has closed.");
    if (this.recorder || this.stream) throw new Error("Stop the current recording first.");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
      throw new Error(
        "Recording is not available in this browser. You can still call a contact or write a support note.",
      );
    const request = ++this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video:
        mode === "video"
          ? { facingMode: { ideal: "environment" }, width: { ideal: 720 }, height: { ideal: 1280 } }
          : false,
    });
    if (request !== this.generation || !this.events) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("Recording cancelled.");
    }
    this.stream = stream;
    this.chunks = [];
    this.bytes = 0;
    this.failed = false;
    try {
      const candidates =
        mode === "video"
          ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
          : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(
        stream,
        mimeType
          ? {
              mimeType,
              ...(mode === "video"
                ? { videoBitsPerSecond: 650000 }
                : { audioBitsPerSecond: 64000 }),
            }
          : undefined,
      );
      this.recorder = recorder;
      recorder.ondataavailable = (e) => {
        if (!e.data.size || this.failed) return;
        this.bytes += e.data.size;
        if (this.bytes > MAX_CAPTURE_BYTES) {
          this.failed = true;
          this.chunks = [];
          this.events?.onError(
            "This clip reached the 12 MB limit and was discarded. Try a shorter clip or audio.",
          );
          this.stop();
          return;
        }
        this.chunks.push(e.data);
      };
      recorder.onerror = () => {
        this.failed = true;
        this.chunks = [];
        this.events?.onError("Recording was interrupted. No complete clip was saved.");
        this.stop();
      };
      recorder.onstop = () => {
        clearTimeout(this.timer);
        stream.getTracks().forEach((t) => t.stop());
        if (this.recorder !== recorder) return;
        this.recorder = null;
        this.stream = null;
        this.events?.onStream(null);
        const chunks = this.chunks;
        this.chunks = [];
        if (this.events && !this.failed && chunks.length) {
          const type = recorder.mimeType || (mode === "video" ? "video/webm" : "audio/webm");
          const ext = type.includes("mp4") ? "mp4" : "webm";
          this.events.onFile(
            new File(
              chunks,
              `cocoon-${mode}-${new Date().toISOString().replaceAll(":", "-")}.${ext}`,
              { type },
            ),
          );
        }
        this.events?.onEnd();
      };
      stream.getTracks().forEach((track) =>
        track.addEventListener(
          "ended",
          () => {
            if (this.recorder === recorder) this.stop();
          },
          { once: true },
        ),
      );
      recorder.start(1000);
      this.events.onStream(stream);
      this.timer = setTimeout(() => this.stop(), Math.max(1, Math.min(180, maxSeconds)) * 1000);
    } catch (error) {
      stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      this.recorder = null;
      this.events?.onStream(null);
      throw error;
    }
  }
  stop() {
    ++this.generation;
    clearTimeout(this.timer);
    const recorder = this.recorder;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        this.events?.onError("The recording could not be finalised.");
        this.recorder = null;
        this.stream?.getTracks().forEach((track) => track.stop());
        this.stream = null;
        this.chunks = [];
        this.events?.onStream(null);
        this.events?.onEnd();
      }
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    if (!recorder) {
      this.stream = null;
      this.events?.onStream(null);
      this.events?.onEnd();
    }
  }
  async photo(video: HTMLVideoElement) {
    const request = this.generation;
    if (
      !this.stream?.getVideoTracks().some((t) => t.readyState === "live") ||
      video.readyState < 2 ||
      !video.videoWidth
    )
      throw new Error("Wait for the camera preview before taking a photo.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo capture is unavailable.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.78),
    );
    if (request !== this.generation || !this.events)
      throw new Error("Camera stopped before the photo completed.");
    if (!blob || blob.size > 3 * 1024 * 1024)
      throw new Error("The photo could not be saved within the size limit.");
    this.events.onFile(
      new File([blob], `cocoon-photo-${new Date().toISOString().replaceAll(":", "-")}.jpg`, {
        type: "image/jpeg",
      }),
    );
  }
  dispose() {
    this.events = null;
    this.failed = true;
    this.chunks = [];
    this.stop();
    this.recorder = null;
    this.stream = null;
  }
}

export interface KitContact {
  name: string;
  number: string;
}
export const phoneHref = (number: string) => {
  const clean = number.replace(/[\s().-]/g, "");
  return /^\+?[0-9]{7,15}$/.test(clean) ? `tel:${clean}` : null;
};
export function kitContacts(raw: string | null): KitContact[] {
  try {
    const k = JSON.parse(raw || "{}") as Record<string, unknown>;
    return [
      [k["trustedName"], k["trustedNumber"]],
      [k["security"], k["securityNumber"]],
    ].flatMap(([name, number]) =>
      typeof number === "string" && phoneHref(number)
        ? [
            {
              name: typeof name === "string" && name.trim() ? name.slice(0, 60) : "Saved contact",
              number: number.slice(0, 40),
            },
          ]
        : [],
    );
  } catch {
    return [];
  }
}
export function supportMessage(note: string, place: string, contactName?: string) {
  return [
    `COCOON / SUPPORT REQUEST`,
    contactName ? `For ${contactName.slice(0, 60)}` : "",
    note.trim()
      ? `What I want you to know: ${note.trim().slice(0, 1000)}`
      : "Please call me or check in with me.",
    place.trim() ? `Location I entered: ${place.trim().slice(0, 250)}` : "Location not included.",
    "No emergency dispatch or delivery receipt is provided by Cocoon.",
  ]
    .filter(Boolean)
    .join("\n");
}
