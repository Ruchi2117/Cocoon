import { WaveText } from "./WaveText";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { GirlFigure } from "./GirlFigure";
import { WorldDestinations } from "./WorldDestinations";
import { WorldNightLight } from "./WorldNightLight";

import { activeTrip } from "@/lib/cocoon/access";
import { useDemoState } from "@/lib/cocoon/store";
import { enterWorld } from "@/lib/cocoon/world-navigation";

const places = [
  {
    name: "The city",
    title: ["OUT THERE.", "TOGETHER."],
    text: "A world to explore. A little courage to take with you.",
    cta: "Plan your journey",
    to: "/explore" as const,
    word: "BEGIN",
    color: "#ce4a49",
  },
  {
    name: "The riverside",
    title: ["YOUR WALK.", "YOUR WAY."],
    text: "Follow the path. Find a walking route, read the reports, and choose your own pace.",
    cta: "Find a walking route",
    to: "/explore" as const,
    word: "EXPLORE",
    color: "#dd9c69",
  },
  {
    name: "The courtyard",
    title: ["COME AS", "YOU ARE."],
    text: "A light ahead. A place to be heard. Find your people in the Circle.",
    cta: "Enter the Circle",
    to: "/circle" as const,
    word: "BELONG",
    color: "#798c78",
  },
  {
    name: "The night library",
    title: ["A LITTLE", "MORE LIGHT."],
    text: "Know your boundaries. Find practical guidance and read the news with context.",
    cta: "Enter the Safety Library",
    to: "/learn" as const,
    word: "DISCOVER",
    color: "#302c40",
  },
];
const camera = [0, -1100, -2200, -3300];

