import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { WORLD_ENTRANCE, type WorldEntrance } from "@/lib/cocoon/world-navigation";
import { NightAtlasScene } from "./NightAtlasScene";
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
      if (!detail || !destinations.has(detail.to) || active.current !== null || reduce) return;
      detail.handled = true;
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
  useEffect(() => {
    if (!request) return;
    const timer = window.setTimeout(() => {
      if (active.current === request.id) setPhase("open");
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [request]);
  if (!request) return null;
  const origin = `${request.x ?? 65}% ${request.y ?? 60}%`;
  const go = async () => {
    if (navigating.current || active.current !== request.id) return;
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
  };
  return (
    <div
      className="world-doorway-host"
      onKeyDown={(event) => {
        if (event.key === "Tab") event.preventDefault();
        if (event.key === "Escape") {
          void go();
          setPhase("open");
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
            active.current = null;
            setRequest(null);
          }
        }}
      >
        <div className="world-doorway-art" aria-hidden="true">
          <NightAtlasScene
            scene={request.to === "/circle" ? 2 : ["/learn", "/kit"].includes(request.to) ? 1 : 0}
          />
        </div>
        <div className="world-doorway-label" role="status">
          <span>COCOON / A LITTLE FURTHER</span>
          <p>{request.label}</p>
        </div>
      </motion.div>
      <button
        autoFocus
        onClick={() => {
          void go();
          setPhase("open");
        }}
      >
        Skip animation ↗
      </button>
    </div>
  );
}
