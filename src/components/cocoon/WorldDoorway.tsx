import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { WORLD_ENTRANCE, type WorldEntrance } from "@/lib/cocoon/world-navigation";
import { NightAtlasScene } from "./NightAtlasScene";
import { WaveText } from "./WaveText";
import { Button } from "@/components/ui/button";
const placeNames: Record<string, string> = {
  "/": "Home",
  "/explore": "Routes",
  "/trip": "Journey",
  "/circle": "Circle",
  "/learn": "Learn",
  "/kit": "Kit",
  "/reports": "Reports",
  "/presence": "Call",
};
const destinations = new Set([
  "/",
  "/explore",
  "/circle",
  "/learn",
  "/presence",
  "/trip",
  "/kit",
  "/reports",
]);
/** Persists above route content, so entering a room animates in WebViews too. */
export function WorldDoorway() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [request, setRequest] = useState<(WorldEntrance & { id: number }) | null>(null);
  const [phase, setPhase] = useState<"cover" | "open">("cover");
  const active = useRef<number | null>(null);
  const counter = useRef(0);
  const navigating = useRef(false);
  useEffect(() => {
    const enter = (event: Event) => {
      const detail = (event as CustomEvent<WorldEntrance>).detail;
      if (!detail || !destinations.has(detail.to) || reduce) return;
      detail.handled = true;
      if (active.current !== null) return;
      const id = ++counter.current;
      active.current = id;
      navigating.current = false;
      setPhase("cover");
      setRequest({ ...detail, id });
    };
    window.addEventListener(WORLD_ENTRANCE, enter);
    return () => {
      window.removeEventListener(WORLD_ENTRANCE, enter);
    };
  }, [reduce]);
  useEffect(
    () => () => {
      active.current = null;
    },
    [],
  );
  const dismiss = useCallback((id: number) => {
    if (active.current !== id) return;
    active.current = null;
    setRequest(null);
  }, []);
  const go = useCallback(async () => {
    if (!request || navigating.current || active.current !== request.id) return;
    navigating.current = true;
    try {
      await navigate({
        to: request.to as "/",
        ...(request.hash ? { hash: request.hash } : {}),
        viewTransition: false,
      });
      document.getElementById("main-content")?.focus({ preventScroll: true });
    } catch {
      toast.error("That room could not open. Please try its navigation link again.");
    } finally {
      if (active.current === request.id) setPhase("open");
    }
  }, [navigate, request]);
  useEffect(() => {
    if (!request || phase !== "cover") return;
    // Animation callbacks are optional: interrupted/hidden WebViews still navigate once.
    const timer = window.setTimeout(() => void go(), reduce ? 0 : 550);
    // A hung router promise must not leave the page covered or intercept future links.
    const watchdog = window.setTimeout(() => {
      if (active.current === request.id) setPhase("open");
    }, 5000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(watchdog);
    };
  }, [request, phase, reduce, go]);
  useEffect(() => {
    if (!request || phase !== "open") return;
    const timer = window.setTimeout(() => dismiss(request.id), reduce ? 0 : 550);
    return () => window.clearTimeout(timer);
  }, [request, phase, reduce, dismiss]);
  if (!request) return null;
  const origin = `${request.x ?? 65}% ${request.y ?? 60}%`;
  return (
    <div
      className="world-doorway-host"
      onKeyDown={(event) => {
        if (event.key === "Tab") event.preventDefault();
        if (event.key === "Escape") {
          void go();
        }
      }}
    >
      <motion.div
        key={request.id}
        className="world-doorway"
        data-place={placeNames[request.to]}
        initial={{ clipPath: `circle(0% at ${origin})` }}
        animate={{
          clipPath: phase === "cover" ? `circle(150% at ${origin})` : `circle(0% at ${origin})`,
        }}
        transition={{
          duration: reduce ? 0 : phase === "cover" ? 0.55 : 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        onAnimationComplete={() => {
          if (phase === "cover") void go();
          else {
            dismiss(request.id);
          }
        }}
      >
        <motion.div
          className="world-doorway-art"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: reduce ? 0 : 0.18, duration: reduce ? 0 : 0.35 }}
        >
          <NightAtlasScene
            scene={request.to === "/circle" ? 2 : ["/learn", "/kit"].includes(request.to) ? 1 : 0}
          />
        </motion.div>
        <div className="world-doorway-label" role="status">
          <span>COCOON / A LITTLE FURTHER</span>
          <WaveText as="p" text={request.label} />
        </div>
      </motion.div>
      {phase === "cover" && (
        <Button
          autoFocus
          aria-label="Skip this transition"
          onClick={() => {
            void go();
          }}
        >
          <X size={18} />
        </Button>
      )}
    </div>
  );
}
