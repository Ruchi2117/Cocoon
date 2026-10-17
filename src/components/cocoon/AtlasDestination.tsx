import { motion, useReducedMotion } from "motion/react";

const moods: Record<string, { title: string; detail: string; color: string }> = {
  Home: {
    title: "THE CITY IS STILL AWAKE",
    detail: "A starting point. A world of possibilities.",
    color: "#a8cdc4",
  },
  Routes: {
    title: "FOLLOW YOUR OWN THREAD",
    detail: "The river bends. Your next turn comes into view.",
    color: "#9ed8d4",
  },
  Journey: {
    title: "A LIGHT LEFT ON FOR YOU",
    detail: "Small check-ins. People who know your plan.",
    color: "#e9c39a",
  },
  Call: {
    title: "THERE IS ROOM TO EXHALE",
    detail: "A little company, at your pace.",
    color: "#c6b6ee",
  },
  Kit: {
    title: "LITTLE THINGS, READY TO GO",
    detail: "Pack a plan, a power bank, a familiar number.",
    color: "#e5c399",
  },
  Reports: {
    title: "BRING THE DETAILS INTO FOCUS",
    detail: "Observations with context. Headlines with sources.",
    color: "#e3acb3",
  },
  Learn: {
    title: "KNOWLEDGE IS SOMETHING YOU CARRY",
    detail: "Open a chapter. Find the words you need.",
    color: "#bbc9ed",
  },
  Circle: {
    title: "MANY LIVES. SHARED LIGHT.",
    detail: "A place to listen, connect and be heard.",
    color: "#c1d6b2",
  },
};

