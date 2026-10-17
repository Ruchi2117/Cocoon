import type { CSSProperties } from "react";

/**
 * Original illustrated profile picture for Circle demo members, generated
 * deterministically from an id so the same alias always looks the same.
 * Flat style matching Cocoon's home-page girl art. Decorative (aria-hidden).
 */
const SKIN = ["#f2c7a5", "#e3a982", "#c98a62", "#a96a45", "#8a5236", "#f5d2b8"];
const HAIR = ["#1d1517", "#3a2320", "#5b3424", "#2a1d2e", "#7a3b2a", "#14181f"];
const BG = ["#c7364a", "#e7c17b", "#7aa596", "#8d6fa8", "#e38a6a", "#4f6d8f", "#d9a3ad"];
const TOP = ["#2a2230", "#f3ece8", "#7aa596", "#c7364a", "#e7c17b", "#3d4f6b"];

function hash(id: string) {
  let n = 2166136261;
  for (const c of id) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return n;
}

export function CircleAvatar({ id, size = 44, className = "" }: { id: string; size?: number; className?: string }) {
  const n = hash(id);
  const pick = <T,>(arr: T[], shift: number) => arr[(n >>> shift) % arr.length];
  const skin = pick(SKIN, 0);
  const hair = pick(HAIR, 3);
  const bg = pick(BG, 6);
  const top = pick(TOP, 9);
  const style = (n >>> 12) % 6; // hair style
  const acc = (n >>> 15) % 4; // 0 none, 1 bindi, 2 earrings, 3 glasses
  const delay = `${((n >>> 18) % 40) / 10}s`;
  return (
    <span
      className={`cav ${className}`}
      style={{ width: size, height: size, "--cav-delay": delay } as CSSProperties}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="32" fill={bg} />
        <g className="cav-figure">
          {/* hair behind */}
          {style === 1 && <path d="M14 34c0-14 8-22 18-22s18 8 18 22v22H14z" fill={hair} />}
          {style === 3 && <path d="M15 30c0-12 7-19 17-19s17 7 17 19c0 8 3 14 6 20H9c3-6 6-12 6-20z" fill={hair} />}
          {style === 4 && (
            <g fill={hair}>
              <circle cx="18" cy="26" r="7" />
              <circle cx="46" cy="26" r="7" />
              <circle cx="20" cy="38" r="7" />
              <circle cx="44" cy="38" r="7" />
            </g>
          )}
          {style === 5 && <path d="M44 30c6 4 7 14 3 22l-5-2c3-6 3-12-1-16z" fill={hair} />}
          {/* shoulders + neck */}
          <path d="M10 64c2-11 11-16 22-16s20 5 22 16z" fill={top} />
          <rect x="27" y="38" width="10" height="12" rx="4" fill={skin} />
          <path d="M26 48c2 3 4 4 6 4s4-1 6-4" fill="none" stroke="#00000022" strokeWidth="1.5" />
          {/* face */}
          <ellipse cx="32" cy="29" rx="12" ry="13.5" fill={skin} />
          {/* hair front */}
          {style === 0 && <path d="M19 30c-2-12 5-19 13-19s15 6 13 19c-4-6-9-9-15-9-3 3-7 6-11 9z" fill={hair} />}
          {style === 1 && <path d="M20 28c0-9 5-15 12-15s12 6 12 15c-6-2-10-6-12-10-2 4-6 8-12 10z" fill={hair} />}
          {style === 2 && (
            <g fill={hair}>
              <circle cx="32" cy="12" r="6.5" />
              <path d="M20 28c0-9 5-14 12-14s12 5 12 14c-5-4-9-6-12-6s-7 2-12 6z" />
            </g>
          )}
          {style === 3 && <path d="M20 27c1-8 6-13 12-13s11 5 12 13c-4-4-8-5-12-5s-8 1-12 5z" fill={hair} />}
          {style === 4 && <path d="M19 27c0-10 6-15 13-15s13 5 13 15c-3-3-8-5-13-5s-10 2-13 5z" fill={hair} />}
          {style === 5 && <path d="M20 29c0-10 5-16 12-16s13 5 13 15c-7 0-14-3-18-8-1 4-3 7-7 9z" fill={hair} />}
          {/* face details */}
          <g className="cav-eyes" fill="#1d1517">
            <ellipse cx="27.5" cy="30" rx="1.5" ry="1.8" />
            <ellipse cx="36.5" cy="30" rx="1.5" ry="1.8" />
          </g>
          <circle cx="24.5" cy="34.5" r="2.2" fill="#e5737355" />
          <circle cx="39.5" cy="34.5" r="2.2" fill="#e5737355" />
          <path className="cav-mouth" d="M29 36.5q3 2.6 6 0" fill="none" stroke="#7a2e2e" strokeWidth="1.4" strokeLinecap="round" />
          {acc === 1 && <circle cx="32" cy="24.5" r="1.1" fill="#c7364a" />}
          {acc === 2 && (
            <g fill="#e7c17b">
              <circle cx="20.3" cy="35" r="1.6" />
              <circle cx="43.7" cy="35" r="1.6" />
            </g>
          )}
          {acc === 3 && (
            <g fill="none" stroke="#2a2230" strokeWidth="1.2">
              <circle cx="27.5" cy="30" r="3.6" />
              <circle cx="36.5" cy="30" r="3.6" />
              <path d="M31.1 30h1.8" />
            </g>
          )}
        </g>
      </svg>
    </span>
  );
}
