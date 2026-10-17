import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { enterWorld } from "@/lib/cocoon/world-navigation";

const destinations = [
  {
    to: "/explore",
    label: "Plan a walking route",
    room: "The riverside",
    hint: "Choose where you’re going",
  },
  {
    to: "/explore",
    label: "Find your walking route",
    room: "The riverside",
    hint: "Compare directions and reports",
  },
  {
    to: "/circle",
    label: "Enter the Circle",
    room: "The courtyard",
    hint: "Make room for what’s on your mind",
  },
  {
    to: "/learn",
    label: "Open the Safety Library",
    room: "The night library",
    hint: "Boundaries, preparation and trusted sources",
  },
] as const;

/** Real destinations drawn as objects inside the world, with native links and keyboard access. */
export function WorldDestinations({
  scene,
  reduced,
  onEngage,
}: {
  scene: number;
  reduced: boolean;
  onEngage: (engaged: boolean) => void;
}) {
  const destination = destinations[scene]!;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        className={`world-destination destination-${scene}`}
        key={scene}
        initial={reduced ? false : { opacity: 0, y: 24, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: reduced ? 0 : 0.4 }}
      >
        <Link
          to={destination.to}
          className="world-object-link"
          aria-label={destination.label}
          onPointerEnter={() => onEngage(true)}
          onPointerLeave={() => onEngage(false)}
          onFocus={() => onEngage(true)}
          onBlur={() => onEngage(false)}
          onClick={(event) =>
            enterWorld(event, {
              to: destination.to,
              label: destination.room,
              x: scene === 2 ? 78 : 22,
              y: 58,
            })
          }
        >
          <svg viewBox="0 0 300 240" aria-hidden="true">
            {scene === 0 && (
              <g className="world-sign-object">
                <ellipse cx="136" cy="229" rx="100" ry="9" fill="#292632" opacity=".25" />
                <path d="M130 85V228" stroke="#5d4144" strokeWidth="15" />
                <path
                  d="M28 62H226L275 110 226 158H28Z"
                  fill="#f3d49b"
                  stroke="#82544d"
                  strokeWidth="3"
                />
                <path
                  d="M38 73H221L259 110 222 148H38Z"
                  fill="none"
                  stroke="#b47a5e"
                  strokeWidth="1"
                />
                <text x="57" y="102" fill="#49343c" fontSize="24" fontFamily="var(--font-poster)">
                  YOUR NEXT STOP
                </text>
                <text x="57" y="130" fill="#49343c" fontSize="20">
                  Plan a route ↗
                </text>
                <path d="M145 168h-100l-25 22 25 22H145Z" fill="#963d49" />
                <text x="45" y="195" fill="#f5e5c8" fontSize="14">
                  WALK YOUR WAY
                </text>
              </g>
            )}
            {scene === 1 && (
              <g className="world-map-object">
                <ellipse cx="150" cy="225" rx="115" ry="11" fill="#292632" opacity=".25" />
                <path
                  d="M20 73L103 44 186 73 270 44V196L186 225 103 196 20 225Z"
                  fill="#f0d9ad"
                  stroke="#8d6855"
                  strokeWidth="3"
                />
                <path d="M103 44V196L186 225V73Z" fill="#dfbd8a" />
                <path
                  d="M24 123Q78 92 106 125T184 139T266 92M65 58Q92 121 56 214M217 64Q190 133 231 209"
                  fill="none"
                  stroke="#b99878"
                  strokeWidth="6"
                />
                <path
                  className="object-route"
                  d="M59 179Q78 116 116 146T194 155Q222 149 230 113"
                  fill="none"
                  stroke="#a33b48"
                  strokeWidth="5"
                  strokeDasharray="7 5"
                />
                <circle cx="59" cy="179" r="7" fill="#a33b48" />
                <path
                  d="M230 87a13 13 0 0 1 13 13q0 12-13 25q-13-13-13-25a13 13 0 0 1 13-13Z"
                  fill="#a33b48"
                />
                <circle cx="230" cy="100" r="4" fill="#f5e7c9" />
                <path d="M58 13H247V52H58Z" fill="#302e39" />
                <text x="76" y="39" fill="#f4dfb8" fontSize="19" fontFamily="var(--font-poster)">
                  FIND YOUR ROUTE ↗
                </text>
              </g>
            )}
            {scene === 2 && (
              <g>
                <ellipse cx="150" cy="229" rx="132" ry="10" fill="#253630" opacity=".3" />
                <path
                  d="M35 227V91a115 80 0 0 1 230 0v136Z"
                  fill="#f2cc8b"
                  stroke="#38483f"
                  strokeWidth="10"
                />
                <path d="M56 225V94a94 63 0 0 1 188 0v131Z" fill="#d2926e" />
                <g className="circle-friends">
                  <path d="M79 199v-31q32-33 66 0v31Z" fill="#704c5c" />
                  <path d="M157 199v-31q32-33 62 0v31Z" fill="#6e8470" />
                  <path d="M91 133q-13-32 22-37q30 0 27 42l-8 14H94Z" fill="#433334" />
                  <path d="M99 122q15-20 29 0v24q-15 21-29 0Z" fill="#dca17f" />
                  <path d="M163 156q-10-64 24-65q34 3 34 65Z" fill="#efe1bd" />
                  <path d="M174 120q13-11 26 0v25q-13 15-26 0Z" fill="#bc7e65" />
                  <path d="M102 136h4m15 0h4m52-3h4m13 0h4" stroke="#4b3739" strokeWidth="2" />
                  <path
                    d="M108 146q6 4 11 0m61-2q7 4 11 0"
                    fill="none"
                    stroke="#8c4b4d"
                    strokeWidth="2"
                  />
                  <path d="M80 199H220" stroke="#aa6c52" strokeWidth="14" />
                </g>
                <path
                  className="circle-door"
                  d="M58 225V97q0-54 91-65V225Z"
                  fill="#42594d"
                  stroke="#f2cc8b"
                  strokeWidth="3"
                />
                <circle className="circle-door" cx="131" cy="143" r="5" fill="#efcf92" />
                <path d="M50 4H250V41H50Z" fill="#30483d" />
                <text x="75" y="29" fill="#f4e0bb" fontSize="22" fontFamily="var(--font-poster)">
                  THE CIRCLE ↗
                </text>
              </g>
            )}
            {scene === 3 && (
              <g className="world-book-object">
                <ellipse cx="150" cy="225" rx="130" ry="10" fill="#171e2c" opacity=".4" />
                <path
                  d="M20 48q65-20 130 14q65-34 130-14v157q-70-16-130 13q-60-29-130-13Z"
                  fill="#963e48"
                  stroke="#3b2e3e"
                  strokeWidth="5"
                />
                <path
                  className="book-left-page"
                  d="M30 38q65-12 120 23v144q-60-32-120-15Z"
                  fill="#f1dfb7"
                />
                <path
                  className="book-right-page"
                  d="M150 61q57-35 120-23v152q-62-17-120 15Z"
                  fill="#e7c99a"
                />
                <path
                  className="book-turn-page"
                  d="M150 61q57-35 120-23v152q-62-17-120 15Z"
                  fill="#f7e6c5"
                  opacity="0"
                />
                <path d="M150 62V208" stroke="#b68d70" strokeWidth="3" />
                <path
                  d="M51 79q35-3 73 15m-73 7q35-3 73 15m-73 7q35-3 73 15m-73 7q35-3 51 8M179 98q29-13 62-11m-62 32q29-13 62-11m-62 32q29-13 62-11"
                  fill="none"
                  stroke="#aa8669"
                  strokeWidth="3"
                />
                <path d="M200 49v37l13-13 12 9V41Z" fill="#a63f49" />
                <path d="M34 164Q150 188 266 164V201Q150 225 34 201Z" fill="#344351" />
                <text x="47" y="190" fill="#f2dfb7" fontSize="19" fontFamily="var(--font-poster)">
                  SAFETY LIBRARY ↗
                </text>
              </g>
            )}
          </svg>
          <span className="world-object-caption">{destination.hint}</span>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