/** Each destination has its own visual language, rather than reusing a scene label. */
export function AtlasDestination({ place, still }: { place: string; still: boolean }) {
  const reduced = useReducedMotion();
  const quiet = still || !!reduced;
  const mood = moods[place] ?? moods["Home"]!;
  return (
    <div className="atlas-destination" style={{ color: mood.color }}>
      <svg viewBox="0 0 800 600" aria-hidden="true" className="atlas-destination-drawing">
        {place === "Routes" ? (
          <>
            <motion.path
              d="M20 550C140 530 30 400 220 440S430 270 520 320 620 170 780 160"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray="8 12"
              initial={{ pathLength: quiet ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5 }}
            />
            {[
              [220, 440],
              [520, 320],
              [740, 170],
            ].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <circle r="17" fill="#173345" stroke="currentColor" strokeWidth="2" />
                <circle r="5" fill="currentColor" />
              </g>
            ))}
            <path
              d="M40 580q200-100 350-40t380-30"
              fill="none"
              stroke="currentColor"
              opacity=".3"
              strokeWidth="15"
            />
          </>
        ) : place === "Call" ? (
          <>
            {[0, 1, 2].map((i) => (
              <motion.ellipse
                key={i}
                cx="400"
                cy="300"
                rx={220 + i * 30}
                ry={170 + i * 25}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                animate={
                  quiet ? { opacity: 0.2 } : { scale: [1, 1.08, 1], opacity: [0.1, 0.4, 0.1] }
                }
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.6 }}
                style={{ transformOrigin: "400px 300px" }}
              />
            ))}
            {Array.from({ length: 19 }, (_, i) => (
              <motion.rect
                key={i}
                x={135 + i * 29}
                y="515"
                width="5"
                height={12 + (i % 5) * 7}
                rx="3"
                fill="currentColor"
                animate={quiet ? { scaleY: 1 } : { scaleY: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5 + (i % 3) * 0.2, repeat: Infinity, delay: i * 0.07 }}
                style={{ transformOrigin: `${135 + i * 29}px 535px` }}
              />
            ))}
          </>
        ) : place === "Journey" ? (
          <>
            <path
              d="M70 550Q200 410 390 510T740 470"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {[120, 360, 640].map((x, i) => (
              <motion.g
                key={x}
                initial={quiet ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.18 }}
              >
                <path d={`M${x} 460v-80l45-35 45 35v80Z`} fill="#263b4b" stroke="currentColor" />
                <rect x={x + 35} y="405" width="25" height="55" rx="12" fill="currentColor" />
                <path d={`M${x + 45} 345v-30`} stroke="currentColor" />
                <circle cx={x + 45} cy="306" r="6" fill="currentColor" />
              </motion.g>
            ))}
          </>
        ) : place === "Kit" ? (
          <g transform="translate(75 390)">
            <path d="M0 110h650" stroke="currentColor" strokeWidth="5" />
            <path
              d="M50 100V25q0-20 20-20h70q20 0 20 20v75Z"
              fill="#3b5360"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M80 5v-20h50V5m-63 50h76v35H67Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <rect
              x="220"
              y="28"
              width="60"
              height="72"
              rx="8"
              fill="#263d50"
              stroke="currentColor"
            />
            <path d="M235 62h30m-15-15v30" stroke="currentColor" strokeWidth="3" />
            <rect
              x="345"
              y="5"
              width="42"
              height="95"
              rx="8"
              fill="#263d50"
              stroke="currentColor"
            />
            <path
              d="M357 18h18m-9 25-8 20h15l-10 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M470 100V30h90v70m-70-70V5h50v25"
              fill="#40515c"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="515" cy="65" r="16" fill="none" stroke="currentColor" />
          </g>
        ) : place === "Reports" ? (
          <>
            {[0, 1, 2].map((i) => (
              <motion.g
                key={i}
                initial={quiet ? false : { rotate: -15, x: -100, opacity: 0 }}
                animate={{ rotate: (i - 1) * 8, x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: i * 0.12 }}
                style={{ transformOrigin: "400px 450px" }}
              >
                <rect
                  x={210 + i * 85}
                  y={355 - i * 30}
                  width="185"
                  height="180"
                  rx="5"
                  fill={i === 1 ? "#684956" : "#263d50"}
                  stroke="currentColor"
                />
                <path
                  d={`M${230 + i * 85} ${385 - i * 30}h115m-115 20h140m-140 25h65m-65 20h140m-140 20h130m-130 20h90`}
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </motion.g>
            ))}
          </>
        ) : place === "Learn" ? (
          <>
            <motion.g
              initial={quiet ? false : { scaleX: 0.2, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1 }}
              style={{ transformOrigin: "400px 500px" }}
            >
              <path
                d="M140 450q130-70 260 0 130-70 260 0v110q-130-70-260 0-130-70-260 0Z"
                fill="#33485c"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M400 450v110M170 470q95-45 200 0m-200 25q95-45 200 0m60-25q95-45 200 0m-200 25q95-45 200 0"
                fill="none"
                stroke="currentColor"
                opacity=".7"
              />
            </motion.g>
          </>
        ) : place === "Circle" ? (
          <>
            {[130, 280, 440, 600].map((x, i) => (
              <motion.g
                key={x}
                initial={quiet ? false : { y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.16, duration: 0.7 }}
              >
                <path
                  d={`M${x} 440q-20-55 25-55t25 55l-25 18Z`}
                  fill="#243d4c"
                  stroke="currentColor"
                />
                <circle cx={x + 25} cy="415" r="12" fill="currentColor" />
                <path d={`M${x + 25} 460v65`} stroke="currentColor" strokeWidth="2" />
              </motion.g>
            ))}
            <path d="M50 540Q400 440 750 540" fill="none" stroke="currentColor" opacity=".5" />
          </>
        ) : (
          <>
            {[70, 180, 570, 680].map((x, i) => (
              <g key={x}>
                <path
                  d={`M${x} 540V${300 + (i % 2) * 60}h70V540`}
                  fill="#294657"
                  stroke="currentColor"
                  strokeOpacity=".35"
                />
                {[0, 1, 2].map((j) => (
                  <path
                    key={j}
                    d={`M${x + 18} ${340 + (i % 2) * 60 + j * 35}h12m12 0h12`}
                    stroke="currentColor"
                    strokeWidth="8"
                    opacity=".6"
                  />
                ))}
              </g>
            ))}
          </>
        )}
      </svg>
      <div className="atlas-destination-note">
        <strong>{mood.title}</strong>
        <span>{mood.detail}</span>
      </div>
    </div>
  );
}
