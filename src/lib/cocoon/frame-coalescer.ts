/** Keeps only the latest input and runs it at most once per animation frame. */
export function createFrameCoalescer<T>(run: (latest: T) => void) {
  let frame = 0;
  let latest: T | undefined;
  let pending = false;
  return {
    schedule(value: T) {
      latest = value;
      if (pending) return;
      pending = true;
      frame = requestAnimationFrame(() => {
        pending = false;
        frame = 0;
        run(latest as T);
      });
    },
    cancel() {
      if (pending) cancelAnimationFrame(frame);
      pending = false;
      frame = 0;
      latest = undefined;
    },
  };
}
