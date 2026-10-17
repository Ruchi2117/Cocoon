import { motion } from "motion/react";

/** Filled scenery for the five destinations outside the station, library and courtyard. */
export function AtlasPlaces({ place, quiet }: { place: string; quiet: boolean }) {
  if (place === "Home")
    return (
      <>
        <path d="M0 700Q800 540 1600 700v300H0Z" fill="#304b5c" />
        {[560, 760, 960, 1160].map((x, i) => (
          <g key={x}>
            <path
              d={`M${x} 700V${340 + (i % 2) * 90}h160V700Z`}
              fill={i % 2 ? "#647580" : "#4d6374"}
            />
            <path d={`m${x - 10} ${340 + (i % 2) * 90} 90-65 90 65Z`} fill="#2f4559" />
            {[0, 1, 2, 3].map((j) => (
              <g key={j}>
                {[0, 1, 2].map((k) => (
                  <motion.rect
                    key={k}
                    x={x + 22 + k * 43}
                    y={370 + (i % 2) * 90 + j * 60}
                    width="22"
                    height="32"
                    rx="3"
                    fill="#e1c69b"
                    animate={quiet ? { opacity: 0.7 } : { opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 7 + i + j, delay: k, repeat: Infinity }}
                  />
                ))}
              </g>
            ))}
          </g>
        ))}
        <path d="M660 760q240-100 550 0l160 240H480Z" fill="#6a7d82" />
        <path
          d="M850 800v160m120-160v160"
          stroke="#a3b2a7"
          strokeWidth="3"
          strokeDasharray="18 18"
        />
      </>
    );
  if (place === "Journey")
    return (
      <>
        <path d="M0 720Q800 600 1600 690v310H0Z" fill="#405664" />
        {[570, 920].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 700V440h270v260Z`} fill={i ? "#8e7f80" : "#73888a"} />
            <path d={`m${x - 30} 450 165-145 165 145Z`} fill="#35485d" />
            <rect x={x + 105} y="560" width="65" height="140" rx="30" fill="#d5ba90" />
            {[x + 35, x + 195].map((v) => (
              <g key={v}>
                <rect x={v} y="485" width="40" height="60" rx="18" fill="#e7c997" />
                <path d={`M${v + 20} 485v60m-20-30h40`} stroke="#536573" strokeWidth="4" />
              </g>
            ))}
            <motion.ellipse
              cx={x + 137}
              cy="695"
              rx="100"
              ry="45"
              fill="#edcfa4"
              animate={quiet ? { opacity: 0.18 } : { opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 4, delay: i, repeat: Infinity }}
            />
          </g>
        ))}
        <path
          d="M700 720q200 80 480 0"
          stroke="#c8bca0"
          strokeWidth="3"
          fill="none"
          strokeDasharray="5 14"
        />
        <motion.circle
          r="6"
          fill="#f3dab2"
          animate={quiet ? { cx: 700, cy: 720 } : { cx: [700, 940, 1180], cy: [720, 760, 720] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </>
    );
  if (place === "Call")
    return (
      <>
        <path d="M0 670q800-140 1600 0v330H0Z" fill="#334c60" />
        <path d="M500 730V420q340-270 680 0v310Z" fill="#34455d" />
        <path d="M540 720V440q300-225 600 0v280Z" fill="#70828a" />
        <path d="M570 700V455q270-185 540 0v245Z" fill="#a9a795" />
        <path
          d="M570 590h540m-400-185v295m135-330v330m135-295v295"
          stroke="#526779"
          strokeWidth="8"
        />
        <path
          d="M655 700v-65h370v65m-340-35v80m310-80v80"
          stroke="#d1bb9b"
          strokeWidth="12"
          fill="none"
        />
        {[0, 1, 2].map((i) => (
          <motion.ellipse
            key={i}
            cx="850"
            cy="545"
            rx={70 + i * 26}
            ry={60 + i * 23}
            fill="none"
            stroke="#d9ceb6"
            animate={
              quiet ? { opacity: 0.25 } : { opacity: [0.08, 0.4, 0.08], scale: [0.9, 1.1, 0.9] }
            }
            transition={{ duration: 5, delay: i * 0.5, repeat: Infinity }}
            style={{ transformOrigin: "850px 545px" }}
          />
        ))}
        <path d="M530 750h630l130 250H400Z" fill="#526675" />
      </>
    );
  const kit = place === "Kit";
  return (
    <>
      <path d="M0 690q800-100 1600 0v310H0Z" fill="#485a66" />
      <path d="M570 730V350h660v380Z" fill={kit ? "#8b8679" : "#857280"} />
      <path d="M535 380h730l-65-85H600Z" fill="#37495c" />
      <path d="M610 430h580v250H610Z" fill="#33495b" />
      <path d="M610 430h580v40H610Z" fill={kit ? "#c4b797" : "#c8a0a0"} />
      <path d="M600 700h610v30H600Z" fill="#b8ad99" />
      {kit ? (
        <>
          {[650, 830, 1010].map((x, i) => (
            <motion.g
              key={x}
              initial={quiet ? false : { y: 35, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
            >
              <rect
                x={x}
                y="535"
                width="110"
                height="135"
                rx="15"
                fill={["#a59c88", "#b49387", "#9baeb0"][i]}
              />
              <path
                d={`M${x + 25} 535v-25h60v25m-65 65h70v50h-70Z`}
                stroke="#e7d3b1"
                fill="none"
                strokeWidth="4"
              />
              <path d={`M${x + 55} 567v20m-10-10h20`} stroke="#ead6b9" strokeWidth="4" />
            </motion.g>
          ))}
        </>
      ) : (
        <>
          {[640, 820, 1000].map((x, i) => (
            <motion.g
              key={x}
              initial={quiet ? false : { rotate: -8, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.9 }}
              style={{ transformOrigin: `${x}px 500px` }}
            >
              <rect
                x={x}
                y="490"
                width="150"
                height="180"
                rx="3"
                fill={["#c7c2ad", "#b8cad0", "#c6a6a4"][i]}
              />
              <rect x={x + 15} y="510" width="120" height="58" fill="#677e88" />
              <path
                d={`M${x + 15} 590h115m-115 15h115m-115 15h80m-80 15h105m-105 15h65`}
                stroke="#536775"
                strokeWidth="4"
              />
            </motion.g>
          ))}
        </>
      )}
      <rect x="748" y="365" width="300" height="38" rx="4" fill="#ded0b5" />
      <text x="898" y="390" textAnchor="middle" fontSize="16" letterSpacing="4" fill="#344859">
        {kit ? "THE PACKING ROOM" : "THE CONTEXT DESK"}
      </text>
    </>
  );
}
