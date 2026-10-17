import { useEffect, useRef, type ReactNode } from "react";

/** Let the shorter column follow the reader; tall panels can scroll to their bottom first. */
export function BalancedColumns({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let panels = Array.from(root.children) as HTMLElement[];
    const measure = () => {
      const heights = panels.map((p) => p.getBoundingClientRect().height);
      const shortest = Math.min(...heights),
        longest = Math.max(...heights);
      panels.forEach((p, i) => {
        p.dataset["balancedAnchor"] = String(heights[i] === shortest && longest - shortest > 100);
        p.style.setProperty("--panel-height", `${heights[i]}px`);
      });
    };
    const observer = new ResizeObserver(measure);
    panels.forEach((p) => observer.observe(p));
    const changes = new MutationObserver(() => {
      observer.disconnect();
      panels = Array.from(root.children) as HTMLElement[];
      panels.forEach((p) => observer.observe(p));
      measure();
    });
    changes.observe(root, { childList: true });
    measure();
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      changes.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return (
    <div ref={ref} className={`balanced-columns ${className}`}>
      {children}
    </div>
  );
}
