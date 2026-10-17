import { bearerHeaders } from "@/lib/production/auth";
import type { CallPhase } from "@/components/cocoon/art";
export interface LiveVoiceHandle {
  close: () => void;
  mute: (value: boolean) => void;
  speaker: (value: boolean) => void;
  interrupt: () => void;
}
export interface LiveVoiceOptions {
  signal: AbortSignal;
  contextConsent: boolean;
  context: {
    supportMode?: boolean;
    intention?: "company" | "grounding" | "next-step";
    situation?: string;
    name: string;
    style: string;
    destination?: string;
    eta?: number;
    sharing?: boolean;
    country: string | null;
  };
  onPhase: (p: CallPhase) => void;
  onCaption: (text: string) => void;
  onError: (text: string) => void;
  onClosed?: () => void;
}
/** Speech-to-speech WebRTC; no standard API key enters the browser. No audio recordings. */
export async function connectLiveVoice(o: LiveVoiceOptions): Promise<LiveVoiceHandle> {
  if (o.signal.aborted) throw new Error("Call cancelled.");
  const pc = new RTCPeerConnection();
  const audio = new Audio();
  audio.autoplay = true;
  let stream: MediaStream | null = null;
  let channel: RTCDataChannel | null = null;
  let closed = false;
  let generating = false;
  let playing = false;
  let sessionId: string | null = null;
  let maxDuration: ReturnType<typeof setTimeout> | undefined;
  const endServer = () => {
    if (sessionId)
      void bearerHeaders()
        .then((headers) =>
          fetch(`/api/companion/voice?session=${encodeURIComponent(sessionId ?? "")}`, {
            method: "DELETE",
            headers,
            keepalive: true,
          }),
        )
        .catch(() => undefined);
  };
  let disconnected: ReturnType<typeof setTimeout> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timeout);
    clearTimeout(maxDuration);
    clearTimeout(disconnected);
    window.removeEventListener("pagehide", close);
    endServer();
    o.signal.removeEventListener("abort", close);
    if (channel) {
      channel.onmessage = null;
      channel.onopen = null;
      channel.onclose = null;
      channel.close();
    }
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
    stream?.getTracks().forEach((t) => t.stop());
    audio.pause();
    audio.srcObject = null;
    o.onClosed?.();
  };
  o.signal.addEventListener("abort", close, { once: true });
  window.addEventListener("pagehide", close, { once: true });
  try {
    o.onPhase("connecting");
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    if (closed || o.signal.aborted) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error("Call cancelled.");
    }
    const activeStream = stream;
    activeStream.getAudioTracks().forEach((t) => {
      t.onended = close;
      pc.addTrack(t, activeStream);
    });
    pc.ontrack = (e) => {
      if (closed) return;
      audio.srcObject = e.streams[0] ?? new MediaStream([e.track]);
      void audio
        .play()
        .catch(() => o.onError("Audio playback was blocked. Tap Speaker to play it."));
    };
    const fail = (message: string) => {
      if (closed) return;
      o.onError(message);
      o.onPhase("error");
      close();
    };
    pc.onconnectionstatechange = () => {
      if (closed) return;
      if (pc.connectionState === "connected") {
        clearTimeout(timeout);
        clearTimeout(disconnected);
        o.onPhase("listening");
      }
      if (pc.connectionState === "disconnected") {
        o.onPhase("connecting");
        clearTimeout(disconnected);
        disconnected = setTimeout(
          () => fail("Connection lost. Microphone stopped; you can retry the call."),
          8000,
        );
      }
      if (pc.connectionState === "failed" || pc.connectionState === "closed")
        fail("The live connection ended. Microphone stopped; your help controls remain available.");
    };
    channel = pc.createDataChannel("oai-events");
    channel.onclose = () => fail("Voice connection closed. Microphone stopped; you can retry.");
    channel.onopen = () => {
      if (!closed)
        channel?.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Introduce yourself as the user's AI companion. Follow the session's opening guidance and ask one short question.",
            },
          }),
        );
    };
    channel.onmessage = (e) => {
      if (closed) return;
      let ev: Record<string, unknown>;
      try {
        ev = JSON.parse(String(e.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (ev["type"] === "input_audio_buffer.speech_started") o.onPhase("listening");
      if (ev["type"] === "response.created") {
        generating = true;
        o.onPhase("thinking");
      }
      if (ev["type"] === "output_audio_buffer.started") {
        playing = true;
        o.onPhase("speaking");
      }
      if (ev["type"] === "response.done") {
        generating = false;
        if (!playing) o.onPhase("listening");
      }
      if (
        ev["type"] === "output_audio_buffer.stopped" ||
        ev["type"] === "output_audio_buffer.cleared"
      ) {
        playing = false;
        o.onPhase("listening");
      }
      if (
        ev["type"] === "response.output_audio_transcript.done" &&
        typeof ev["transcript"] === "string"
      )
        o.onCaption(ev["transcript"].slice(0, 3000));
      if (ev["type"] === "error") {
        o.onError(
          "The voice provider reported an error. Your journey and SOS controls are still available.",
        );
        o.onPhase("error");
        close();
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (closed) throw new Error("Call cancelled.");
    const response = await fetch("/api/companion/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await bearerHeaders()) },
      body: JSON.stringify({
        sdp: offer.sdp,
        audioConsent: true,
        contextConsent: o.contextConsent,
        ...o.context,
      }),
      signal: o.signal,
    });
    if (!response.ok) {
      const data = (await response
        .json()
        .catch(() => ({ error: "Could not connect live voice." }))) as { error?: string };
      throw new Error(data.error ?? "Could not connect live voice.");
    }
    sessionId = response.headers.get("X-Cocoon-Voice-Session");
    const sdp = await response.text();
    if (closed) endServer();
    maxDuration = setTimeout(close, 600000);
    if (closed) throw new Error("Call cancelled.");
    await pc.setRemoteDescription({ type: "answer", sdp });
    timeout = setTimeout(() => {
      if (pc.connectionState !== "connected") {
        o.onError("Voice did not connect. Please end the call and retry.");
        o.onPhase("error");
        close();
      }
    }, 20000);
    return {
      close,
      mute: (v) =>
        stream?.getAudioTracks().forEach((t) => {
          t.enabled = !v;
        }),
      speaker: (v) => {
        audio.muted = !v;
        if (v) void audio.play().catch(() => o.onError("Audio playback is unavailable."));
      },
      interrupt: () => {
        if (closed || channel?.readyState !== "open") return;
        if (generating) channel.send(JSON.stringify({ type: "response.cancel" }));
        if (playing) channel.send(JSON.stringify({ type: "output_audio_buffer.clear" }));
      },
    };
  } catch (e) {
    close();
    throw e;
  }
}

