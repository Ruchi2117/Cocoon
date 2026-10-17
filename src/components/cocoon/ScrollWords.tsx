import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useReducedMotion } from "@/hooks/use-stable-reduced-motion";
function RevealWord({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / (total + 2),
    end = (index + 2) / (total + 2);
  const opacity = useTransform(progress, [start, end], [0.48, 1]);
  const y = useTransform(progress, [start, end], [5, 0]);
  return (
    <motion.span className="scroll-reveal-word" style={{ opacity, y }}>
      {word}
    </motion.span>
  );
}
/** Text stays selectable and exposed once to assistive technology; scroll only adds emphasis. */
export function ScrollWords({ text }: { text: string }) {
  const reduced = useReducedMotion();
  return reduced ? <span>{text}</span> : <AnimatedWords text={text} />;
}
function AnimatedWords({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 95%", "end 65%"] });
  const words = text.split(/\s+/);
  return (
    <span ref={ref} className="scroll-reveal-text">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <span key={`${index}-${word}`}>
            <RevealWord word={word} index={index} total={words.length} progress={scrollYProgress} />
            {index < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </span>
  );
}
