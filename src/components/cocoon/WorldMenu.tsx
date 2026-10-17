import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Compass, ArrowUpRight, ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmergencyAccess } from "./EmergencyAccess";
import { setRole } from "@/lib/cocoon/actions";
import { resetDemo } from "@/lib/cocoon/store";
import type { Role } from "@/lib/cocoon/types";
import { AtlasPanorama } from "./AtlasPanorama";
import { motion, useReducedMotion } from "motion/react";
import { enterWorld } from "@/lib/cocoon/world-navigation";
import { ThreadText } from "./WaveText";
const NIGHT_CHAPTERS = [
  {
    name: "The city is awake",
    note: "A starting point, full of possibility.",
    time: "HOME / CITY LIGHTS",
  },
  {
    name: "The last train home",
    note: "Find your own thread through the city.",
    time: "ROUTES / THE RIVERSIDE",
  },
  {
    name: "A light left on",
    note: "Small check-ins. People who know your plan.",
    time: "JOURNEY / THE NEIGHBOURHOOD",
  },
  {
    name: "Room to exhale",
    note: "A quiet shelter. A little company.",
    time: "CALL / THE LISTENING PAVILION",
  },
  {
    name: "Ready for the everyday",
    note: "Useful things and a plan to carry.",
    time: "KIT / THE PACKING ROOM",
  },
  {
    name: "Bring context into focus",
    note: "Observations and sources, side by side.",
    time: "REPORTS / THE CONTEXT DESK",
  },
  {
    name: "One more chapter",
    note: "Knowledge to carry into the night.",
    time: "LEARN / THE LIBRARY",
  },
  {
    name: "Someone is listening",
    note: "Different lives. A little shared light.",
    time: "CIRCLE / THE COURTYARD",
  },
];
const PLACE_ORDER = ["Home", "Routes", "Journey", "Call", "Kit", "Reports", "Learn", "Circle"];
const descriptions: Record<string, string> = {
  Home: "Step into the world",
  Routes: "Find your way",
  Journey: "Keep your people close",
  Call: "A little company",
  Kit: "Your everyday backup",
  Reports: "The wider picture",
  Learn: "Know your ground",
  Circle: "Room to be heard",
};
export function WorldMenu({
  items,
  role,
}: {
  items: { to: string; label: string; icon: LucideIcon }[];
  role: Role;
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const current = items.find((item) => item.to === location.pathname);
  const [preview, setPreview] = useState<string | null>(null);
  const [scene, setScene] = useState(0);
  const still = false;
  const [direction, setDirection] = useState(1);
  const lastWheel = useRef(0);
  const sceneFor = (label: string) =>
    label === "Learn" || label === "Kit" ? 1 : label === "Circle" ? 2 : 0;
  const previewPlace = (label: string) => {
    setPreview(label);
    setScene(sceneFor(label));
  };
  const changeScene = (delta: number) => {
    setDirection(delta);
    const index = PLACE_ORDER.indexOf(preview ?? current?.label ?? "Home");
    const available = PLACE_ORDER.filter((label) => items.some((item) => item.label === label));
    const active = available.indexOf(PLACE_ORDER[index] ?? "Home");
    const label = available[(active + delta + available.length) % available.length];
    if (label) previewPlace(label);
  };
  const selected = items.find((item) => item.label === preview) ?? current ?? items[0]!;
  const chapter = NIGHT_CHAPTERS[Math.max(0, PLACE_ORDER.indexOf(selected.label))]!;
  const reduced = useReducedMotion();
  return (
    <div className="world-compass-bar">
      <Link to="/" className="compass-brand" aria-label="Cocoon home">
        ✳ <span>COCOON.</span>
      </Link>
      <div className="compass-actions">
        <EmergencyAccess />
        <Dialog
          open={open}
          onOpenChange={(value) => {
            if (value) {
              setPreview(current?.label ?? null);
              setScene(sceneFor(current?.label ?? "Home"));
            }
            setOpen(value);
          }}
        >
          <DialogTrigger asChild>
            <button className="compass-trigger" aria-label="Open Cocoon atlas">
              <span className="compass-current">{current?.label ?? "Explore"}</span>
              <span>Find your place</span>
              <Compass size={23} />
            </button>
          </DialogTrigger>
          <DialogContent
            className="world-menu-dialog atlas-menu night-atlas panoramic-atlas"
            data-place={selected.label}
            data-scene={scene}
            data-still={still || !!reduced}
          >
            <AtlasPanorama
              scene={scene}
              place={selected.label}
              still={still}
              direction={direction}
            />
            <div className="world-menu-intro">
              <span className="eyebrow">COCOON / THE LIVING ATLAS</span>
              <DialogTitle aria-label="A world with you">
                {descriptions[selected.label] ?? selected.label}
                <em className="panorama-place">{selected.label}.</em>
              </DialogTitle>
              <DialogDescription>
                Explore the city after hours. Scroll or swipe to discover a different place.
              </DialogDescription>
            </div>
            <section
              className="atlas-window"
              aria-label="Nighttime scenes"
              tabIndex={0}
              onWheel={(event) => {
                if (reduced || Math.abs(event.deltaY) < 15) return;
                const now = Date.now();
                if (now - lastWheel.current < 1400) return;
                lastWheel.current = now;
                changeScene(event.deltaY > 0 ? 1 : -1);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  changeScene(1);
                }
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  changeScene(-1);
                }
              }}
            >
              <motion.div
                className="panorama-gesture"
                drag={reduced ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.05}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -55) changeScene(1);
                  else if (info.offset.x > 55) changeScene(-1);
                }}
              />
              <div className="atlas-caption">
                <span>{chapter.time}</span>
                <strong>{chapter.name}</strong>
                <p>{chapter.note}</p>
              </div>
              <div className="atlas-scene-controls">
                <button aria-label="Previous nighttime scene" onClick={() => changeScene(-1)}>
                  <ArrowLeft size={18} />
                </button>
                <span aria-live="polite">
                  {Math.max(0, PLACE_ORDER.indexOf(selected.label)) + 1} / 8
                </span>
                <button aria-label="Next nighttime scene" onClick={() => changeScene(1)}>
                  <ArrowRight size={18} />
                </button>
              </div>
            </section>
            <ThreadText
              className="atlas-thread"
              label="Places in the atlas"
              items={NIGHT_CHAPTERS.map((c) => c.name)}
            />
            <nav aria-label="Explore Cocoon" className="world-menu-places">
              {items.map((item, index) => (
                <Link
                  to={item.to as "/"}
                  key={item.to}
                  viewTransition={false}
                  onMouseEnter={() => previewPlace(item.label)}
                  onFocus={() => previewPlace(item.label)}
                  data-preview={selected.label === item.label}
                  onClick={(event) => {
                    enterWorld(event, {
                      to: item.to,
                      label: descriptions[item.label] ?? item.label,
                    });
                    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)
                      setOpen(false);
                  }}
                  aria-current={location.pathname === item.to ? "page" : undefined}
                >
                  <item.icon size={26} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{descriptions[item.label] ?? "Explore this place"}</small>
                  </span>
                  <ArrowUpRight size={20} />
                </Link>
              ))}
            </nav>
            <details className="compass-demo-tools">
              <summary>Demo settings & role</summary>
              <label>
                Demo role
                <select
                  value={role}
                  onChange={(event) => {
                    const next = event.target.value as Role;
                    setRole(next);
                    setOpen(false);
                    void navigate({
                      to:
                        next === "traveller"
                          ? "/"
                          : next === "guardian"
                            ? "/guardian"
                            : next === "moderator"
                              ? "/moderate"
                              : "/responder",
                    });
                  }}
                >
                  {["traveller", "guardian", "responder", "moderator"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => resetDemo()}>Reset demo data</button>
              <Link to="/kit" onClick={() => setOpen(false)}>
                Country & contacts ↗
              </Link>
              <p>Local demo · simulated alerts · no emergency dispatch.</p>
            </details>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
