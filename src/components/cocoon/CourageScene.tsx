import { useId } from "react";
import { motion } from "motion/react";
import { GirlFigure } from "./GirlFigure";

export function CourageScene({
  chapter,
  choice,
  quiet,
}: {
  chapter: number;
  choice: number | null;
  quiet: boolean;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg viewBox="0 0 1000 600" className="courage-scene" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}sky`} x2="0" y2="1">
          <stop stopColor="#241924" />
          <stop
            offset="1"
            stopColor={chapter === 0 ? "#744450" : chapter === 1 ? "#92445a" : "#64515b"}
          />
        </linearGradient>
        <radialGradient id={`${id}glow`}>
          <stop stopColor="#f9c18c" stopOpacity=".65" />
          <stop offset="1" stopColor="#f9c18c" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}brick`} width="55" height="30" patternUnits="userSpaceOnUse">
          <path
            d="M0 0h55M0 30h55M27 0v15M0 15h55M0 15v15M55 15v15"
            stroke="#c9a59a"
            strokeOpacity=".1"
          />
        </pattern>
      </defs>
      <rect width="1000" height="600" fill={`url(#${id}sky)`} />
      <motion.g
        animate={{ x: chapter === 0 ? 0 : chapter === 1 ? -25 : 25 }}
        transition={{ duration: quiet ? 0 : 1.2 }}
      >
        <circle cx="810" cy="95" r="36" fill="#d0a89b" opacity=".65" />
        <path
          d="M0 340V210h80v-65h90v140h70V185h110v120h100V155h100v120h90v-60h120v125Z"
          fill="#322c3b"
        />
        {[50, 110, 150, 280, 315, 480, 520, 710, 750].map((x, i) => (
          <rect
            key={x}
            x={x}
            y={220 + (i % 3) * 20}
            width="10"
            height="24"
            fill="#c49a85"
            opacity=".6"
          />
        ))}
      </motion.g>
      <path d="M0 450q450-90 1000 0v150H0Z" fill="#332c36" />
      <path d="M0 520q450-100 1000 0" stroke="#b58e89" fill="none" opacity=".4" />
      {chapter === 0 ? (
        <>
          <motion.circle
            cx="255"
            cy="290"
            r="220"
            fill={`url(#${id}glow)`}
            animate={{ opacity: choice === 0 ? 1 : 0.4 }}
            transition={{ duration: quiet ? 0 : 1 }}
          />
          <path d="M75 460V235l195-110 190 110v225Z" fill="#75535c" />
          <path d="M75 235h385v225H75Z" fill={`url(#${id}brick)`} />
          <path d="m40 240 230-138 225 138-20 18-205-112-210 112Z" fill="#382e3d" />
          <rect
            x="115"
            y="270"
            width="300"
            height="125"
            fill={choice === 0 ? "#e4bb91" : "#a89489"}
          />
          {[150, 230, 310, 390].map((x) => (
            <path key={x} d={`M${x} 270v125`} stroke="#5b4652" strokeWidth="8" />
          ))}
          <rect x="196" y="222" width="145" height="30" rx="3" fill="#dfc0a0" />
          <text x="270" y="242" textAnchor="middle" fill="#4a3543" fontSize="12" letterSpacing="3">
            NIGHT CAFÉ
          </text>
          <path d="M170 425h200m-170 0v55m140-55v55" stroke="#b99987" strokeWidth="9" />
          <path
            d="M530 465V240h140m-140 0 15-25h120l15 25"
            fill="none"
            stroke="#a68e90"
            strokeWidth="8"
          />
          <rect x="550" y="255" width="110" height="90" rx="4" fill="#493849" stroke="#ab8c8a" />
          <path d="M570 280h70m-70 20h40m-40 20h55" stroke="#c9aea0" strokeWidth="3" />
        </>
      ) : chapter === 1 ? (
        <>
          <path d="M50 470V140h470v330Z" fill="#754450" />
          <path d="M50 140h470v330H50Z" fill={`url(#${id}brick)`} />
          <path d="M120 470V260a95 95 0 0 1 190 0v210Z" fill="#362c3b" />
          <path
            d="M145 470V270a70 70 0 0 1 140 0v200Z"
            fill={choice === 1 ? "#c8a68c" : "#695865"}
          />
          <path d="M350 200h100v160H350Z" fill="#c1a18d" />
          <path d="M400 200v160m-50-80h100" stroke="#684754" strokeWidth="8" />
          <motion.path
            d="M520 435q70-100 130-40"
            fill="none"
            stroke="#f3c9ba"
            strokeWidth="3"
            strokeDasharray="4 12"
            animate={{ pathLength: choice === 1 ? 1 : 0 }}
            transition={{ duration: quiet ? 0 : 1 }}
          />
          {choice === 0 && (
            <g>
              <path
                d="M410 160h210q20 0 20 20v65q0 20-20 20h-110l-35 30 8-30h-73q-20 0-20-20v-65q0-20 20-20Z"
                fill="#ead4c7"
              />
              <text x="510" y="202" textAnchor="middle" fill="#612b40" fontSize="18">
                I’m not comfortable
              </text>
              <text x="510" y="228" textAnchor="middle" fill="#612b40" fontSize="18">
                with that.
              </text>
            </g>
          )}
        </>
      ) : (
        <>
          <path d="M80 465V190q220-140 440 0v275Z" fill="#775760" />
          <path d="M115 465V210q185-110 370 0v255Z" fill="#c2a28b" opacity=".6" />
          <path d="M300 150v315M115 310h370" stroke="#654856" strokeWidth="8" />
          <path d="M100 110q240 80 480 0" stroke="#d6baa4" strokeWidth="2" fill="none" />
          {[150, 250, 350, 450, 550].map((x, i) => (
            <motion.g
              key={x}
              animate={quiet ? { rotate: 0 } : { rotate: [-3, 3, -3] }}
              transition={{ duration: 5 + i * 0.3, repeat: Infinity }}
              style={{ transformOrigin: `${x}px 135px` }}
            >
              <path d={`M${x} 135v25`} stroke="#c2a38f" />
              <ellipse cx={x} cy="175" rx="12" ry="18" fill="#e4c19c" />
            </motion.g>
          ))}
          <path d="M155 430h270m-240 0v65m210-65v65" stroke="#ab8e85" strokeWidth="12" />
          <g transform="translate(260 330)">
            <circle cy="-15" r="22" fill="#bb8a77" />
            <path d="M-24-20q0-40 25-37 33 3 24 43l-15-24-34 18Z" fill="#372936" />
            <path d="M-29 22q28-20 58 0l20 62h-91Z" fill="#9c7f8c" />
            <path d="M-30 83h65l25 47" fill="none" stroke="#393443" strokeWidth="17" />
          </g>
          {choice !== null && (
            <motion.path
              d="M450 335q80-60 150 0"
              fill="none"
              stroke="#ead4c4"
              strokeWidth="3"
              initial={quiet ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
            />
          )}
        </>
      )}
      <svg x="600" y="150" width="340" height="430" viewBox="250 130 470 630">
        <GirlFigure active={!quiet} />
      </svg>
      {choice === 1 && chapter === 0 && (
        <motion.g initial={quiet ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <rect x="680" y="130" width="235" height="72" rx="18" fill="#ead4c7" />
          <circle cx="709" cy="166" r="13" fill="#a62e4c" />
          <text x="733" y="162" fill="#603244" fontSize="14">
            A check-in can start small.
          </text>
          <text x="733" y="182" fill="#603244" fontSize="11">
            Illustration · no message sent
          </text>
        </motion.g>
      )}
      <path
        d="M0 600V430q90-100 145 50 80-50 130 120Zm1000 0V390q-100-30-135 120-90-25-140 90Z"
        fill="#241f2b"
      />
      <path
        d="M30 600q10-120 55-150m-30 88-45-40m45 50 50-35m850 87q-30-150-70-165m40 110 45-50"
        fill="none"
        stroke="#8d6b79"
        strokeWidth="3"
      />
    </svg>
  );
}
