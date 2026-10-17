import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

/** Layered, articulated SVG scenes. Decorative people never imply live users. */
export function NightAtlasScene({ scene, still = false }: { scene: number; still?: boolean }) {
  const id = useId().replaceAll(":", "");
  const reduced = useReducedMotion();
  const active = !reduced && !still;
  const colors = ["#7cb2b2", "#a99fc6", "#d5a086"];
  return (
    <svg viewBox="0 0 700 700" className="night-atlas-art" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}glow`}>
          <stop stopColor={colors[scene]} stopOpacity=".45" />
          <stop offset="1" stopColor={colors[scene]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="350" cy="340" r="340" fill={`url(#${id}glow)`} />
      <motion.g
        animate={active ? { x: [-5, 5, -5] } : { x: 0 }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M30 520V300h80v-90h100v120h70V190h130v130h100V240h80v280Z" fill="#253d52" />
        {[80, 145, 190, 310, 355, 400, 530, 565].map((x, i) => (
          <rect
            key={x}
            x={x}
            y={260 + (i % 3) * 65}
            width="12"
            height="28"
            rx="6"
            fill={i % 2 ? "#c7ae89" : "#8ca6aa"}
            opacity=".65"
          />
        ))}
      </motion.g>
      <ellipse cx="350" cy="605" rx="305" ry="40" fill="#142936" />
      {scene === 0 ? (
        <>
          <path d="M60 430V245H630v185" fill="#314d5b" />
          <path d="M40 245h610l-45-32H90Z" fill="#a8bdba" />
          <rect x="80" y="280" width="530" height="115" rx="30" fill="#b6c3ba" />
          <path d="M80 335h530" stroke="#8ba4a5" strokeWidth="3" />
          {[130, 245, 360, 475].map((x) => (
            <rect key={x} x={x} y="299" width="70" height="65" rx="15" fill="#284857" />
          ))}
          <motion.g
            animate={active ? { opacity: [0.4, 0.9, 0.4] } : { opacity: 0.7 }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <path d="M120 245L75 540H250L210 245Z" fill="#f3d5a0" opacity=".12" />
            <path d="M480 245L400 540H590L570 245Z" fill="#f3d5a0" opacity=".12" />
          </motion.g>
          <path d="M85 485h170m-145 0v65m120-65v65" stroke="#b7aaa0" strokeWidth="9" />
          <text x="360" y="240" fill="#253c48" fontSize="13" letterSpacing="4">
            LAST TRAIN / 21:42
          </text>
        </>
      ) : scene === 1 ? (
        <>
          <path d="M110 565V170Q350 45 590 170V565Z" fill="#6d657c" />
          <path d="M140 565V190Q350 85 560 190V565Z" fill="#243c50" />
          {[170, 260, 350, 440].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 230v210h65V230Z`} fill="#a89e97" />
              {[0, 1, 2].map((j) => (
                <g key={j}>
                  <path d={`M${x} ${265 + j * 60}h65`} stroke="#363e51" strokeWidth="5" />
                  {[0, 1, 2, 3].map((k) => (
                    <rect
                      key={k}
                      x={x + 6 + k * 14}
                      y={235 + j * 60}
                      width="10"
                      height="29"
                      rx="2"
                      fill={["#b3c6ad", "#d1a48c", "#919ebf"][(i + k) % 3]}
                    />
                  ))}
                </g>
              ))}
            </g>
          ))}
          <path d="M105 520h480m-435 0v100m390-100v100" stroke="#c3ab91" strokeWidth="12" />
          <path d="M335 500v-65l35-30h65l30 30h-130" fill="#c5cfb0" />
          <motion.ellipse
            cx="402"
            cy="506"
            rx="90"
            ry="20"
            fill="#f4d39c"
            animate={active ? { opacity: [0.1, 0.25, 0.1] } : { opacity: 0.2 }}
            transition={{ duration: 6, repeat: Infinity }}
          />
        </>
      ) : (
        <>
          <path d="M90 530V250q0-55 60-55h400q60 0 60 55v280" fill="#886c78" />
          <path d="M260 530V340a90 90 0 0 1 180 0v190" fill="#22394a" />
          {[140, 490].map((x) => (
            <path key={x} d={`M${x} 350v-70a25 25 0 0 1 50 0v70Z`} fill="#e1ba8e" />
          ))}
          <path d="M70 170Q350 290 630 170" fill="none" stroke="#c7b799" strokeWidth="2" />
          {[100, 180, 260, 350, 440, 520, 600].map((x, i) => (
            <motion.g
              key={x}
              animate={active ? { rotate: [-3, 3, -3] } : { rotate: 0 }}
              transition={{ duration: 4 + i * 0.3, repeat: Infinity }}
              style={{ transformOrigin: `${x}px 170px` }}
            >
              <path d={`M${x} ${190 + Math.sin((i / 6) * Math.PI) * 40}v20`} stroke="#c7b799" />
              <circle cx={x} cy={220 + Math.sin((i / 6) * Math.PI) * 40} r="9" fill="#efcea1" />
            </motion.g>
          ))}
        </>
      )}
      {/* The main figure glances over her shoulder; the body and arm have separate motion. */}
      <motion.g
        animate={active ? { y: [0, -3, 0] } : { y: 0 }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="330" cy="605" rx="68" ry="12" fill="#0d2330" opacity=".6" />
        <path d="M300 515l-10 82h27l20-82m5 0 20 82h27l-11-82" fill="#1d2d40" />
        <path
          d="M290 405Q330 385 370 405l22 120H275Z"
          fill={scene === 0 ? "#c0827e" : scene === 1 ? "#9caec2" : "#9cb6a2"}
        />
        <path d="M303 399l26 30 27-30" fill="#ecd5b4" />
        <motion.g
          animate={active ? { rotate: [0, -12, -12, 0] } : { rotate: 0 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            times: [0, 0.3, 0.55, 1],
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "331px 396px" }}
        >
          <path d="M290 382v-44q4-49 43-48 46 0 49 47v54Z" fill="#202c3b" />
          <path d="M304 345q0-36 29-34 31 0 30 34v24q-3 33-29 34-29-2-30-34Z" fill="#d4a285" />
          <path d="M299 348q5-56 43-43l29 36q-29-3-34-20-9 25-38 27" fill="#202c3b" />
          <path d="M318 355h5m23 0h5" stroke="#29313b" strokeWidth="3" strokeLinecap="round" />
          <path d="M332 363l-3 12h7m-10 10q9 5 17-1" fill="none" stroke="#905e58" strokeWidth="2" />
          <circle cx="307" cy="371" r="5" fill="none" stroke="#ecd5a1" strokeWidth="2" />
        </motion.g>
        <motion.g
          animate={active ? { rotate: [0, 6, 0] } : { rotate: 0 }}
          transition={{ duration: 5, repeat: Infinity }}
          style={{ transformOrigin: "365px 419px" }}
        >
          <path
            d="M366 420l34 55 35-30"
            fill="none"
            stroke="#d4a285"
            strokeWidth="15"
            strokeLinecap="round"
          />
          <rect
            x="421"
            y="416"
            width="27"
            height="43"
            rx="5"
            fill="#dce0cd"
            transform="rotate(12 435 437)"
          />
          <rect x="426" y="421" width="17" height="26" rx="2" fill="#668d9d" />
        </motion.g>
        <path
          d="M295 420l-26 59 31 20"
          fill="none"
          stroke="#d4a285"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <path d="M283 414q-42 25-29 88l35 4q-15-59 12-75" fill="#b6a083" />
      </motion.g>
      {scene === 2 && (
        <g>
          <circle cx="490" cy="434" r="24" fill="#b3836d" />
          <path d="M463 432q-10-42 27-42t26 45l-10-21q-25 12-43 18" fill="#c8bba7" />
          <path d="M457 480q33-30 65 0l15 73h-91Z" fill="#b3a0bf" />
          <path d="M462 550l-7 52m57-52 10 52" stroke="#25364a" strokeWidth="18" />
          <path
            d="M461 486l-25 24-20-11"
            stroke="#b3836d"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}
      {scene === 1 && (
        <g>
          <circle cx="165" cy="463" r="23" fill="#a77b66" />
          <path d="M141 456q0-30 24-30 30 0 26 37l-20-16Z" fill="#2a2939" />
          <path d="M139 496q30-24 55 0l14 65h-83Z" fill="#c69b84" />
          <path d="M140 550h70l20 48" fill="none" stroke="#29364a" strokeWidth="19" />
          <path
            d="M145 507l24 21 30-10"
            fill="none"
            stroke="#a77b66"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path d="M182 512l30-10 22 22-32 9Z" fill="#ece0bc" />
        </g>
      )}
      <path
        d="M75 620q-20-110 15-145m-6 65q-50-40-55-15m64 35q48-40 50-10M600 620q50-120 5-170m5 90q70-40 66-9"
        stroke="#829c91"
        strokeWidth="6"
        fill="none"
      />
    </svg>
  );
}
