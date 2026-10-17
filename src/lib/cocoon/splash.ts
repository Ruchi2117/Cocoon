/**
 * Red ink splash: a celebratory scatter of droplets and a swipe streak from the
 * submit button. Call only from event handlers. Skipped for reduced motion.
 */
export function inkSplash(from?: Element | null) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const r = from?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
  const y = r ? r.top + r.height / 2 : window.innerHeight / 2;
  const root = document.createElement("div");
  root.className = "ink-splash";
  root.setAttribute("aria-hidden", "true");
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
  const blob = document.createElement("i");
  blob.className = "ink-blob";
  root.appendChild(blob);
  const swipe = document.createElement("i");
  swipe.className = "ink-swipe";
  root.appendChild(swipe);
  for (let k = 0; k < 22; k++) {
    const d = document.createElement("b");
    const a = (k / 22) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 60 + Math.random() * 150;
    const s = 6 + Math.random() * 16;
    d.style.setProperty("--dx", `${Math.cos(a) * dist}px`);
    d.style.setProperty("--dy", `${Math.sin(a) * dist}px`);
    d.style.setProperty("--s", `${s}px`);
    d.style.setProperty("--delay", `${Math.random() * 80}ms`);
    root.appendChild(d);
  }
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 1400);
}
