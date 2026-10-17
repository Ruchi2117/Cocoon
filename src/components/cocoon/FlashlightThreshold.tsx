import { useEffect, useId, useRef, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { Pause, Play } from "lucide-react";

export function FlashlightThreshold({ opened }: { opened: boolean }) {
  const mobile = useIsMobile();
  const id = useId().replaceAll(":", ""),
    ref = useRef<HTMLDivElement>(null),
    svg = useRef<SVGSVGElement>(null),
    pointer = useRef(false);
  const reducedPreference = useReducedMotion();
  const hydrated = useHydrated();
  const reduced = hydrated && reducedPreference,
    visible = useInView(ref),
    [still, setStill] = useState(false);
  const x = useMotionValue(430),
    y = useMotionValue(430),
    radiusTarget = useMotionValue(290);
  const lightX = useSpring(x, { stiffness: 65, damping: 25 }),
    lightY = useSpring(y, { stiffness: 65, damping: 25 }),
    radius = useSpring(radiusTarget, { stiffness: 28, damping: 15 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const wide = useTransform([radius, scrollYProgress], ([r, p]) => Number(r) + Number(p) * 130);
  const drift = useTransform(lightX, [0, 1600], [12, -12]);
  const active = visible && !reduced && !still;
  useEffect(() => {
    radiusTarget.set(opened ? 1800 : 290);
  }, [opened, radiusTarget]);
  useEffect(() => {
    pointer.current = false;
    x.set(430);
    y.set(430);
  }, [mobile, x, y]);
  useMotionValueEvent(scrollYProgress, "change", () => {
    pointer.current = false;
  });
  useEffect(() => {
    const follow = (event: PointerEvent) => {
      if (!active || opened || event.pointerType === "touch") return;
      const matrix = svg.current?.getScreenCTM();
      if (!matrix) return;
      pointer.current = true;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      x.set(point.x);
      y.set(point.y);
    };
    const release = () => {
      pointer.current = false;
    };
    window.addEventListener("pointermove", follow);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointermove", follow);
      window.removeEventListener("blur", release);
    };
  }, [active, opened, x, y]);
  useAnimationFrame((t) => {
    if (!active || pointer.current || opened) return;
    x.set(440 + Math.sin(t / 3200) * 260);
    y.set(430 + Math.sin(t / 4600) * 155);
  });
  return (
    <>
      <div className="threshold-scene" ref={ref} data-still={!!reduced || still}>
        <svg
          ref={svg}
          viewBox={mobile ? "0 0 850 1000" : "0 0 1600 1000"}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          onPointerMove={(e) => {
            if (!active || opened || e.pointerType === "touch") return;
            const matrix = svg.current?.getScreenCTM();
            if (!matrix) return;
            pointer.current = true;
            const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
            x.set(point.x);
            y.set(point.y);
          }}
          onPointerLeave={() => {
            pointer.current = false;
          }}
        >
          <defs>
            <linearGradient id={`${id}-sky`} x2="0" y2="1">
              <stop stopColor="#101f32" />
              <stop offset=".6" stopColor="#314b53" />
              <stop offset="1" stopColor="#9b7565" />
            </linearGradient>
            <radialGradient id={`${id}-moon`}>
              <stop stopColor="#f3d39b" stopOpacity=".45" />
              <stop offset="1" stopColor="#f3d39b" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}-door`} x2="1" y2="1">
              <stop stopColor="#f8dfaa" />
              <stop offset="1" stopColor="#b88266" />
            </linearGradient>
            <radialGradient id={`${id}-beam`}>
              <stop stopColor="black" />
              <stop offset=".58" stopColor="black" />
              <stop offset="1" stopColor="black" stopOpacity="0" />
            </radialGradient>
            <mask
              id={`${id}-night`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="1600"
              height="1000"
            >
              <rect width="1600" height="1000" fill="white" />
              <motion.circle cx={lightX} cy={lightY} r={wide} fill={`url(#${id}-beam)`} />
            </mask>
            <pattern id={`${id}-grain`} width="6" height="7" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r=".65" fill="#f2dfb4" opacity=".1" />
            </pattern>
          </defs>
          <rect width="1600" height="1000" fill={`url(#${id}-sky)`} />
          <circle cx="535" cy="250" r="225" fill={`url(#${id}-moon)`} />
          <circle cx="535" cy="250" r="66" fill="#e9d2a2" />
          <circle cx="560" cy="226" r="64" fill="#23394a" />
          <g fill="#cbd5c5" opacity=".7">
            {[
              [80, 150],
              [245, 95],
              [690, 110],
              [850, 260],
              [1140, 150],
              [1430, 210],
              [360, 360],
            ].map(([a, b]) => (
              <circle key={a} cx={a} cy={b} r="2" />
            ))}
          </g>
          <motion.g style={reduced || still ? {} : { x: drift }}>
            <path
              d="M-50 720V380L100 320 260 410V250L440 170 620 310V420L820 330 1040 450V230L1210 180 1430 310V500L1650 410V1100H-50Z"
              fill="#3f5357"
            />
            <path
              d="M-30 780V560L180 455 380 560V360L560 290 730 400V560L910 480 1100 560V390L1320 300 1600 440V1100H-30Z"
              fill="#7e7770"
            />
            {[70, 220, 410, 570, 765, 920, 1160, 1320, 1470].map((a, i) => (
              <g key={a}>
                <rect
                  x={a}
                  y={490 + (i % 3) * 60}
                  width="26"
                  height="58"
                  rx="13"
                  fill={i % 2 ? "#d2a57c" : "#738779"}
                />
                <path d={`M${a + 13} ${490 + (i % 3) * 60}v58`} stroke="#4c5a58" strokeWidth="3" />
              </g>
            ))}
            <path d="M-50 820Q350 680 700 810T1650 700V1100H-50Z" fill="#536f65" />
            <path
              d="M-80 950Q220 690 620 825T1300 810"
              fill="none"
              stroke="#d6b491"
              strokeWidth="100"
            />
            <path
              d="M-80 950Q220 690 620 825T1300 810"
              fill="none"
              stroke="#f2d7a8"
              strokeWidth="2"
              strokeDasharray="3 16"
            />
          </motion.g>
          <g transform="translate(210 250)">
            <path d="M0 560V220Q0 0 205 0T410 220V560" fill="#a66e61" />
            <path d="M34 560V220Q34 43 205 43T376 220V560" fill={`url(#${id}-door)`} />
            <motion.path
              d="M40 560V220Q40 55 205 48L322 125V560Z"
              fill="#543d4c"
              animate={{
                d: opened
                  ? "M40 560V220Q40 55 205 48L70 105V560Z"
                  : "M40 560V220Q40 55 205 48L322 125V560Z",
              }}
              transition={{ duration: reduced || still ? 0 : 1.5, ease: [0.2, 1, 0.3, 1] }}
            />
            <path
              d="M205 130v35m-24 0h48l-6 63h-36Z"
              fill="#ffdda0"
              stroke="#9a6c56"
              strokeWidth="3"
            />
            <circle cx="205" cy="200" r="100" fill={`url(#${id}-moon)`} />
            <path d="M-45 570H455M-65 590H475" stroke="#caad8b" strokeWidth="12" />
          </g>
          {/* Distinct neighbours are revealed in the light, rather than a repeating foreground character. */}
          <g transform="translate(100 620)">
            <path d="M-24 155L-20 55Q10 32 35 55L40 155Z" fill="#c39377" />
            <ellipse cx="8" cy="18" rx="24" ry="31" fill="#b27a60" />
            <path d="M-16 15Q-25-25 8-22Q44-20 31 23L21-3Q0 12-16 5" fill="#d8cdb8" />
            <path
              d="M-12 73l-31 37M31 71l25 37"
              stroke="#b27a60"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path d="M-10 155v31m38-31v31" stroke="#303d46" strokeWidth="14" />
          </g>
          <g transform="translate(665 585)">
            <circle cx="0" cy="150" r="45" fill="#374856" stroke="#d0b68e" strokeWidth="5" />
            <path
              d="M0 106v88m-44-44h88m-30-30-60 60m0-60 60 60"
              stroke="#baa285"
              strokeWidth="2"
            />
            <path d="M-27 57Q0 37 26 57V117H-24Z" fill="#8eaa96" />
            <path d="M-25 118H47l28 49" fill="none" stroke="#293a45" strokeWidth="20" />
            <ellipse cy="18" rx="23" ry="30" fill="#cb9272" />
            <path d="M-25 22Q-38-22 2-18Q35-17 27 25L14-3Q-7 13-25 6" fill="#2e303e" />
            <path
              d="M20 68l27 23 20-11"
              fill="none"
              stroke="#cb9272"
              strokeWidth="11"
              strokeLinecap="round"
            />
          </g>
          <g fill="#182f39">
            <path d="M-40 1000V280Q90 270 120 350L42 390Q230 370 270 465L80 460Q250 540 230 620L30 540V1000Z" />
            <path d="M1600 1000V100Q1430 160 1420 290L1550 245Q1330 330 1360 440L1550 350Q1380 520 1440 600L1580 470V1000Z" />
          </g>
          {/* Small constellations connect the places in Cocoon's world. */}
          <path
            d="M180 180Q760 20 1360 230T1260 800"
            fill="none"
            stroke="#d9c99b"
            strokeOpacity=".3"
            strokeDasharray="3 14"
          />
          {[
            { x: 180, y: 180, shape: "M-18 0L0-23 18 0 0 23ZM0-23V23M-18 0H18" },
            {
              x: 890,
              y: 120,
              shape: "M-24-16Q-12-22 0-12Q12-22 24-16V21Q12 15 0 25Q-12 15-24 21ZM0-12V25",
            },
            {
              x: 1380,
              y: 300,
              shape: "M-22 5Q-35-19-17-23Q-5-27 0-13Q5-27 17-23Q35-19 22 5L0 27Z",
            },
            {
              x: 1250,
              y: 790,
              shape: "M-21 18Q-21-5 0-5T21 18M-10-19A10 10 0 1 0 10-19A10 10 0 1 0-10-19",
            },
          ].map((symbol, index) => (
            <motion.g
              key={symbol.x}
              initial={false}
              animate={
                active
                  ? { y: [0, -12, 0], rotate: [0, index % 2 ? 5 : -5, 0] }
                  : { y: 0, rotate: 0 }
              }
              transition={{
                duration: active ? 6 + index : 0,
                repeat: active ? Infinity : 0,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: `${symbol.x}px ${symbol.y}px` }}
            >
              <g transform={`translate(${symbol.x} ${symbol.y})`}>
                <circle r="49" fill="#263e48" stroke="#ddbd87" strokeOpacity=".5" />
                <path
                  d={symbol.shape}
                  fill="none"
                  stroke="#edcd96"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </motion.g>
          ))}
          <motion.path
            d="M-30 910Q60 700 20 560M40 755q100-90 150-40M1570 950q-90-230-35-360m-10 180q-110-60-160-10"
            fill="none"
            stroke="#90a388"
            strokeWidth="8"
            animate={active ? { x: [0, 7, 0] } : { x: 0 }}
            transition={{
              duration: active ? 8 : 0,
              repeat: active ? Infinity : 0,
              ease: "easeInOut",
            }}
          />
          <motion.rect
            width="1600"
            height="1000"
            fill="#080f1d"
            mask={`url(#${id}-night)`}
            animate={{ opacity: reduced || still ? 0 : 0.93 }}
            transition={{ duration: reduced ? 0 : 0.6 }}
          />
          <motion.circle
            cx={lightX}
            cy={lightY}
            r={wide}
            fill="none"
            stroke="#e8d2aa"
            strokeWidth="1"
            opacity={reduced || still || opened ? 0 : 0.15}
          />
          <rect width="1600" height="1000" fill={`url(#${id}-grain)`} />
        </svg>
      </div>
      <div className="threshold-caption">
        <span>01 / A light becomes a way in.</span>
        <p>
          {opened
            ? "There’s room for you here."
            : mobile
              ? "Follow a little light."
              : "Move your light. Find your people."}
        </p>
        <small>Move the pointer or scroll · the light also explores on its own</small>
        <button
          aria-label={still ? "Restore the moving light" : "Hold the light still"}
          aria-pressed={still || !!reduced}
          disabled={!!reduced}
          onClick={() => setStill(!still)}
        >
          {still ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>
    </>
  );
}
