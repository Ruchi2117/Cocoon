import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { GirlFigure } from "./GirlFigure";

export function JourneyScene({ variant = "journey" }: { variant?: "journey" | "learn" }) {
  const learning = variant === "learn";
  const ref = useRef<HTMLElement>(null);
  const paused = false;
  const [night, setNight] = useState(false);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { margin: "100px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const figureY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const active = inView && !paused && !reduce;
  const loop = { repeat: Infinity, duration: 5, ease: "easeInOut" as const };
  return (
    <section
      ref={ref}
      className={`journey-poster ${night ? "poster-night" : ""}`}
      aria-labelledby="journey-heading"
    >
      <div className="poster-index">
        <span>{learning ? "THE SAFETY LIBRARY / KNOW YOUR GROUND" : "01 / A LITTLE COURAGE"}</span>
        <button
          className="scene-light-switch"
          onClick={() => setNight(!night)}
          aria-pressed={night}
          aria-label="Toggle illustration between sunset and night"
        >
          {night ? "◐ AFTER DARK" : "☀ GOLDEN HOUR"} ↗
        </button>
      </div>
      <motion.h1 id="journey-heading" style={active ? { y } : {}}>
        {learning ? "YOUR BODY." : "OUT THERE."}
        <br />
        <span>{learning ? "YOUR RULES." : "TOGETHER."}</span>
      </motion.h1>
      <svg
        className="poster-world"
        viewBox="0 0 1200 760"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="poster-sunset" x2="0" y2="1">
            <stop stopColor="#f9bd72" />
            <stop offset="1" stopColor="#ed6a48" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="930"
          cy="280"
          r="160"
          fill={night ? "#e8e0c6" : "url(#poster-sunset)"}
          style={active ? { y } : {}}
        />
        <g className="poster-stars" opacity={night ? 0.8 : 0} fill="#f7ebd6">
          {[
            [90, 160],
            [240, 260],
            [680, 110],
            [790, 200],
            [1090, 150],
            [1120, 340],
            [600, 260],
          ].map(([x, sy], i) => (
            <motion.path
              key={i}
              d={`M${x} ${sy! - 5}v10m-5-5h10`}
              stroke="currentColor"
              strokeWidth="1"
              animate={active && night ? { opacity: [0.3, 1, 0.3] } : { opacity: 1 }}
              transition={{ ...loop, delay: i * 0.5 }}
            />
          ))}
        </g>
        <g fill={night ? "#49404d" : "#9f383c"}>
          <path d="M0 480L110 390 210 490 310 350 410 490 520 400 650 490 770 380 900 470 1050 330 1200 450V760H0Z" />
        </g>
        <motion.g
          fill={night ? "#302e3c" : "#702d37"}
          animate={active ? { x: [0, -14, 0] } : { x: 0 }}
          transition={{ ...loop, duration: 12 }}
        >
          <path d="M0 515V430H55V390H95V515H130V450H185V340H240V515H285V440H330V380H390V515H430V420H480V515H740V450H780V365H820V515H860V410H920V515H965V390H1020V325H1065V515H1120V440H1200V760H0Z" />
          {[40, 150, 205, 308, 355, 450, 800, 888, 990, 1040, 1150].map((x, i) => (
            <g key={x} fill="#f4b576" opacity=".7">
              <rect x={x} y={465 - (i % 3) * 20} width="7" height="13" />
              <rect x={x} y={490 - (i % 3) * 20} width="7" height="13" />
            </g>
          ))}
        </motion.g>
        <motion.g
          animate={active ? { x: [-90, 90, -90] } : { x: 0 }}
          transition={{ ...loop, duration: 24 }}
        >
          <rect x="855" y="495" width="125" height="32" rx="10" fill="#e8c9a4" />
          <rect x="862" y="501" width="109" height="13" rx="4" fill="#64353c" />
          {[873, 897, 921, 945].map((x) => (
            <rect key={x} x={x} y="503" width="15" height="9" fill="#ffcd80" />
          ))}
          <circle cx="875" cy="528" r="5" fill="#242321" />
          <circle cx="960" cy="528" r="5" fill="#242321" />
        </motion.g>
        <path d="M0 630Q330 540 610 580T1200 510V760H0Z" fill="#30272a" />
        <path d="M1200 595Q940 500 875 600T1010 760H700Q710 620 790 578T1200 560" fill="#d47764" />
        <motion.path
          d="M1200 578Q905 507 835 601T865 760"
          fill="none"
          stroke="#f4dfb7"
          strokeWidth="3"
          strokeDasharray="12 15"
          animate={active ? { strokeDashoffset: [0, -108] } : { strokeDashoffset: 0 }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        />
        <GirlFigure active={active} offset={figureY} />
        <g stroke="#e8b29a" strokeWidth="2" fill="none">
          <path d="M92 530V387Q92 367 113 367H137" />
          <path d="M1081 540V414Q1081 394 1060 394H1038" />
        </g>
        <motion.g
          animate={active ? { opacity: [0.45, 0.9, 0.45] } : { opacity: 0.7 }}
          transition={{ ...loop, duration: 3 }}
        >
          <circle cx="137" cy="367" r="13" fill="#ffce7f" />
          <circle cx="1038" cy="394" r="13" fill="#ffce7f" />
        </motion.g>
      </svg>
      <div className="poster-side">INDEPENDENCE LOOKS GOOD ON YOU.</div>
      <div className="poster-actions">
        <p>
          {learning ? "A little knowledge." : "Go a little further."}
          <br />
          {learning ? "A stronger sense of what’s okay." : "Keep your people close."}
        </p>
        {learning ? (
          <a href="#guides">
            EXPLORE THE GUIDES <ArrowUpRight size={20} />
          </a>
        ) : (
          <Link to="/explore" search={{ to: "d-metro" }}>
            PLAN YOUR JOURNEY <ArrowUpRight size={20} />
          </Link>
        )}
      </div>
      <div className="poster-caption">
        <span>✳ YOUR SAFER ROUTE COMPANION</span>
        <span>EXPLORE / CONNECT / ARRIVE</span>
      </div>
    </section>
  );
}
