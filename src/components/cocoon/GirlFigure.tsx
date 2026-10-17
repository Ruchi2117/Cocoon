import { useId, type MouseEvent } from "react";
import { motion, type MotionValue } from "motion/react";
export type GirlPose = "phone" | "call" | "calm";
export function GirlFigure({
  active,
  offset,
  pose = "phone",
  lookBack = 0,
  walking = false,
  confidence = 0,
  gaze,
  phoneHref,
  onPhoneClick,
}: {
  active: boolean;
  offset?: MotionValue<number>;
  pose?: GirlPose;
  lookBack?: number;
  walking?: boolean;
  confidence?: number;
  gaze?: MotionValue<number>;
  phoneHref?: string;
  onPhoneClick?: (event: MouseEvent<Element>) => void;
}) {
  const id = useId().replaceAll(":", "");
  const loop = {
    repeat: active ? Infinity : 0,
    duration: active ? (pose === "calm" ? 6 : 5) : 0,
    ease: "easeInOut" as const,
  };
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-skin`} x2="1" y2="1">
          <stop stopColor="#f8d6ad" />
          <stop offset="1" stopColor="#da7e62" />
        </linearGradient>
        <pattern
          id={`${id}-coat`}
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-25)"
        >
          <rect width="22" height="22" fill="#242321" />
          <path d="M0 0V22" stroke="#efe5cf" strokeWidth="1" opacity=".3" />
        </pattern>
      </defs>
      <motion.g
        animate={
          active
            ? { y: [0, pose === "calm" ? -10 : -4, 0], scaleX: [1, pose === "calm" ? 1.018 : 1, 1] }
            : { y: 0, scaleX: 1 }
        }
        style={{ transformOrigin: "435px 760px" }}
        transition={loop}
      >
        <motion.g style={active && offset ? { y: offset } : {}}>
          <path d="M235 760Q225 560 383 530L470 515Q615 530 681 760" fill={`url(#${id}-coat)`} />
          <path d="M385 527L393 452H481L488 530 447 583Z" fill={`url(#${id}-skin)`} />
          <motion.g
            animate={{
              rotate: walking
                ? -lookBack * 22 - confidence * 3
                : pose === "call"
                  ? 3
                  : pose === "calm"
                    ? -3
                    : 0,
              x: -lookBack * 48,
              y: -confidence * 9,
              scaleX: 1 - lookBack * 0.28,
            }}
            transition={{ duration: walking ? 0 : active ? 0.7 : 0 }}
            style={{ transformOrigin: "435px 470px" }}
          >
            <path
              d="M307 352Q277 206 356 177Q393 117 476 160Q567 181 558 324L533 468 478 490 336 451Z"
              fill="#272423"
            />
            <path
              d="M355 270Q354 221 426 217Q493 212 516 275L508 400Q490 469 442 483Q384 460 358 404Z"
              fill={`url(#${id}-skin)`}
            />
            <path
              d="M337 317Q331 224 380 201Q445 169 509 225L529 325Q481 277 457 238Q417 281 337 317Z"
              fill="#272423"
            />
            <path
              d="M369 329Q388 324 406 329M461 329Q478 324 496 329"
              fill="none"
              stroke="#3e2929"
              strokeWidth="7"
            />
            <motion.g
              style={{ transformOrigin: "435px 351px" }}
              animate={
                pose === "calm"
                  ? { scaleY: 0.08 }
                  : active
                    ? { scaleY: [1, 1, 1, 0.08, 1, 1] }
                    : { scaleY: 1 }
              }
              transition={{
                repeat: active ? Infinity : 0,
                duration: active ? 5 : 0,
                times: [0, 0.7, 0.74, 0.77, 0.8, 1],
              }}
            >
              <path
                d="M369 351Q388 337 408 350Q390 367 369 351M458 350Q477 337 496 352Q477 368 458 350"
                fill="#f7edda"
              />
              <motion.ellipse
                style={gaze ? { x: gaze } : {}}
                cx={392 - lookBack * 12}
                cy="351"
                rx="5"
                ry="8"
                fill="#272423"
              />
              <motion.ellipse
                style={gaze ? { x: gaze } : {}}
                cx={478 - lookBack * 12}
                cy="352"
                rx="5"
                ry="8"
                fill="#272423"
              />
            </motion.g>
            <path d="M437 350L425 392 443 396" fill="none" stroke="#ae6654" strokeWidth="3" />
            <path
              d={
                confidence > 0.5
                  ? "M408 418Q434 432 456 418Q435 446 408 418"
                  : "M408 423Q434 412 456 424Q435 441 408 423"
              }
              fill="#a72d3e"
            />
            <path d="M353 377Q341 372 345 395Q349 416 362 411" fill="#df9878" />
            <circle cx="356" cy="412" r="10" fill="none" stroke="#f9cd79" strokeWidth="4" />
          </motion.g>
          <path d="M369 502L446 550 499 493 533 552 448 613 346 552Z" fill="#d9363f" />
          <motion.path
            d="M450 563Q605 525 727 569L695 596Q588 558 473 599Z"
            fill="#ed9d78"
            animate={
              active
                ? {
                    d: [
                      "M450 563Q605 525 727 569L695 596Q588 558 473 599Z",
                      "M450 563Q604 568 735 535L715 567Q596 602 473 599Z",
                      "M450 563Q605 525 727 569L695 596Q588 558 473 599Z",
                    ],
                  }
                : { d: "M450 563Q605 525 727 569L695 596Q588 558 473 599Z" }
            }
            transition={loop}
          />
          <path
            d="M349 562L447 615 403 676 330 607M521 555L447 615 492 676 550 597"
            fill="none"
            stroke="#f0dfbd"
            strokeWidth="2"
          />
          {!walking && (
            <path
              d={
                pose === "call"
                  ? "M524 760L516 567Q496 482 515 422L540 408 557 430 542 496 593 760Z"
                  : "M524 760L539 662Q548 624 569 606L596 580 623 600 594 654 606 760"
              }
              fill={`url(#${id}-skin)`}
            />
          )}
          {!walking && (
            <motion.g
              animate={{ x: pose === "call" ? -52 : 0, y: pose === "call" ? -150 : 0 }}
              transition={{ duration: active ? 0.7 : 0 }}
            >
              <a
                href={phoneHref}
                onClick={onPhoneClick}
                className={phoneHref ? "world-guide-link" : undefined}
                aria-label={phoneHref ? "Talk to your AI companion" : undefined}
              >
                {phoneHref && (
                  <rect
                    x="530"
                    y="488"
                    width="230"
                    height="163"
                    fill="transparent"
                    pointerEvents="all"
                  />
                )}
                <g transform="rotate(13 590 608)">
                  <rect
                    x="566"
                    y="532"
                    width="57"
                    height="97"
                    rx="9"
                    fill="#f1e6ce"
                    stroke="#272423"
                    strokeWidth="5"
                  />
                  <rect x="574" y="545" width="41" height="65" rx="3" fill="#d9363f" />
                  <path d="M584 574Q595 556 605 574L595 593Z" fill="#f1e6ce" />
                  <circle cx="595" cy="618" r="3" fill="#272423" />
                </g>
                {phoneHref && (
                  <g className="world-phone-tag" transform="translate(539 493)">
                    <path d="M0 0H160V36H0Z" fill="#f5e8cb" />
                    <path d="M37 36L42 45 48 36" fill="#f5e8cb" />
                    <text x="12" y="24" fill="#302b35" fontSize="17" fontFamily="sans-serif">
                      AI companion ↗
                    </text>
                  </g>
                )}
              </a>
            </motion.g>
          )}
        </motion.g>
      </motion.g>
    </g>
  );
}