/** One continuous illustrated landscape. Native scroll moves its camera; links enter real routes. */
export function CocoonWorld() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(0);
  const [objectEngaged, setObjectEngaged] = useState(false);
  const [lookAround, setLookAround] = useState(0);
  const gazeTarget = useMotionValue(0);
  const gaze = useSpring(gazeTarget, { stiffness: 80, damping: 18 });
  const [headerHeight, setHeaderHeight] = useState(88);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref);
  const active = inView && !reduce;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const travel = useSpring(scrollYProgress, { stiffness: 65, damping: 26, restDelta: 0.0001 });
  const x = useTransform(travel, [0, 1 / 3, 2 / 3, 1], camera);
  const sky = useTransform(
    travel,
    [0, 1 / 3, 2 / 3, 1],
    places.map((p) => p.color),
  );
  const farX = useTransform(travel, [0, 1], [0, -450]);
  const frontX = useTransform(travel, [0, 1], [0, -3650]);
  const orbit = useTransform(travel, [0, 1], [0, -80]);
  const guideX = useTransform(travel, [0, 1 / 3, 2 / 3, 1], [0, -35, 30, 0]);
  const guideY = useTransform(travel, [0, 1 / 3, 2 / 3, 1], [0, -18, 8, 20]);
  const guideTurn = useTransform(travel, [0, 1 / 3, 2 / 3, 1], [0, -2, 1, 0]);
  const sunX = useTransform(travel, [0, 1], [0, -480]);
  const sunY = useTransform(travel, [0, 1], [0, 120]);
  const sunTint = useTransform(travel, [0, 1], ["#f4c177", "#e8e0ce"]);
  const sunSize = useTransform(travel, [0, 1], [170, 95]);
  const stars = useTransform(travel, [0, 0.55, 1], [0, 0, 0.9]);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setLookAround(p > 0.48 && p < 0.75 ? Math.sin(((p - 0.48) / 0.27) * Math.PI * 2) * 0.16 : 0);
    const next = Math.min(3, Math.max(0, Math.round(p * 3)));
    if (next !== scene) {
      setScene(next);
      setObjectEngaged(false);
    }
  });
  useEffect(() => {
    const header = document.querySelector("[data-app-header]");
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height + 16);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);
  const move = (index: number) => {
    const target = Math.max(0, Math.min(3, index));
    if (!ref.current || !stage.current) return;
    const top = ref.current.getBoundingClientRect().top + window.scrollY;
    const distance = ref.current.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + (distance * target) / 3,
      behavior: reduce ? "instant" : "smooth",
    });
  };
  const place = places[scene]!;
  const guidePose = "phone" as const;
  const trip = activeTrip(useDemoState());
  return (
    <section
      ref={ref}
      className={`cocoon-world scene-${scene} ${reduce ? "world-reduced" : ""}`}
      aria-label="Explore the Cocoon world"
      style={{ "--world-top": `${headerHeight}px` } as CSSProperties}
    >
      {["city", "riverside", "courtyard", "library"].map((name, i) => (
        <span
          key={name}
          id={`world-${name}`}
          className="world-location-marker"
          style={{ top: `calc(${(i / 3) * 100}% - ${(i / 3) * 100}svh)` }}
        />
      ))}
      <div
        ref={stage}
        className="world-stage"
        data-object-active={objectEngaged}
        data-motion-reduced={!!reduce}
        onPointerMove={(event) => {
          if (!active || objectEngaged) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          gazeTarget.set(((event.clientX - bounds.left) / bounds.width - 0.65) * 14);
        }}
        onPointerLeave={() => gazeTarget.set(0)}
        onPointerDown={(e) => {
          if (e.pointerType === "touch" && !(e.target as Element).closest("a,button,input"))
            gesture.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start) return;
          const dx = e.clientX - start.x,
            dy = e.clientY - start.y;
          if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4)
            move(scene + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
      >
        <motion.div className="world-sky" style={{ backgroundColor: reduce ? place.color : sky }} />
        <svg
          className="world-panorama"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          aria-label="Illustrated Cocoon world with a link to your AI companion"
        >
          <defs>
            <radialGradient id="world-lantern-halo">
              <stop stopColor="#ffd799" stopOpacity=".3" />
              <stop offset="1" stopColor="#ffd799" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="world-water" x2="0" y2="1">
              <stop stopColor="#ae6664" />
              <stop offset="1" stopColor="#363c48" />
            </linearGradient>
            <linearGradient id="world-glow">
              <stop stopColor="#ffe0a1" />
              <stop offset="1" stopColor="#e79557" />
            </linearGradient>
            <pattern id="world-windows" width="50" height="50" patternUnits="userSpaceOnUse">
              <rect width="50" height="50" fill="none" />
              <rect x="18" y="12" width="8" height="16" fill="#f4c985" opacity=".7" />
            </pattern>
          </defs>
          <motion.g style={reduce ? {} : { x: sunX, y: sunY }}>
            <motion.circle
              cx="1230"
              cy="230"
              r={reduce ? (scene === 3 ? 95 : 170) : sunSize}
              fill={reduce ? (scene === 3 ? "#e8e0ce" : "#f4c177") : sunTint}
            />
            <circle cx="1230" cy="230" r="205" fill="none" stroke="#f4c177" opacity=".15" />
          </motion.g>
          <motion.g style={{ opacity: reduce ? (scene === 3 ? 0.9 : 0) : stars }} fill="#f7ebd6">
            {[
              [150, 170],
              [420, 110],
              [620, 240],
              [860, 130],
              [1090, 160],
              [1430, 230],
              [1280, 75],
              [750, 80],
            ].map(([sx, sy], i) => (
              <motion.path
                key={i}
                d={`M${sx} ${sy! - 5}v10m-5-5h10`}
                stroke="#f7ebd6"
                strokeWidth="1"
                animate={active && scene === 3 ? { opacity: [0.25, 1, 0.25] } : { opacity: 0.7 }}
                transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </motion.g>
          <motion.g style={{ x: reduce ? -scene * 150 : farX }} fill="#693f4c" opacity=".48">
            <path d="M-200 600L60 370 300 560 500 310 820 590 1100 350 1410 550 1750 280 2050 580 2450 400 2800 600V1000H-200Z" />
          </motion.g>
          <motion.g
            animate={active ? { x: [0, 30, 0] } : { x: 0 }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            fill="#f7ebd6"
            opacity=".22"
          >
            <path d="M100 180q40-40 90 0q70-30 120 10H100M600 120q60-40 100 0q70-20 100 12H600M1350 160q45-30 85 0q60-30 120 12H1350" />
          </motion.g>
          <motion.g style={{ x: reduce ? camera[scene]! : x }}>
            <path
              d="M-100 710Q600 570 1400 650T2600 640T3800 640T5100 690V1000H-100Z"
              fill="#483a40"
            />
            <path
              d="M-100 820Q400 670 1150 745T2400 760T3500 740T5100 790V1000H-100Z"
              fill="#302b35"
            />
            <g fill="none" stroke="#2c2936" strokeWidth="2" opacity=".5">
              <path d="M-100 304Q350 390 760 307T1430 365M-100 321Q350 408 760 324T1430 382" />
            </g>
            {/* City: overlapping ink planes, warm practical lights and a wind-swept street. */}
            <path
              d="M610 590V390L705 307 805 375V590M1015 620V400L1100 332 1200 396V620"
              fill="#85404b"
            />
            <path
              d="M597 392L705 292 823 374M1001 401L1100 317 1213 395"
              fill="none"
              stroke="#9f5155"
              strokeWidth="8"
            />
            <path
              d="M610 392L798 378M1023 412L1195 404"
              stroke="#e4a577"
              strokeWidth="2"
              opacity=".4"
            />
            <g fill="#743441">
              <path d="M-100 690V390H150V690H210V320H390V690H470V440H650V690H790V370H990V690H1080V430H1270V690Z" />
              <path
                d="M-100 690V390H150V690H210V320H390V690H470V440H650V690H790V370H990V690H1080V430H1270V690Z"
                fill="url(#world-windows)"
              />
            </g>
            <path
              d="M-100 770Q400 610 850 730T1700 720"
              fill="none"
              stroke="#dc9c7e"
              strokeWidth="64"
            />
            <path
              d="M-100 770Q400 610 850 730T1700 720"
              fill="none"
              stroke="#f5d7a0"
              strokeWidth="2"
              strokeDasharray="20 25"
            />
            <g transform="translate(760 430) scale(.32)" fill="#573443" opacity=".4">
              <circle cx="0" cy="30" r="28" />
              <path d="M-38 78Q0 52 38 78L48 230H-48Z" />
              <path d="M-21 225L-32 390M21 225L33 390" stroke="#573443" strokeWidth="26" />
            </g>
            <motion.g
              animate={active ? { x: [0, 260, 0] } : { x: 0 }}
              transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
            >
              <rect x="1130" y="590" width="190" height="56" rx="12" fill="#e8c9a4" />
              <rect x="1140" y="599" width="170" height="25" rx="5" fill="#5c3844" />
              {[1150, 1190, 1230, 1270].map((n) => (
                <rect key={n} x={n} y="604" width="25" height="14" fill="#f4cd8a" />
              ))}
              <circle cx="1160" cy="649" r="9" fill="#252631" />
              <circle cx="1290" cy="649" r="9" fill="#252631" />
            </motion.g>
            <g stroke="#ebbd8d" strokeWidth="3" fill="none">
              <path d="M350 750V510q0-35 35-35h25M1330 720V485q0-35-35-35h-25" />
            </g>
            <g fill="#f5cc85">
              <circle cx="1270" cy="450" r="150" fill="url(#world-lantern-halo)" />
              <path d="M1260 460L1135 705H1450L1280 460Z" opacity=".05" />
              <circle cx="410" cy="475" r="13" />
              <circle cx="1270" cy="450" r="13" />
            </g>
            {[0, 1, 2].map((i) => (
              <motion.path
                key={`leaf-${i}`}
                d="M0 0Q18-14 29-4Q14 7 0 0Z"
                fill={i % 2 ? "#edbb85" : "#b0524d"}
                opacity=".6"
                animate={
                  active
                    ? {
                        x: [1320, 730, 170],
                        y: [540 + i * 40, 470 + i * 35, 570 + i * 40],
                        rotate: [0, 95, 210],
                        opacity: [0, 0.7, 0],
                      }
                    : { opacity: 0 }
                }
                transition={{
                  duration: 12 + i * 3,
                  repeat: Infinity,
                  delay: i * 4,
                  ease: "linear",
                }}
              />
            ))}
            {/* A continuous river and bridge connect the city to the courtyard. */}
            <path d="M1350 950Q1680 590 2100 650T2950 970Z" fill="url(#world-water)" />
            {[0, 1, 2, 3].map((i) => (
              <motion.path
                key={i}
                d={`M${1650 + i * 70} ${780 + i * 42}q150-35 330 0`}
                stroke="#f2c69b"
                strokeWidth="2"
                fill="none"
                opacity=".4"
                animate={active && scene === 1 ? { x: [-15, 20, -15] } : { x: 0 }}
                transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
            <path d="M1500 700Q1950 410 2440 690" fill="none" stroke="#704650" strokeWidth="85" />
            <path d="M1500 660Q1950 370 2440 650" fill="none" stroke="#e7c39a" strokeWidth="20" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path
                key={i}
                d={`M${1590 + i * 140} ${610 - Math.sin((i / 5) * Math.PI) * 110}v100`}
                stroke="#e7c39a"
                strokeWidth="9"
              />
            ))}
            <path
              d="M1510 650Q1950 350 2410 640"
              fill="none"
              stroke="#f5daa5"
              strokeWidth="3"
              strokeDasharray="8 14"
            />
            <g transform="translate(1750 350)">
              <path d="M0 280V0" stroke="#58383f" strokeWidth="13" />
              <path d="M-48 20h148l25 45-25 45H-48Z" fill="#edcb94" />
              <path d="M-80 130H60v75H-80l-30-37Z" fill="#a41c32" />
            </g>
            {/* Courtyard: open door, lit windows, hanging lights and space to sit. */}
            <g transform="translate(2440 90)">
              <path d="M0 580V250L360 50 760 230V580" fill="#67534d" />
              <path d="M40 580V250L365 95 720 250V580" fill="#c57d63" />
              <path d="M-35 260L360 28 800 250" fill="none" stroke="#382f37" strokeWidth="28" />
              <rect x="90" y="290" width="160" height="160" fill="#f2cc8f" />
              <path d="M170 290V450M90 370H250" stroke="#674047" strokeWidth="10" />
              <rect x="500" y="290" width="160" height="160" fill="#f2cc8f" />
              <path d="M580 290V450M500 370H660" stroke="#674047" strokeWidth="10" />
              <path d="M310 580V360a70 70 0 0 1 140 0v220" fill="#eacb9b" />
              <path d="M315 580V362l105-35v253" fill="#473941" />
              <circle cx="403" cy="447" r="5" fill="#eacb9b" />
              <path d="M-60 130Q360 350 820 130" fill="none" stroke="#514248" strokeWidth="2" />
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <motion.circle
                  key={i}
                  cx={-30 + i * 132}
                  cy={150 + Math.sin((i / 6) * Math.PI) * 110}
                  r="8"
                  fill="#f5d595"
                  animate={active && scene === 2 ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.8 }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.4 }}
                />
              ))}
            </g>
            <path
              d="M2720 725h350v20h-350m25 0v75m280-75v75"
              fill="#d6b28a"
              stroke="#493640"
              strokeWidth="10"
            />
            {/* Night library: a warm interior across the next archway. */}
            <g transform="translate(3570 90)">
              <path d="M0 650V180Q380-50 780 180V650" fill="#4d4655" />
              <path d="M60 650V210Q380 20 720 210V650" fill="#c48061" />
              <path d="M130 650V270Q380 100 650 270V650" fill="#f0c88d" />
              <path
                d="M130 650V270Q380 100 650 270V650"
                fill="none"
                stroke="#8b5c54"
                strokeWidth="18"
              />
              <rect x="160" y="330" width="150" height="250" fill="#7d4e4c" />
              <rect x="490" y="330" width="130" height="250" fill="#7d4e4c" />
              {[0, 1, 2].map((row) => (
                <g key={row}>
                  <path
                    d={`M160 ${410 + row * 80}h150M490 ${410 + row * 80}h130`}
                    stroke="#d5aa7d"
                    strokeWidth="8"
                  />
                  {[0, 1, 2, 3, 4].map((book) => (
                    <g key={book}>
                      <rect
                        x={173 + book * 25}
                        y={350 + row * 80}
                        width="15"
                        height={45 + (book % 3) * 7}
                        fill={book % 2 ? "#e5bc83" : "#a96355"}
                      />
                      <rect
                        x={505 + book * 21}
                        y={352 + row * 80}
                        width="12"
                        height={44 + (book % 3) * 6}
                        fill={book % 2 ? "#ab7865" : "#e5bc83"}
                      />
                    </g>
                  ))}
                </g>
              ))}
              <path d="M370 215h80l-15 70h-50Z" fill="#fff0bd" />
              <path d="M410 130v85" stroke="#63474a" strokeWidth="3" />
              <path d="M-50 650H850" stroke="#d2a383" strokeWidth="34" />
            </g>
            <path d="M3850 780h360" stroke="#473740" strokeWidth="25" />
            {/* Plant silhouettes stitch the four places into a single landscape. */}
            {[1250, 1460, 2370, 3310, 3490, 4500].map((n, i) => (
              <g key={n} transform={`translate(${n} ${i % 2 ? 590 : 560})`}>
                <path
                  d="M0 180V0M0 80l-35-35M0 105l45-45"
                  stroke="#30383b"
                  strokeWidth="13"
                  fill="none"
                />
                <path
                  d="M0-80L-90 90H90ZM0-20l-115 180H115Z"
                  fill={i % 2 ? "#3b4643" : "#4b4c46"}
                />
              </g>
            ))}
          </motion.g>
          <motion.g
            initial={false}
            animate={{ opacity: objectEngaged ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.35 }}
          >
            {scene < 2 ? (
              <motion.path
                d={
                  scene === 0
                    ? "M240 730Q500 620 790 700T1350 450"
                    : "M1320 660Q1100 510 800 650T280 570"
                }
                fill="none"
                stroke="#f8d692"
                strokeWidth="5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: objectEngaged ? 1 : 0 }}
                transition={{ duration: reduce ? 0 : 1.1 }}
              />
            ) : (
              <ellipse
                cx={scene === 2 ? 1260 : 300}
                cy="600"
                rx="310"
                ry="260"
                fill="url(#world-lantern-halo)"
              />
            )}
          </motion.g>
          <motion.g className="world-orbit" style={reduce ? {} : { rotate: orbit }}>
            <ellipse
              cx="800"
              cy="535"
              rx="570"
              ry="390"
              fill="none"
              stroke="#f4d9aa"
              strokeWidth="2"
              opacity=".28"
            />
            <ellipse
              cx="800"
              cy="535"
              rx="515"
              ry="345"
              fill="none"
              stroke="#f4d9aa"
              strokeWidth="1"
              strokeDasharray="3 18"
              opacity=".35"
            />
            <path
              d="M230 535q50-90 95-45q-25 65-95 45M1370 535q-50 90-95 45q25-65 95-45"
              fill="#e2bf88"
              opacity=".45"
            />
          </motion.g>
          <motion.g style={{ x: reduce ? -scene * 1216 : frontX }} fill="#252a31">
            <path d="M-500 950Q-100 660 300 900Q800 820 1100 930T1900 890T2800 930T3700 890T4700 930V1100H-500Z" />
            {[50, 1380, 2500, 3660, 4700].map((n) => (
              <path
                key={n}
                d={`M${n} 930q-100-160-80-300q60 50 80 170q10-170 95-235q-15 170-95 250q130-60 170-25q-65 85-170 140Z`}
              />
            ))}
          </motion.g>
          {scene === 2 && (
            <WorldNightLight progress={travel} pointer={gaze} reduced={!!reduce} layer="people" />
          )}
          <motion.g
            className="world-guide"
            data-world-guide=""
            data-guide-pose={guidePose}
            style={
              reduce
                ? {}
                : { x: guideX, y: guideY, rotate: guideTurn, transformOrigin: "800px 870px" }
            }
            transition={{ duration: reduce ? 0 : 1.2, ease: "easeInOut" }}
          >
            <g transform="translate(330 120) scale(1.08)">
              <GirlFigure
                active={active}
                gaze={gaze}
                pose={guidePose}
                lookBack={reduce ? 0 : lookAround}
                walking={scene === 2 && active}
                phoneHref="/presence"
                onPhoneClick={(event) =>
                  enterWorld(event, { to: "/presence", label: "The listening nook", x: 60, y: 65 })
                }
              />
            </g>
          </motion.g>
          <WorldNightLight progress={travel} pointer={gaze} reduced={!!reduce} layer="light" />
        </svg>
        <div className="world-contrast" />
        <div className="world-topline">
          <span>COCOON WORLD / LOCAL DEMO</span>
          <Link to={trip ? "/trip" : "/explore"}>
            {trip ? "CONTINUE YOUR JOURNEY" : "SKIP TO ROUTE PLANNER"}
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="world-copy">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={scene}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: reduce ? 0 : 0.28 }}
            >
              <span className="world-place">
                0{scene + 1} / {place.name}
              </span>
              <h1>
                {place.title[0]}
                <br />
                <em>
                  <WaveText text={place.title[1] ?? ""} step={0.06} />
                </em>
              </h1>
              <p>{place.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <WorldDestinations
          scene={scene}
          reduced={!!reduce}
          onEngage={(engaged) => {
            setObjectEngaged(engaged);
            gazeTarget.set(engaged ? (scene === 1 || scene === 2 ? 5 : -5) : 0);
          }}
        />
        <div className="world-bottom">
          <div className="world-scroll-hint">
            <ArrowDown size={16} />
            <span>
              {scene === 2 ? "SCROLL TO WIDEN THE LIGHT" : "SCROLL TO WANDER"}
              <br />
              <small>or swipe sideways / choose a place</small>
            </span>
          </div>
          <nav aria-label="Places in the Cocoon world">
            {places.map((p, i) => (
              <button
                key={p.name}
                onClick={() => move(i)}
                aria-current={scene === i ? "step" : undefined}
                aria-label={`Visit ${p.name}`}
              >
                <span>0{i + 1}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
