import { useEffect, useRef, type RefObject } from "react";
import { createFrameCoalescer } from "@/lib/cocoon/frame-coalescer";

export type CallCharacterState = "idle" | "ringing" | "listening" | "speaking" | "muted" | "ending";

/**
 * The friend in the window — a flat, geometric illustration drawn in the same language as
 * Cocoon's world art (arched doorway, warm lamp, night sky). While a call is live her mouth,
 * lamp and sound arcs follow the real level of the incoming voice (Web Audio analyser on the
 * received stream, never connected to output or recorded).
 */
export function CallCharacter({
  state,
  audioRef,
  name,
}: {
  state: CallCharacterState;
  audioRef?: RefObject<HTMLAudioElement | null>;
  name?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const live = state === "speaking" || state === "listening" || state === "muted";

  useEffect(() => {
    const el = root.current;
    const audio = audioRef?.current;
    if (!el) return;
    el.style.setProperty("--level", "0");
    if (!live || !audio || typeof window === "undefined" || !("AudioContext" in window)) return;
    let raf = 0;
    let ctx: AudioContext | null = null;
    let cancelled = false;
    const attach = () => {
      const stream = audio.srcObject;
      if (cancelled || !(stream instanceof MediaStream) || stream.getAudioTracks().length === 0) {
        if (!cancelled) raf = requestAnimationFrame(attach);
        return;
      }
      try {
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let smooth = 0;
        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 2; i < 40; i++) sum += data[i] ?? 0;
          const level = Math.min(1, sum / (38 * 150));
          smooth = smooth * 0.65 + level * 0.35;
          el.style.setProperty("--level", smooth.toFixed(3));
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Level meter is optional; the illustration still animates from call state.
      }
    };
    attach();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      void ctx?.close().catch(() => undefined);
      el.style.setProperty("--level", "0");
    };
  }, [live, audioRef]);

  // The scene leans very slightly toward the pointer on larger screens. Pointer input is
  // coalesced to one layout read/style write per frame, only while the character is on screen,
  // the tab is visible and reduced motion is off.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof window === "undefined" || !window.matchMedia) return;
    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let onScreen = true;
    let lastX = "",
      lastY = "";
    const write = (x: string, y: string) => {
      if (x === lastX && y === lastY) return;
      lastX = x;
      lastY = y;
      el.style.setProperty("--look-x", x);
      el.style.setProperty("--look-y", y);
    };
    const frame = createFrameCoalescer<{ x: number; y: number }>((p) => {
      const r = el.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (p.x - (r.left + r.width / 2)) / 500));
      const y = Math.max(-1, Math.min(1, (p.y - (r.top + r.height / 2)) / 500));
      write(x.toFixed(2), y.toFixed(2));
    });
    const move = (e: PointerEvent) => {
      if (!onScreen || reduce.matches || !fine.matches || document.visibilityState === "hidden")
        return;
      frame.schedule({ x: e.clientX, y: e.clientY });
    };
    const settle = () => {
      if (reduce.matches) {
        frame.cancel();
        write("0.00", "0.00");
      }
    };
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            onScreen = !!entry?.isIntersecting;
            if (!onScreen) frame.cancel();
          });
    io?.observe(el);
    settle();
    reduce.addEventListener?.("change", settle);
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      reduce.removeEventListener?.("change", settle);
      io?.disconnect();
      frame.cancel();
    };
  }, []);

  return (
    <div
      ref={root}
      className="friend"
      data-state={state}
      role="img"
      aria-label={`${name || "Your caller"} · ${state}`}
    >
      <div className="friend-halo" aria-hidden="true" />
      <svg viewBox="0 0 320 380" aria-hidden="true" className="friend-svg">
        <defs>
          <clipPath id="friend-arch">
            <path d="M40 380V150a120 120 0 0 1 240 0v230z" />
          </clipPath>
          <radialGradient id="friend-lamp" cx="0.72" cy="0.58" r="0.55">
            <stop offset="0" stopColor="#f3c98d" stopOpacity="0.9" />
            <stop offset="1" stopColor="#f3c98d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="friend-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b2438" />
            <stop offset="1" stopColor="#3a3a52" />
          </linearGradient>
        </defs>

        {/* arch frame, echoing the home doorway */}
        <path className="friend-frame-outer" d="M22 380V150a138 138 0 0 1 276 0v230z" />
        <path className="friend-frame-inner" d="M32 380V150a128 128 0 0 1 256 0v230z" />

        <g clipPath="url(#friend-arch)">
          <rect width="320" height="380" fill="url(#friend-sky)" />
          <g className="friend-stars">
            <circle cx="90" cy="70" r="1.6" />
            <circle cx="210" cy="56" r="1.2" />
            <circle cx="240" cy="110" r="1.8" />
            <circle cx="120" cy="120" r="1" />
            <circle cx="70" cy="150" r="1.3" />
          </g>
          <circle className="friend-moon" cx="226" cy="92" r="22" />
          <path className="friend-hills" d="M40 250q60-40 120-12t120-20v162H40z" />
          <g className="friend-city">
            <rect x="52" y="214" width="22" height="50" />
            <rect x="78" y="228" width="16" height="40" />
            <rect x="236" y="206" width="26" height="60" />
            <rect className="friend-window-lit" x="58" y="224" width="5" height="6" />
            <rect
              className="friend-window-lit friend-window-b"
              x="244"
              y="218"
              width="5"
              height="6"
            />
            <rect
              className="friend-window-lit friend-window-c"
              x="252"
              y="236"
              width="5"
              height="6"
            />
          </g>
          <rect className="friend-lampglow" width="320" height="380" fill="url(#friend-lamp)" />
          {/* lamp */}
          <g className="friend-lamp">
            <path d="M246 236h28l-6-26h-16z" />
            <rect x="258" y="236" width="4" height="60" />
          </g>
          <rect className="friend-sill" x="40" y="296" width="240" height="84" />

          {/* the friend */}
          <g className="friend-person">
            <path className="friend-body" d="M100 380c0-62 26-92 60-92s60 30 60 92z" />
            <path className="friend-collar" d="M144 292l16 22 16-22z" />
            <rect className="friend-neck" x="151" y="262" width="18" height="30" rx="6" />
            <g className="friend-head">
              <path
                className="friend-hair-back friend-hair"
                d="M118 210c-4-44 18-70 44-70s48 26 42 74c-2 22-6 52-14 66h-62c-8-18-10-44-10-70z"
              />
              <ellipse className="friend-face" cx="160" cy="218" rx="34" ry="40" />
              <path
                className="friend-hair"
                d="M126 206c0-36 18-56 38-56 22 0 40 18 38 52-12-18-30-26-48-26-12 8-20 20-28 30z"
              />
              <g className="friend-eyes">
                <path d="M141 220q6-5 12 0" />
                <path d="M167 220q6-5 12 0" />
              </g>
              <circle className="friend-cheek" cx="140" cy="236" r="6" />
              <circle className="friend-cheek" cx="180" cy="236" r="6" />
              <g className="friend-mouth-wrap">
                <ellipse className="friend-mouth" cx="160" cy="244" rx="7" ry="4" />
              </g>
              <circle className="friend-earring" cx="127" cy="232" r="2.6" />
            </g>
            {/* hand + phone at her ear */}
            <g className="friend-phone">
              <rect x="186" y="200" width="14" height="30" rx="4" />
              <rect
                className="friend-phone-screen"
                x="188.5"
                y="203"
                width="9"
                height="22"
                rx="2"
              />
              <path
                className="friend-hand"
                d="M184 226c-2 18 6 40 18 58l20-6c-10-16-14-36-16-52z"
              />
            </g>
          </g>

          {/* chai on the sill */}
          <g className="friend-cup">
            <path d="M84 300h26l-3 22h-20z" />
            <path className="friend-steam" d="M92 294q-4-8 0-14t0-14" />
            <path className="friend-steam friend-steam-b" d="M102 294q4-8 0-14t0-14" />
          </g>
        </g>

        {/* sound arcs beside the phone */}
        <g className="friend-arcs">
          <path d="M226 196q12 18 0 36" />
          <path d="M238 186q20 28 0 56" />
          <path d="M250 176q28 38 0 76" />
        </g>
      </svg>
      <div className="friend-floor" aria-hidden="true" />
    </div>
  );
}
