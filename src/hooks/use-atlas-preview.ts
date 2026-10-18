import { useCallback, useEffect, useRef } from "react";

/** Pointer dwell is optional; explicit selections always supersede pending work. */
export function useAtlasPreview(enabled: boolean, commit: (label: string) => void) {
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => {
    clearTimeout(pending.current);
    pending.current = undefined;
  }, []);
  useEffect(() => cancel, [enabled, cancel]);

  const select = (label: string) => {
    cancel();
    commit(label);
  };
  const schedule = (label: string) => {
    cancel();
    if (!enabled) return;
    pending.current = setTimeout(() => {
      pending.current = undefined;
      commit(label);
    }, 120);
  };
  return { cancel, select, schedule };
}
