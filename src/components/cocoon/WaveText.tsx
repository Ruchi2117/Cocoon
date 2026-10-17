import type { CSSProperties, ElementType } from "react";

/** Letters bob in a gentle travelling wave. Screen readers get the plain text once. */
export function WaveText({
  text,
  as: Tag = "span",
  className = "",
  step = 0.07,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  step?: number;
}) {
  return (
    <Tag className={`wave-text ${className}`} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ "--i": i, "--step": `${step}s` } as CSSProperties}
        >
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </Tag>
  );
}

/** A slow looping ribbon of wave text; decorative duplicate is hidden from assistive tech. */
export function WaveRibbon({ items, label }: { items: string[]; label: string }) {
  const line = items.join("   ✳   ") + "   ✳   ";
  return (
    <div className="wave-ribbon" role="marquee" aria-label={label}>
      <div className="wave-ribbon-track">
        <WaveText text={line} step={0.045} />
        <span aria-hidden="true">
          <WaveText text={line} step={0.045} />
        </span>
      </div>
    </div>
  );
}

/** Text that circles slowly around a ring, like a spinning badge. */
export function CircleText({ text, size = 140, className = "" }: { text: string; size?: number; className?: string }) {
  const id = `ct-${text.replace(/[^a-z]/gi, "").slice(0, 12)}`;
  return (
    <svg className={`circle-text ${className}`} width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id={id} d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0" />
      </defs>
      <text>
        <textPath href={`#${id}`} textLength="488">
          {text}
        </textPath>
      </text>
      <text x="100" y="114" textAnchor="middle" className="circle-text-star">✳</text>
    </svg>
  );
}

/** Poster word whose letters swell and squash in a travelling bulge. */
export function WarpText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`warp-text ${className}`} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span key={i} aria-hidden="true" style={{ "--i": i } as CSSProperties}>
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </span>
  );
}

/**
 * Words drift along a hand-drawn, gently undulating thread — like a river or a
 * night road winding through the scene — instead of sitting in a box.
 */
export function ThreadText({ items, label, className = "" }: { items: string[]; label: string; className?: string }) {
  const id = `thread-${label.replace(/[^a-z]/gi, "").slice(0, 10)}`;
  const line = items.join("  ·  ✳  ·  ");
  return (
    <svg className={`thread-text ${className}`} viewBox="0 0 1600 220" preserveAspectRatio="none" role="img" aria-label={label}>
      <defs>
        <path id={id} d="M-200 150 C 100 40, 360 210, 640 120 S 1100 20, 1300 130 S 1650 180, 1900 80">
          <animate attributeName="d" dur="14s" repeatCount="indefinite"
            values="M-200 150 C 100 40, 360 210, 640 120 S 1100 20, 1300 130 S 1650 180, 1900 80;
                    M-200 110 C 120 190, 380 60, 660 140 S 1080 200, 1320 90 S 1640 40, 1900 140;
                    M-200 150 C 100 40, 360 210, 640 120 S 1100 20, 1300 130 S 1650 180, 1900 80" />
        </path>
      </defs>
      <use href={`#${id}`} className="thread-line" />
      <text aria-hidden="true">
        <textPath href={`#${id}`} startOffset="0%">
          {line}  ·  ✳  ·  {line}
          <animate attributeName="startOffset" from="0%" to="-50%" dur="60s" repeatCount="indefinite" />
        </textPath>
      </text>
    </svg>
  );
}

/**
 * Whispers: short phrases that rise like warm steam beside the caller and dissolve,
 * one at a time, alternating sides. Decorative only.
 */
export function Whispers({ items, className = "" }: { items: string[]; className?: string }) {
  const cycle = items.length * 3.2;
  return (
    <div className={`whispers ${className}`} aria-hidden="true">
      {items.map((t, n) => (
        <span
          key={t}
          className="whisper"
          data-side={n % 2 ? "r" : "l"}
          style={
            {
              "--d": `${n * 3.2}s`,
              "--cycle": `${cycle}s`,
              "--x": `${(n * 37) % 22}px`,
            } as CSSProperties
          }
        >
          {Array.from(t).map((ch, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties}>
              {ch === " " ? "\u00a0" : ch}
            </i>
          ))}
        </span>
      ))}
    </div>
  );
}

/**
 * BigWords: huge poster words that drift across the page in a slow loop while each
 * letter bulges in a travelling wave and words float up and down. Decorative.
 */
export function BigWords({ words, label, className = "" }: { words: string[]; label: string; className?: string }) {
  const row = (hidden: boolean) => (
    <div className="bigwords-row" aria-hidden={hidden || undefined}>
      {words.map((w, n) => (
        <span key={n} className="bigwords-word" data-tone={n % 3} style={{ "--n": n } as CSSProperties}>
          {Array.from(w).map((ch, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties}>
              {ch === " " ? "\u00a0" : ch}
            </i>
          ))}
          <b aria-hidden="true">✳</b>
        </span>
      ))}
    </div>
  );
  return (
    <section className={`bigwords ${className}`} aria-label={label}>
      <div className="bigwords-track">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}

/**
 * ScrollWords: a large statement whose words light up one by one as it scrolls
 * through the screen (CSS scroll-driven animation; fully lit where unsupported).
 */
export function ScrollWords({ text, accent = [], className = "" }: { text: string; accent?: string[]; className?: string }) {
  const words = text.split(" ");
  return (
    <p className={`scrollwords ${className}`}>
      {words.map((w, i) => (
        <span
          key={i}
          data-accent={accent.includes(w.replace(/[^\w’']/g, "")) || undefined}
          style={{ "--i": i, "--n": words.length } as CSSProperties}
        >
          {w}{" "}
        </span>
      ))}
    </p>
  );
}
