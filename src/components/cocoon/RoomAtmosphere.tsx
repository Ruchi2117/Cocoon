import { useId } from "react";
import { useHydrated } from "@tanstack/react-router";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
export function RoomAtmosphere({ room }: { room: string }) {
  const hydrated = useHydrated();
  const reducedPreference = useReducedMotion();
  const reduced = hydrated && reducedPreference,
    id = useId().replaceAll(":", ""),
    library = room.includes("library"),
    river = room.includes("riverside");
  const { scrollY } = useScroll(),
    drift = useTransform(scrollY, [0, 2400], [0, -90]);
  const ink = library ? "#344756" : river ? "#315d59" : "#70545a";
  return (
    <div className="room-atmosphere" aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-sky`} x2="0" y2="1">
            <stop stopColor={ink} />
            <stop offset=".65" stopColor={library ? "#a39a9f" : river ? "#9ab6a0" : "#c49882"} />
            <stop offset="1" stopColor="#c9b490" />
          </linearGradient>
          <radialGradient id={`${id}-paper`}>
            <stop stopColor="#f3e8d0" stopOpacity=".97" />
            <stop offset=".72" stopColor="#e8d9bd" stopOpacity=".9" />
            <stop offset="1" stopColor="#e6d5b9" stopOpacity=".28" />
          </radialGradient>
          <pattern id={`${id}-ink`} width="8" height="9" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="2" r=".7" fill="#544654" opacity=".09" />
          </pattern>
          <radialGradient id={`${id}-glow`}>
            <stop stopColor="#f5d395" stopOpacity=".5" />
            <stop offset="1" stopColor="#f5d395" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1600" height="1000" fill={`url(#${id}-sky)`} />
        <circle cx="1390" cy="160" r="220" fill={`url(#${id}-glow)`} />
        <circle cx="1390" cy="160" r="65" fill="#ead5a5" opacity=".65" />
        <motion.g style={reduced ? {} : { y: drift }}>
          <path
            d="M-100 800Q200 560 480 790T1100 720T1700 670V1200H-100Z"
            fill="#657e73"
            opacity=".65"
          />
          <path d="M-100 940Q400 640 800 920T1700 780V1200H-100Z" fill="#425f5d" opacity=".5" />
          {library ? (
            <g fill="none" stroke="#e2c298" strokeWidth="5" opacity=".55">
              <path d="M-80 1150V300Q100 20 280 300V1150M1320 1150V300Q1500 20 1680 300V1150" />
              <path d="M-80 460H280M-80 660H280M1320 460H1680M1320 660H1680" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path
                  key={i}
                  d={`M${-25 + i * 43} 455V${340 + (i % 3) * 20}m0 280V${530 + (i % 2) * 25}M${1360 + i * 43} 455V${340 + (i % 3) * 20}m0 280V${530 + (i % 2) * 25}`}
                  strokeWidth="17"
                  opacity=".7"
                />
              ))}
            </g>
          ) : river ? (
            <g fill="none" stroke="#d5d2ac" opacity=".4">
              <path d="M-100 800Q350 500 780 820T1700 720" strokeWidth="55" />
              <path d="M-100 802Q350 502 780 822T1700 722" stroke="#537b78" strokeWidth="43" />
              <path d="M-40 1020Q200 600 450 1000M1170 1000q180-450 440-40" strokeWidth="4" />
              <path
                d="M-40 930Q200 510 450 910M1170 910q180-450 440-40"
                strokeWidth="2"
                strokeDasharray="3 13"
              />
            </g>
          ) : (
            <g fill="none" stroke="#e1b992" opacity=".5" strokeWidth="5">
              <path d="M-30 1000V260L150 170 330 280V1000M1270 1000V280L1450 170 1630 260V1000" />
              <path d="M65 400v140h100V400ZM1435 400v140h100V400Z" />
              <path d="M-20 175Q800 520 1620 175" strokeWidth="2" />
            </g>
          )}
        </motion.g>
        <motion.g
          animate={reduced ? {} : { rotate: [-1, 1, -1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "800px 1050px" }}
          fill="#263f45"
          opacity=".35"
        >
          <path d="M0 1100V570q80-100 150-80q-30 100-120 100q180 0 195 80q-100 65-190-25q150 110 120 180L25 730V1100ZM1600 1100V480q-80-100-150-80q30 100 120 100q-180 0-195 80q100 65 190-25q-150 110-120 180l130-95V1100Z" />
        </motion.g>
        <rect width="1600" height="1000" fill={`url(#${id}-paper)`} />
        <g fill="none" stroke={ink} opacity=".08">
          <path d="M-100 900Q700 600 1700 950M-100 940Q700 640 1700 990M-100 980Q700 680 1700 1030" />
          <circle cx="1390" cy="160" r="260" strokeDasharray="2 14" />
        </g>
        <rect width="1600" height="1000" fill={`url(#${id}-ink)`} />
      </svg>
    </div>
  );
}
