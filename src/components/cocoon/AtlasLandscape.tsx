import { motion, useReducedMotion } from "motion/react";

/** Persistent edge scenery: the same paths travel and reshape between places. */
export function AtlasLandscape({ scene, still }: { scene: number; still: boolean }) {
  const reduced = useReducedMotion();
  const quiet = still || !!reduced;
  const transition = { duration: quiet ? 0 : 1.3, ease: "easeInOut" as const };
  return (
    <svg
      className="atlas-landscape"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <motion.circle
        cx="1280"
        cy="180"
        r="70"
        fill="#e7ddbc"
        animate={{ x: [0, -180, -60][scene]!, y: [0, 30, -35][scene]!, opacity: 0.5 }}
        transition={transition}
      />
      <motion.path
        fill="#304e60"
        animate={{
          d: [
            "M0 700Q250 450 520 650T1100 600T1600 650V1000H0Z",
            "M0 700Q250 600 520 710T1100 650T1600 700V1000H0Z",
            "M0 700Q250 500 520 670T1100 570T1600 650V1000H0Z",
          ][scene]!,
        }}
        transition={transition}
      />
      <motion.path
        fill="none"
        stroke="#b9b69b"
        strokeWidth="3"
        opacity=".45"
        animate={{
          d: [
            "M-100 850Q400 640 800 820T1700 720",
            "M-100 900Q400 810 800 860T1700 820",
            "M-100 850Q400 700 800 780T1700 760",
          ][scene]!,
        }}
        transition={transition}
      />
      {[0, 1].map((side) => (
        <motion.g
          key={side}
          animate={{
            x: side ? [0, 140, -50][scene]! : [0, -100, 60][scene]!,
            y: [0, 70, -20][scene]!,
          }}
          transition={transition}
        >
          <path
            d={side ? "M1470 850V340q0-45-50-45h-70" : "M135 860V300q0-45 50-45h70"}
            fill="none"
            stroke="#69858b"
            strokeWidth="9"
          />
          <ellipse cx={side ? 1350 : 255} cy={side ? 300 : 255} rx="30" ry="9" fill="#efd3a2" />
          <path
            d={side ? "M1320 310L1160 900H1550L1380 310Z" : "M225 265L50 900H440L285 265Z"}
            fill="#edcfa0"
            opacity=".045"
          />
        </motion.g>
      ))}
      <motion.g
        animate={{
          x: scene === 0 ? 0 : scene === 1 ? -700 : 1500,
          opacity: scene === 0 ? 0.85 : 0,
        }}
        transition={transition}
      >
        <path d="M-80 835l35-60h145l55 60h35v52H-100v-42Z" fill="#c09b88" />
        <path d="M-20 782h60v48h-86Zm70 0h42l44 48H50Z" fill="#243e51" />
        <circle cx="-20" cy="886" r="22" fill="#162c3c" />
        <circle cx="125" cy="886" r="22" fill="#162c3c" />
        <path d="M185 845l240 42H185Z" fill="#e6cc9d" opacity=".12" />
      </motion.g>
      <motion.g
        animate={{ opacity: scene === 2 ? 0.6 : 0, y: scene === 2 ? 0 : -100 }}
        transition={transition}
      >
        <path d="M0 140Q800 450 1600 140" fill="none" stroke="#b9ae94" strokeWidth="2" />
        {[100, 300, 500, 700, 900, 1100, 1300, 1500].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={165 + Math.sin((i / 7) * Math.PI) * 145}
            r="7"
            fill="#f0cc97"
          />
        ))}
      </motion.g>
      {[0, 1].map((side) => (
        <motion.g
          key={side}
          animate={{
            x: side ? [0, 90, -30][scene]! : [0, -90, 30][scene]!,
            rotate: quiet ? 0 : scene === 1 ? (side ? -5 : 5) : 0,
          }}
          transition={transition}
          style={{ transformOrigin: side ? "1600px 1000px" : "0px 1000px" }}
        >
          <path
            d={
              side
                ? "M1600 1000V690q-75-70-100 35-110-95-130 55-110-10-110 100-100 0-95 120Z"
                : "M0 1000V690q75-70 100 35 110-95 130 55 110-10 110 100 100 0 95 120Z"
            }
            fill={scene === 1 ? "#344953" : "#294b49"}
          />
          <path
            d={
              side
                ? "M1580 1000q-55-180-130-230m110 165 10-140m-40 90-100-10"
                : "M20 1000q55-180 130-230M40 935 30 795m40 90 100-10"
            }
            fill="none"
            stroke="#789181"
            strokeWidth="3"
            opacity=".4"
          />
        </motion.g>
      ))}
    </svg>
  );
}
