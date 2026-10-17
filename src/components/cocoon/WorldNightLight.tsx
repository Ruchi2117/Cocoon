import { useId } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";

/** An illustrated scroll reveal, never a simulated view of the user's surroundings. */
export function WorldNightLight({
  progress,
  pointer,
  reduced,
  layer,
}: {
  progress: MotionValue<number>;
  pointer: MotionValue<number>;
  reduced: boolean;
  layer: "people" | "light";
}) {
  const id = useId().replaceAll(":", "");
  const darkness = useTransform(progress, [0.43, 0.54, 0.66, 0.77, 0.88], [0, 0.94, 0.85, 0.5, 0]);
  const gathering = useTransform(progress, [0.46, 0.58, 0.72, 0.83], [0, 1, 1, 0]);
  const sweep = useTransform(progress, [0.45, 0.56, 0.67, 0.8], [1300, 1450, 420, 1400]);
  const beamX = useTransform([sweep, pointer], ([x, p]) => Number(x) + Number(p) * 12);
  const radius = useTransform(progress, [0.48, 0.66, 0.8], [180, 390, 680]);
  const arrive = useTransform(progress, [0.49, 0.65], [75, 0]);
  if (layer === "people")
    return (
      <motion.g
        className="world-gathering"
        style={{ opacity: reduced ? 1 : gathering }}
        aria-hidden="true"
      >
        <g transform="translate(-490 175) scale(.7)">
          <motion.g style={{ x: reduced ? 0 : arrive }}>
            <path
              d="M1020 720Q1250 630 1490 720"
              fill="none"
              stroke="#f4ce8d"
              strokeWidth="3"
              strokeDasharray="3 12"
            />
            <g transform="translate(1070 500)">
              <ellipse cy="230" rx="55" ry="11" fill="#242932" opacity=".4" />
              <path d="M-35 215L-32 105Q0 76 35 105L45 215Z" fill="#b07161" />
              <path d="M-17 210l-5 29M23 210l10 29" stroke="#35333b" strokeWidth="13" />
              <path
                d="M-30 122l-25 45M30 122l25 24"
                stroke="#d49a73"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <path d="M-33 68Q-40 21 0 20Q45 15 36 73L22 93H-22Z" fill="#d4c9b9" />
              <ellipse cy="64" rx="27" ry="34" fill="#b87959" />
              <path d="M-29 49q18-30 43-9l19 14Q34 14 3 16Q-35 15-29 49" fill="#d4c9b9" />
              <path d="M-15 64h8m15 0h8" stroke="#47343b" strokeWidth="3" />
              <path d="M-7 81q7 5 14 0" fill="none" stroke="#74454a" strokeWidth="2" />
              <path d="M-29 103L0 147 30 103" fill="none" stroke="#e4c594" strokeWidth="12" />
              <path
                d="M55 146v20m-12 0h24v30H43Z"
                stroke="#f4d294"
                strokeWidth="3"
                fill="#e9ae63"
              />
              <circle cx="55" cy="180" r="55" fill="url(#world-lantern-halo)" />
            </g>
            <g transform="translate(1280 540)">
              <circle cx="-5" cy="151" r="45" fill="#454750" stroke="#e6bd8b" strokeWidth="5" />
              <path
                d="M-5 107v88m-44-44h88M-36 120l62 62m-62 0 62-62"
                stroke="#a98d7d"
                strokeWidth="2"
              />
              <path d="M-32 87v54h75l23 45h23" fill="none" stroke="#c8b5a0" strokeWidth="7" />
              <path d="M-27 60Q0 45 23 64L28 119H-23Z" fill="#7d9c8b" />
              <path
                d="M6 115h35l20 54"
                fill="none"
                stroke="#292e3b"
                strokeWidth="19"
                strokeLinejoin="round"
              />
              <path
                d="M20 75l22 22 25-6"
                fill="none"
                stroke="#c58969"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <ellipse cy="29" rx="24" ry="29" fill="#c58969" />
              <path d="M-26 33Q-35-14 7-7Q36-1 26 35L14 7Q-3 22-26 19" fill="#342d37" />
              <path d="M-13 30h6m13 0h6" stroke="#47343b" strokeWidth="3" />
            </g>
            <g transform="translate(1460 505)">
              <path d="M-26 207l-8 29m51-29 11 29" stroke="#30313a" strokeWidth="15" />
              <path d="M-33 99Q0 82 29 99L37 213H-39Z" fill="#d7ac73" />
              <path
                d="M-27 117l-29 35-22-4M25 119l15 47"
                fill="none"
                stroke="#865544"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <ellipse cy="63" rx="27" ry="32" fill="#865544" />
              <path d="M-28 60Q-40 21-5 21Q42 17 29 68L15 40Q-10 56-28 48" fill="#302b32" />
              <path d="M-15 63h7m14 0h7" stroke="#2e2631" strokeWidth="3" />
              <path d="M-7 81q7 4 14-1" fill="none" stroke="#e1ab86" strokeWidth="2" />
            </g>
          </motion.g>
        </g>
      </motion.g>
    );
  return (
    <motion.g
      className="world-night-light"
      style={{ opacity: reduced ? 0 : darkness }}
      pointerEvents="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-soft`}>
          <stop stopColor="black" />
          <stop offset=".62" stopColor="black" />
          <stop offset="1" stopColor="black" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-reveal`} maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
          <rect width="1600" height="900" fill="white" />
          <motion.ellipse cx={beamX} cy="535" rx={radius} ry="400" fill={`url(#${id}-soft)`} />
          <ellipse cx="800" cy="520" rx="205" ry="290" fill={`url(#${id}-soft)`} />
        </mask>
      </defs>
      <rect width="1600" height="900" fill="#111923" mask={`url(#${id}-reveal)`} />
      <motion.ellipse
        cx={beamX}
        cy="535"
        rx={radius}
        ry="400"
        fill="none"
        stroke="#e7d7af"
        strokeWidth="1"
        opacity=".13"
      />
    </motion.g>
  );
}
