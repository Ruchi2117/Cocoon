// Server-safe total deadline for private database reads/RPCs. Never retries.
export const PRIVATE_REQUEST_MS = 12_000;

export class PrivateDeadlineError extends Error {
  constructor() {
    super("Private request deadline exceeded");
    this.name = "PrivateDeadlineError";
  }
}

/**
 * Runs `run` once with an AbortSignal and settles within `ms` even if the
 * returned promise ignores the signal. Late results/rejections are swallowed.
 */
export async function withPrivateDeadline<T>(
  run: (signal: AbortSignal) => PromiseLike<T>,
  ms: number = PRIVATE_REQUEST_MS,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const work = Promise.resolve().then(() => run(controller.signal));
  work.catch(() => undefined); // late rejection after timeout must not be unhandled
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new PrivateDeadlineError());
    }, ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/** Runs a mutation once; any failure (including timeout) becomes an honest, generic message. */
export async function privateMutation<T>(
  run: (signal: AbortSignal) => PromiseLike<{ data: T; error: unknown }>,
  message: string,
): Promise<T> {
  let result: { data: T; error: unknown };
  try {
    result = await withPrivateDeadline(run);
  } catch {
    throw new Error(message);
  }
  if (result.error) throw new Error(message);
  return result.data;
}

/** Runs a read once; any failure fails closed with a generic message. */
export async function privateRead<T>(
  run: (signal: AbortSignal) => PromiseLike<{ data: T; error: unknown }>,
  message: string,
): Promise<T> {
  return privateMutation(run, message);
}

export const MAY_HAVE_SAVED =
  "Confirmation unavailable: this may or may not have saved. Refresh current status before starting a new request.";
