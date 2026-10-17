import type { SessionPhase } from "@/lib/cocoon/browser-session";
import { Button } from "@/components/ui/button";
/** Lantern moth gestures follow call states, never audio levels or unseen sensors. */
export function PresenceBuddy({
  phase,
  onInterrupt,
}: {
  phase: SessionPhase;
  onInterrupt?: () => void;
}) {
  return (
    <div className="lantern-buddy" data-phase={phase}>
      <Button
        variant="ghost"
        className="lantern-figure"
        disabled={phase !== "speaking"}
        onClick={onInterrupt}
        aria-label={phase === "speaking" ? "Stop companion speaking" : "Lantern moth companion"}
        title={phase === "speaking" ? "Stop speaking" : "Lantern moth"}
      >
        <svg viewBox="0 0 440 370" aria-hidden="true">
          <circle className="lantern-halo" cx="220" cy="240" r="150" />
          <path className="lantern-thread" d="M220 0v57m-14 0h28m-14 0v20" />
          <g className="moth-body">
            <g className="moth-wing moth-wing-left">
              <path className="wing-outer" d="M189 168C155 98 54 68 51 117c-4 75 46 140 133 127Z" />
              <path className="wing-inner" d="M176 177c-48-53-90-53-94-38-5 26 36 79 83 77Z" />
              <path className="wing-vein" d="m65 121 110 84m-75-96 82 81m-99-9 83 38" />
              <path className="wing-eye" d="M94 140q16-28 40 0-13 27-40 0Z" />
            </g>
            <g className="moth-wing moth-wing-right">
              <path
                className="wing-outer"
                d="M251 168C285 98 386 68 389 117c4 75-46 140-133 127Z"
              />
              <path className="wing-inner" d="M264 177c48-53 90-53 94-38 5 26-36 79-83 77Z" />
              <path className="wing-vein" d="m375 121-110 84m75-96-82 81m99-9-83 38" />
              <path className="wing-eye" d="M346 140q-16-28-40 0 13 27 40 0Z" />
            </g>
            <path className="moth-antenna" d="M197 118q-34-41-27-56m73 56q34-41 27-56" />
            <path
              className="moth-antenna-leaf"
              d="M171 80q-34-17-22-38 24 6 22 38m98 0q34-17 22-38-24 6-22 38"
            />
            <path className="moth-shell" d="M163 154q0-50 57-50t57 50v70q0 56-57 56t-57-56Z" />
            <path className="moth-crown" d="M170 145q50-35 100 0l-6 19h-88Z" />
            <rect className="moth-face" x="181" y="159" width="78" height="45" rx="20" />
            <g className="moth-eyes">
              <path d="M194 180q5-6 10 0m32 0q5-6 10 0" />
            </g>
            <path className="moth-smile" d="M214 190q6 5 12 0" />
            <path className="lantern-window" d="M181 215h78v27q-39 34-78 0Z" />
            <path className="lantern-rib" d="M197 216v39m23-39v48m23-48v39m-69-22h92" />
            <path className="moth-feet" d="M204 278l-7 19m39-19 7 19m-46 0h-11m57 0h11" />
          </g>
          <path className="lantern-pool" d="M110 331q110-19 220 0m-190 10q80-12 160 0" />
        </svg>
      </Button>
    </div>
  );
}
