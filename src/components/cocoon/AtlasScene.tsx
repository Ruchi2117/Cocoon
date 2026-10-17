import { useId } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
/** Code-native scenery: each destination changes the architecture of the shared atlas. */
export function AtlasScene({ place }: { place: string }) {
  const id = useId().replaceAll(":", "");
  const reduced = useReducedMotion();
  const library = place === "Learn" || place === "Kit";
  const community = place === "Circle";
  const route = place === "Routes" || place === "Journey" || place === "Reports";
  return (
    <svg viewBox="0 0 600 660" aria-hidden="true" className="atlas-illustration">
      <defs>
        <linearGradient id={`${id}sky`} x2="0" y2="1">
          <stop stopColor={library ? "#27394d" : community ? "#9c8bb3" : "#819d9f"} />
          <stop offset="1" stopColor={library ? "#606d83" : "#e6ba9c"} />
        </linearGradient>
        <clipPath id={`${id}arch`}>
          <path d="M65 600V270a235 235 0 0 1 470 0v330Z" />
        </clipPath>
      </defs>
      <path
        d="M45 610V265a255 255 0 0 1 510 0v345"
        fill="none"
        stroke="currentColor"
        opacity=".3"
      />
      <g clipPath={`url(#${id}arch)`}>
        <path d="M65 600V270a235 235 0 0 1 470 0v330Z" fill={`url(#${id}sky)`} />
        <motion.circle
          cx="395"
          cy="168"
          r="62"
          fill="#f4d5a1"
          animate={reduced ? {} : { cy: [168, 158, 168] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <path d="M0 420L140 240 230 345 350 210 600 425V660H0Z" fill="#596e73" />
        <path d="M0 480Q140 340 310 430T600 440V660H0Z" fill="#374f58" />
        {route ? (
          <>
            <path
              d="M330 370Q70 455 340 520T250 700"
              fill="none"
              stroke="#9abcc1"
              strokeWidth="72"
            />
            <path
              d="M330 370Q70 455 340 520T250 700"
              fill="none"
              stroke="#e6d2ad"
              strokeWidth="2"
              strokeDasharray="3 13"
            />
            <path d="M90 450Q300 340 510 450" fill="none" stroke="#d6b29b" strokeWidth="14" />
            <path d="M90 430Q300 320 510 430" fill="none" stroke="#d6b29b" strokeWidth="3" />
            {[130, 210, 300, 390, 470].map((x) => (
              <path key={x} d={`M${x} 430v40`} stroke="#d6b29b" strokeWidth="3" />
            ))}
          </>
        ) : (
          <>
            <path
              d="M125 600V300Q125 255 170 255H430Q475 255 475 300V600Z"
              fill={community ? "#b87d76" : "#bba58c"}
            />
            <path d="M220 600V430a80 80 0 0 1 160 0v170" fill="#263c49" />
            {[160, 400].map((x) => (
              <g key={x}>
                <path d={`M${x} 355v-45a20 20 0 0 1 40 0v45Z`} fill="#e8c18f" />
                <path d={`M${x + 20} 290v65`} stroke="#6d6c72" strokeWidth="3" />
              </g>
            ))}
            {library &&
              [0, 1, 2, 3, 4, 5].map((i) => (
                <g key={i}>
                  <path
                    d={`M${135 + i * 55} 225v45h42v-45Z`}
                    fill={["#c0c8a4", "#d5a99b", "#8ba8ab"][i % 3]}
                  />
                  <path d={`M${145 + i * 55} 230v30`} stroke="#394b56" strokeWidth="2" />
                </g>
              ))}
            <path d="M85 600H515M110 620H490" stroke="#d1ad90" strokeWidth="10" />
          </>
        )}
        {community &&
          [150, 300, 450].map((x, i) => (
            <motion.g
              key={x}
              animate={reduced ? {} : { y: [0, -3, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity }}
            >
              <circle
                cx={x}
                cy={470 + (i % 2) * 35}
                r="16"
                fill={["#c79579", "#dbb298", "#ab7c67"][i]}
              />
              <path
                d={`M${x - 22} ${540 + (i % 2) * 35}v-33q22-22 44 0v33Z`}
                fill={["#a9bcaa", "#b6a2bf", "#d49c86"][i]}
              />
            </motion.g>
          ))}
        <path
          d="M65 660V400Q140 410 140 450L90 445Q190 500 160 525L85 490V660M535 660V350Q450 350 450 410L515 395Q420 470 455 500L520 450V660"
          fill="#223c44"
        />
        <path
          d="M115 600Q300 540 485 600"
          fill="none"
          stroke="#f2d7af"
          strokeWidth="2"
          strokeDasharray="2 12"
        />
      </g>
      <motion.g
        animate={reduced ? {} : { rotate: [0, 360] }}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "300px 310px" }}
      >
        <path
          d="M300 6v20m-10-10h20M35 310h20m-10-10v20M545 310h20m-10-10v20"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="300"
          cy="310"
          r="287"
          fill="none"
          stroke="currentColor"
          strokeDasharray="1 20"
          opacity=".3"
        />
      </motion.g>
      <path d="M250 646h100" stroke="currentColor" opacity=".5" />
    </svg>
  );
}
