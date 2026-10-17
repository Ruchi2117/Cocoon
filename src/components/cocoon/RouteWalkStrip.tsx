/**
 * Decorative illustrated walk strip for the Route explorer: a little walker
 * strolls a winding path past lamps, trees and a chai stall toward the chosen
 * destination. Purely illustrative — not a map, not a route, not a rating.
 */
const PATH = "M40 118 C 160 118, 190 60, 300 66 S 470 128, 580 104 S 760 40, 880 70 S 1010 112, 1060 92";

export function RouteWalkStrip({ to }: { to: string }) {
  const short = to.split(",")[0];
  return (
    <div className="route-walk-strip" aria-hidden="true">
      <svg viewBox="0 0 1100 160" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
        {/* skyline + moon */}
        <g className="rws-sky">
          <circle cx="990" cy="34" r="16" className="rws-moon" />
          <circle cx="160" cy="26" r="2" className="rws-star" />
          <circle cx="420" cy="18" r="1.6" className="rws-star rws-d2" />
          <circle cx="700" cy="30" r="2" className="rws-star rws-d3" />
          <circle cx="860" cy="14" r="1.4" className="rws-star" />
        </g>
        <path
          d="M0 150 L0 112 L50 112 L50 92 L92 92 L92 120 L230 120 L230 100 L262 100 L262 124 L620 124 L620 98 L660 98 L660 84 L700 84 L700 126 L1100 126 L1100 150 Z"
          className="rws-city"
        />
        {/* path */}
        <path d={PATH} className="rws-road" />
        <path d={PATH} className="rws-trail" />
        {/* lamps */}
        {[
          [250, 72],
          [520, 112],
          [810, 54],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="16" cy="-34" className={`rws-glow rws-d${i + 1}`} />
            <line y1="0" y2="-32" className="rws-pole" />
            <circle r="4" cy="-34" className="rws-bulb" />
          </g>
        ))}
        {/* trees */}
        {[
          [120, 110, 1],
          [400, 92, 0.8],
          [690, 92, 1.1],
          [960, 96, 0.85],
        ].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`} className="rws-tree">
            <rect x="-2" y="-6" width="4" height="14" className="rws-pole-fill" />
            <ellipse cy="-18" rx="14" ry="16" className="rws-leaf" />
          </g>
        ))}
        {/* chai stall */}
        <g transform="translate(600 104)">
          <rect x="-18" y="-22" width="36" height="20" rx="3" className="rws-stall" />
          <path d="M-22 -22 L22 -22 L16 -32 L-16 -32 Z" className="rws-awning" />
          <path d="M-4 -40 q 4 -6 0 -12 M4 -40 q 4 -6 0 -12" className="rws-steam" />
        </g>
        {/* start + destination pins */}
        <g transform="translate(40 118)">
          <circle r="7" className="rws-start" />
        </g>
        <g transform="translate(1060 92)" className="rws-pin">
          <path d="M0 0 C -12 -14, -12 -30, 0 -30 C 12 -30, 12 -14, 0 0 Z" className="rws-pin-fill" />
          <circle cy="-20" r="4" className="rws-pin-dot" />
        </g>
        {/* walker */}
        <g className="rws-walker" style={{ offsetPath: `path("${PATH}")` }}>
          <g transform="translate(0 -26)">
            <ellipse cy="26" rx="8" ry="2" className="rws-shadow" />
            <path d="M-6 -6 Q 0 -10 6 -6 L 8 12 L -8 12 Z" className="rws-kurta" />
            <circle cy="-12" r="6" className="rws-skin" />
            <path d="M-6 -13 Q 0 -22 6 -13 Q 8 -4 4 -2 Q 6 -12 0 -15 Q -6 -12 -4 -2 Q -8 -4 -6 -13 Z" className="rws-hair" />
            <line x1="-3" y1="12" x2="-4" y2="24" className="rws-leg rws-leg-a" />
            <line x1="3" y1="12" x2="4" y2="24" className="rws-leg rws-leg-b" />
            <path d="M6 -4 L 12 4" className="rws-leg" />
          </g>
        </g>
      </svg>
      <p className="rws-label">
        <span>walking to</span> {short}
      </p>
    </div>
  );
}
