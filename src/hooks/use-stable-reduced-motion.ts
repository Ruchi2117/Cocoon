import { useSyncExternalStore } from "react";
import { useReducedMotion as useMotionPreference } from "motion/react";

const subscribe = () => () => {};
/** true only after hydration; works outside a router (tests, isolated renders). */
function useIsClientAfterHydration() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Reduced-motion preference that is `false` on the server and the first client
 * render, then reflects the user's setting after hydration. Prevents SSR/client
 * markup mismatches (aria-pressed, disabled, initial transforms, branch choice).
 */
export function useReducedMotion(): boolean {
  const hydrated = useIsClientAfterHydration();
  const preference = useMotionPreference();
  return hydrated && !!preference;
}
