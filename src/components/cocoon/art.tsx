import { motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type CallPhase =
  "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error" | "muted";

export function Waveform({
  active,
  tone = "plum",
}: {
  active: boolean;
  tone?: "plum" | "coral" | "light";
}) {
  const reduce = useReducedMotion();
  const color =
    tone === "coral" ? "bg-coral" : tone === "light" ? "bg-primary-foreground" : "bg-plum";
  return (
    <div className="flex h-8 items-center gap-1" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className={cn("w-1 rounded-full", color)}
          style={{ height: 6 }}
          animate={active && !reduce ? { height: [6, 8 + ((i * 7) % 22), 6] } : { height: 6 }}
          transition={{ repeat: Infinity, duration: 0.6 + (i % 5) * 0.12, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/** Gentle longer-exhale guide (4s in, 6s out). No breath holds. */
export function BreathingGuide({ onClose }: { onClose?: () => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"in" | "out">("in");
  useEffect(() => {
    const t = setTimeout(
      () => setPhase(phase === "in" ? "out" : "in"),
      phase === "in" ? 4000 : 6000,
    );
    return () => clearTimeout(t);
  }, [phase]);
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative grid h-48 w-48 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-lavender"
          animate={reduce ? {} : { scale: phase === "in" ? 1 : 0.55 }}
          initial={{ scale: 0.55 }}
          transition={{ duration: phase === "in" ? 4 : 6, ease: "easeInOut" }}
        />
        <span className="relative font-display text-2xl text-plum" aria-live="polite">
          {phase === "in" ? "Breathe in…" : "…and slowly out"}
        </span>
      </div>
      <p className="max-w-xs text-xs text-muted-foreground">
        In for about 4, out for about 6. No holding. Breathe normally and stop whenever it doesn't
        feel right. If you're in danger, call your local emergency number first.
      </p>
      {onClose && (
        <button onClick={onClose} className="text-sm underline">
          Stop breathing guide
        </button>
      )}
    </div>
  );
}
