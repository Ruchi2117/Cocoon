import { useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
import { AtlasPlaces } from "./AtlasPlaces";

function Pine({
  x,
  y,
  size = 1,
  color = "#173744",
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path d="M-5 15V-145h10V15Z" fill="#253a43" />
      <path d="M0-210-42-123h24l-48 75h31l-53 76H88L35-48h31l-48-75h24Z" fill={color} />
      <path
        d="M0-200v200L-26-65M0-120l25 37M0-40l-47 40"
        fill="none"
        stroke="#8daba0"
        strokeOpacity=".12"
        strokeWidth="2"
      />
    </g>
  );
}

function Traveller({ quiet, kind }: { quiet: boolean; kind: number }) {
  return (
    <motion.g
      animate={quiet ? { y: 0 } : { y: [0, -2, 0] }}
      transition={{ duration: 4, repeat: Infinity }}
    >
      <ellipse cx="1115" cy="830" rx="60" ry="12" fill="#102635" opacity=".6" />
      <path d="M1098 748l-20 74 20 4 28-72m7-4 23 74 20-4-17-87" fill="#26384b" />
      <path d="m1073 824 26 2 5 9h-39m88-11 23-4 13 12h-35" fill="#d9bda4" />
      <path
        d="M1084 650q29-20 54 0l30 112q-47 17-91-1Z"
        fill={kind === 1 ? "#c2a36f" : kind === 2 ? "#b87f79" : "#b898a7"}
      />
      <path
        d="m1092 653 15 81-18 27m24-110 27 110"
        stroke="#e4c7a5"
        strokeOpacity=".4"
        fill="none"
        strokeWidth="3"
      />
      <path d="M1085 660q-30 22-23 69l22 12 8-68" fill="#516c69" />
      <path d="m1073 679-6 32 18 5" stroke="#99a395" fill="none" strokeWidth="3" />
      <path
        d="m1135 668 28 46 28-24"
        fill="none"
        stroke="#d0a187"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <rect
        x="1182"
        y="664"
        width="20"
        height="33"
        rx="4"
        fill="#c8d7cd"
        transform="rotate(15 1190 680)"
      />
      <rect x="1186" y="669" width="12" height="20" rx="2" fill="#658b9b" />
      <motion.g
        animate={quiet ? { rotate: 0 } : { rotate: [0, -8, -8, 0] }}
        transition={{ duration: 9, repeat: Infinity, times: [0, 0.3, 0.6, 1] }}
        style={{ transformOrigin: "1111px 649px" }}
      >
        <path d="M1081 646v-44q0-41 32-42 34 0 35 43v47Z" fill="#243345" />
        <path d="M1090 604q5-28 26-26 25 3 22 34l-6 27-17 13-19-12Z" fill="#d2a58e" />
        <path d="M1085 615q-7-49 27-50 34 0 35 41l-20-7-14-19q-4 25-28 35" fill="#243345" />
        <path
          d="m1111 615 4 1m16-1h4m-12 4-3 9 5 1m-14 7q8 5 15 0"
          stroke="#745453"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="1097" cy="629" r="4" stroke="#dfc795" fill="none" strokeWidth="2" />
      </motion.g>
    </motion.g>
  );
}

/** Full-bleed scenery; depth layers enter at different speeds, rather than moving an icon card. */
export function AtlasPanorama({
  scene,
  place,
  still,
  direction,
}: {
  scene: number;
  place: string;
  still: boolean;
  direction: number;
}) {
  const reduced = useReducedMotion();
  const quiet = still || !!reduced;
  const id = useId().replaceAll(":", "");
  const palette = SKIES[place] ?? SKIES["Home"]!;
  const shift =
    place === "Routes"
      ? -35
      : place === "Call"
        ? 35
        : place === "Kit"
          ? -25
          : place === "Reports"
            ? 25
            : 0;
  const drift = shift + [0, -65, 45][scene]!;
  return (
    <div className="atlas-panorama" aria-hidden="true">
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}sky`} x2="0" y2="1">
            <motion.stop
              initial={false}
              animate={{ stopColor: palette[0] }}
              transition={{ duration: quiet ? 0 : 1.4 }}
            />
            <motion.stop
              offset="1"
              initial={false}
              animate={{ stopColor: palette[1] }}
              transition={{ duration: quiet ? 0 : 1.4 }}
            />
          </linearGradient>
          <linearGradient id={`${id}water`} x2="0" y2="1">
            <stop stopColor="#638e94" />
            <stop offset="1" stopColor="#213d54" />
          </linearGradient>
          <linearGradient id={`${id}glass`} x2="1" y2="1">
            <stop stopColor="#e8cc98" stopOpacity=".85" />
            <stop offset="1" stopColor="#718894" stopOpacity=".35" />
          </linearGradient>
          <radialGradient id={`${id}light`}>
            <stop stopColor="#ffe2a3" stopOpacity=".5" />
            <stop offset="1" stopColor="#ffe2a3" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}shade`}>
            <stop stopColor="#102237" stopOpacity=".65" />
            <stop offset=".55" stopColor="#102237" stopOpacity=".15" />
            <stop offset="1" stopColor="#102237" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="1600" height="1000" fill={`url(#${id}sky)`} />
        <motion.g animate={{ x: drift * 0.2 }} transition={{ duration: quiet ? 0 : 1.5 }}>
          <circle cx="1280" cy="170" r="58" fill="#e1d2b3" opacity=".8" />
          <circle cx="1258" cy="150" r="57" fill={palette[0]} opacity=".65" />
          {Array.from({ length: 26 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 173 + 72) % 1600}
              cy={50 + ((i * 43) % 350)}
              r={i % 4 === 0 ? 2 : 1}
              fill="#ead7b8"
              opacity=".5"
            />
          ))}
          <path
            d="M0 480 140 300 240 375 460 210 680 430 810 340 1050 480 1240 280 1600 450V750H0Z"
            fill="#44556c"
            opacity=".65"
          />
          <path d="m320 325 140-115 110 110-103-45-57 29Z" fill="#9aa3af" opacity=".18" />
          <path d="M0 590q220-230 440-100t440-30 720 80v220H0Z" fill="#334a60" />
        </motion.g>
        <AnimatePresence initial={false}>
          <motion.g
            key={place}
            initial={quiet ? false : { x: shift + direction * 60, y: 140, opacity: 0 }}
            animate={{ x: shift, y: 0, opacity: 1 }}
            exit={{ x: shift - direction * 60, y: 90, opacity: 0 }}
            transition={
              quiet
                ? { duration: 0 }
                : { type: "spring", stiffness: 70, damping: 18, mass: 1, opacity: { duration: 0.6 } }
            }
          >
            {["Home", "Journey", "Call", "Kit", "Reports"].includes(place) ? (
              <AtlasPlaces place={place} quiet={quiet} />
            ) : scene === 0 ? (
              <>
                <path d="M0 630Q400 510 820 650t780-70v420H0Z" fill={`url(#${id}water)`} />
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <motion.path
                    key={i}
                    d={`M${660 + (i % 3) * 120} ${710 + i * 27}h${180 - i * 11}`}
                    stroke="#a4b8ac"
                    strokeWidth="2"
                    opacity=".25"
                    animate={quiet ? { x: 0 } : { x: [-15, 15, -15] }}
                    transition={{ duration: 5 + i, repeat: Infinity }}
                  />
                ))}
                <path
                  d="M-40 650 560 555l600 85 500-50v45l-500 65-600-100L-40 700Z"
                  fill="#7c8c8d"
                />
                <path
                  d="M100 675v115m205-150v100m205-130v100m225-60v100m210-65v100m230-80v90m220-110v110"
                  stroke="#425f70"
                  strokeWidth="28"
                />
                <path d="M570 557V416l230-104 228 104v180Z" fill="#344b5c" />
                <path d="m535 424 265-134 268 134-22 20-246-106-246 106Z" fill="#a1aeaa" />
                <path d="M600 440h400v110H600Z" fill={`url(#${id}glass)`} />
                {[620, 700, 780, 860, 940].map((x) => (
                  <path key={x} d={`M${x} 438v114`} stroke="#354b5b" strokeWidth="12" />
                ))}
                <path d="M585 564h435" stroke="#d7ba91" strokeWidth="5" />
                <g fill="#e7d2a6">
                  <rect x="731" y="385" width="143" height="26" rx="2" />
                  <text x="747" y="403" fill="#334557" fontSize="11" letterSpacing="3">
                    NIGHT LINE
                  </text>
                </g>
                <motion.g
                  animate={quiet ? { x: 0 } : { x: [-340, 80, 80, -340] }}
                  transition={{ duration: 24, repeat: Infinity, times: [0, 0.45, 0.7, 1] }}
                >
                  <path d="M1000 614v-65q0-25 25-25h240q35 0 35 25v65Z" fill="#b4c3b6" />
                  <path d="M1025 540h240v40h-240Z" fill="#304b5b" />
                  {[1060, 1110, 1160, 1210].map((x) => (
                    <path key={x} d={`M${x} 540v40`} stroke="#b4c3b6" strokeWidth="8" />
                  ))}
                  <path d="M1000 594h300" stroke="#af8178" strokeWidth="8" />
                  <circle cx="1050" cy="614" r="10" fill="#253a49" />
                  <circle cx="1250" cy="614" r="10" fill="#253a49" />
                </motion.g>
              </>
            ) : scene === 1 ? (
              <>
                <path d="M0 710Q600 580 1600 660V1000H0Z" fill="#394c59" />
                <path d="M580 710V340L930 190l350 150v370Z" fill="#3d4c61" />
                <path d="m545 345 385-180 390 180-25 20-365-151-365 151Z" fill="#a8aaa8" />
                <path d="M620 365 930 230l310 135v315H620Z" fill={`url(#${id}glass)`} />
                {[650, 730, 810, 890, 970, 1050, 1130, 1210].map((x, i) => (
                  <g key={x}>
                    <path d={`M${x} 350v330`} stroke="#415464" strokeWidth="9" />
                    {[0, 1, 2, 3].map((j) => (
                      <g key={j}>
                        <path d={`M${x + 8} ${420 + j * 55}h58`} stroke="#495160" strokeWidth="5" />
                        {[0, 1, 2, 3].map((k) => (
                          <rect
                            key={k}
                            x={x + 12 + k * 12}
                            y={390 + j * 55}
                            width="8"
                            height="28"
                            fill={["#d1b094", "#8fa8a1", "#a09eb8"][(i + k) % 3]}
                          />
                        ))}
                      </g>
                    ))}
                  </g>
                ))}
                <path d="M890 680V510q40-70 80 0v170Z" fill="#253d50" />
                <path d="M929 470v210" stroke="#c2b594" strokeWidth="4" />
                <path d="M590 700h690l40 25H550Z" fill="#93948c" />
                <path d="M550 725h770v15H550Z" fill="#596b71" />
                <path d="M900 740 730 1000h420L980 740Z" fill="#7b8080" />
                <path
                  d="m910 760-100 180m160-180 100 180"
                  stroke="#bac0aa"
                  strokeOpacity=".2"
                  strokeWidth="3"
                />
                {[530, 1310].map((x) => (
                  <g key={x}>
                    <path d={`M${x} 725v-220`} stroke="#88958a" strokeWidth="7" />
                    <circle cx={x} cy="490" r="18" fill="#e8cd9f" />
                    <circle cx={x} cy="490" r="100" fill={`url(#${id}light)`} />
                  </g>
                ))}
              </>
            ) : (
              <>
                <path d="M0 690Q800 570 1600 670V1000H0Z" fill="#54565d" />
                <path d="M550 700V340l260-90 250 90v360Z" fill="#896f76" />
                <path d="m520 350 290-125 280 125-20 20-260-94-270 94Z" fill="#423e53" />
                <path d="M700 700V520a110 110 0 0 1 220 0v180Z" fill="#2d4051" />
                <path d="M745 700V540a65 65 0 0 1 130 0v160Z" fill="#cfb38f" opacity=".6" />
                {[590, 960].map((x) => (
                  <g key={x}>
                    <path d={`M${x} 490v-70a30 30 0 0 1 60 0v70Z`} fill="#d6b28e" />
                    <path d={`M${x + 30} 390v100M${x} 445h60`} stroke="#685867" strokeWidth="4" />
                    <rect x={x - 8} y="496" width="76" height="12" rx="3" fill="#495a59" />
                  </g>
                ))}
                <path d="M80 280Q800 520 1540 260" fill="none" stroke="#bba68b" strokeWidth="3" />
                {Array.from({ length: 12 }, (_, i) => (
                  <motion.g
                    key={i}
                    animate={quiet ? { rotate: 0 } : { rotate: [-2, 2, -2] }}
                    transition={{ duration: 4 + i * 0.1, repeat: Infinity }}
                    style={{ transformOrigin: `${110 + i * 120}px 330px` }}
                  >
                    <path
                      d={`M${110 + i * 120} ${290 + Math.sin((i / 11) * Math.PI) * 110}v25`}
                      stroke="#bba68b"
                    />
                    <ellipse
                      cx={110 + i * 120}
                      cy={330 + Math.sin((i / 11) * Math.PI) * 110}
                      rx="12"
                      ry="18"
                      fill="#efca94"
                    />
                    <path
                      d={`M${102 + i * 120} ${330 + Math.sin((i / 11) * Math.PI) * 110}h16`}
                      stroke="#b78b73"
                    />
                  </motion.g>
                ))}
                <ellipse cx="1220" cy="730" rx="115" ry="30" fill="#9d9390" />
                <path d="M1130 730h180m-155 0v90m130-90v90" stroke="#baa48d" strokeWidth="10" />
                <path d="M500 735h170m-140 0v60m110-60v60" stroke="#aa9e8e" strokeWidth="9" />
              </>
            )}
            <g className="panorama-traveller">
              <Traveller quiet={quiet} kind={scene} />
            </g>
          </motion.g>
        </AnimatePresence>
        <motion.g animate={{ x: drift * 0.7 }} transition={{ duration: quiet ? 0 : 1.2 }}>
          <path
            d="M0 790q200-120 420 30l80 180H0Zm1600-40q-180-50-310 90l-90 160h400Z"
            fill="#213f49"
          />
          {[
            [-20, 850, 1.8],
            [160, 810, 1.2],
            [340, 850, 0.7],
            [1470, 800, 1.65],
            [1600, 850, 2.1],
            [1350, 850, 0.8],
          ].map(([x, y, size], i) => (
            <motion.g
              key={`${place}-${i}`}
              initial={quiet ? false : { y: 320 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 90, damping: 16, delay: 0.12 + (i % 3) * 0.09 }}
            >
              <Pine x={x!} y={y!} size={size!} color={i % 2 ? "#244b50" : "#193946"} />
            </motion.g>
          ))}
        </motion.g>
        <motion.g animate={{ x: drift * 1.4 }} transition={{ duration: quiet ? 0 : 1.3 }}>
          <path d="M0 920q220-100 420 80H0Zm1600-35q-250-40-480 115h480Z" fill="#132f3c" />
          {[30, 115, 220, 1380, 1480, 1570].map((x, i) => (
            <motion.g
              key={x}
              animate={quiet ? { rotate: 0 } : { rotate: [-2, 2, -2] }}
              transition={{ duration: 5 + i * 0.3, repeat: Infinity }}
              style={{ transformOrigin: `${x}px 1000px` }}
            >
              <path
                d={`M${x} 1000q-20-150 35-220m-27 100q-90-70-65-92 55-10 65 92m-3 35q80-100 95-62-10 50-95 62`}
                fill="#254953"
                stroke="#4d706b"
                strokeWidth="2"
              />
            </motion.g>
          ))}
          <path
            d="M0 110q180 70 240 180M35 0q45 150 205 290M1600 45q-160 60-260 240"
            fill="none"
            stroke="#173441"
            strokeWidth="22"
          />
          {[60, 130, 200, 1410, 1490, 1570].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${70 + (i % 3) * 35}q-55-65-75-30 0 40 75 30 25-60 65-55 20 35-65 55Z`}
              fill="#21454d"
            />
          ))}
        </motion.g>
        {place === "Routes" && (
          <motion.path
            d="M900 910q-180-100-40-175t-240-60"
            fill="none"
            stroke="#eed7a7"
            strokeWidth="3"
            strokeDasharray="3 11"
            initial={{ pathLength: quiet ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6 }}
          />
        )}
        {!quiet &&
          Array.from({ length: 14 }, (_, i) => (
            <motion.circle
              key={i}
              cx={(i * 113 + 40) % 1600}
              cy={980}
              r={i % 3 === 0 ? 3.5 : 2}
              fill={palette[2]}
              animate={{ y: [0, -760], opacity: [0, 0.9, 0], x: [0, i % 2 ? 30 : -30, 0] }}
              transition={{ duration: 9 + (i % 5) * 1.6, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
            />
          ))}
        <rect width="1300" height="1000" fill={`url(#${id}shade)`} />
      </svg>
    </div>
  );
}

/** Each place keeps its own sky so the atlas really changes as you move between them. */
const SKIES: Record<string, [string, string, string]> = {
  Home: ["#182640", "#607780", "#f1d6a4"],
  Routes: ["#14243a", "#4f7c88", "#cfe3d4"],
  Journey: ["#1d2240", "#7a6f94", "#f2c48d"],
  Call: ["#251d3a", "#8c5f7a", "#f5b9a4"],
  Kit: ["#1c2a36", "#6f8a7c", "#e8d9a8"],
  Reports: ["#1a1f33", "#5d6a8c", "#d6dcef"],
  Learn: ["#20283f", "#737c9b", "#ead2a0"],
  Circle: ["#27273f", "#936f83", "#f0c08e"],
};
