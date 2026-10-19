import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const b: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    b.middleware = () => b;
    b.inputValidator = (v: unknown) => ((b.validator = v), b);
    b.handler = (h: (a: unknown) => unknown) => (a: unknown) => h(a);
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

import { PrivateDeadlineError, withPrivateDeadline } from "./private-deadline";
import { inappAccountData, inviteInAppGuardian, submitInAppSOS } from "./inapp.functions";
import { readPrivateJourneys, writePrivateJourney } from "./journey.functions";

afterEach(() => {
  vi.useRealTimers();
});

describe("withPrivateDeadline", () => {
  it("returns fast success and clears its timer", async () => {
    vi.useFakeTimers();
    await expect(withPrivateDeadline(async () => 7)).resolves.toBe(7);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("propagates fast errors and clears its timer", async () => {
    vi.useFakeTimers();
    await expect(withPrivateDeadline(async () => Promise.reject(new Error("x")))).rejects.toThrow(
      "x",
    );
    expect(vi.getTimerCount()).toBe(0);
  });
  it("aborts and settles at the deadline even for an uncooperative promise, once, swallowing late rejection", async () => {
    vi.useFakeTimers();
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    let seen: AbortSignal | undefined;
    let lateReject: ((e: Error) => void) | undefined;
    const run = vi.fn((signal: AbortSignal) => {
      seen = signal;
      return new Promise<number>((_, rej) => (lateReject = rej));
    });
    const p = withPrivateDeadline(run, 12_000);
    const settled = expect(p).rejects.toBeInstanceOf(PrivateDeadlineError);
    await vi.advanceTimersByTimeAsync(11_999);
    expect(seen?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await settled;
    expect(seen?.aborted).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    lateReject?.(new Error("late"));
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 10));
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

function rpcClient(result: { data: unknown; error: unknown } | "hang") {
  const signals: AbortSignal[] = [];
  const rpc = vi.fn(() => ({
    abortSignal: (s: AbortSignal) => {
      signals.push(s);
      return result === "hang" ? new Promise(() => {}) : Promise.resolve(result);
    },
  }));
  return { supabase: { rpc }, rpc, signals };
}
const UID = "10101010-1010-4010-8010-101010101010";
const KEY = "30303030-3030-4030-8030-303030303030";
const REC = "40404040-4040-4040-8040-404040404040";
const content = {
  introduction: "",
  helpInstructions: "",
  includeDraft: false,
  senderName: "Synthetic",
  preparedAt: "2026-10-17T19:00:00.000Z",
};
type Call = (a: unknown) => Promise<unknown>;

describe("private server functions", () => {
  it("SOS forwards exact key/payload once with an abort signal and reports ambiguity honestly", async () => {
    const c = rpcClient({ data: null, error: { message: "db secret detail" } });
    const data = {
      requestKey: KEY,
      recipientIds: [REC],
      channel: "in_app",
      note: "n",
      location: null,
      locationConsent: false,
      content,
    };
    const err = await (submitInAppSOS as unknown as Call)({
      data,
      context: { supabase: c.supabase, userId: UID },
    }).catch((e: Error) => e);
    expect(c.rpc).toHaveBeenCalledTimes(1);
    expect(c.rpc).toHaveBeenCalledWith("send_inapp_sos_snapshot", {
      p_request: KEY,
      p_recipients: [REC],
      p_note: "n",
      p_location: null,
      p_location_consent: false,
      p_content: content,
    });
    expect(c.signals[0]).toBeInstanceOf(AbortSignal);
    expect((err as Error).message).toMatch(/may have been saved/);
    expect((err as Error).message).not.toMatch(/not saved|secret/);
  });

  it("journey write times out without retry and says it may have saved", async () => {
    vi.useFakeTimers();
    const c = rpcClient("hang");
    const p = (writePrivateJourney as unknown as Call)({
      data: {
        requestKey: KEY,
        action: "check_in",
        journeyId: KEY,
        location: null,
        locationConsent: false,
      },
      context: { supabase: c.supabase, userId: UID },
    });
    const settled = expect(p).rejects.toThrow(/may have saved/);
    await vi.advanceTimersByTimeAsync(12_000);
    await settled;
    expect(c.rpc).toHaveBeenCalledTimes(1);
    expect(c.rpc.mock.calls[0]).toEqual([
      "write_private_journey",
      {
        p_request: KEY,
        p_payload: { action: "check_in", journeyId: KEY, location: null, locationConsent: false },
      },
    ]);
    expect(c.signals[0]?.aborted).toBe(true);
  });

  it("journey read fails closed on error", async () => {
    const c = rpcClient({ data: null, error: { code: "x" } });
    await expect(
      (readPrivateJourneys as unknown as Call)({
        data: { guardian: true },
        context: { supabase: c.supabase, userId: UID },
      }),
    ).rejects.toThrow("Private journeys unavailable. Refresh to retry.");
  });

  it("invite failure does not return a token or retry", async () => {
    const c = rpcClient({ data: null, error: { message: "x" } });
    await expect(
      (inviteInAppGuardian as unknown as Call)({
        data: { name: "Synthetic", email: "synthetic@example.test" },
        context: { supabase: c.supabase, userId: UID },
      }),
    ).rejects.toThrow(/may have been created. Refresh/);
    expect(c.rpc).toHaveBeenCalledTimes(1);
  });

  it("concurrent account reads both get abort signals and fail closed if one fails", async () => {
    const signals: AbortSignal[] = [];
    const chain = (result: unknown) => {
      const b: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      for (const m of ["select", "eq", "order", "limit"]) b[m] = () => b;
      b.abortSignal = (s: AbortSignal) => (signals.push(s), Promise.resolve(result));
      return b;
    };
    const from = vi.fn((t: string) =>
      chain(
        t === "inapp_alerts" ? { data: null, error: { message: "x" } } : { data: [], error: null },
      ),
    );
    await expect(
      (inappAccountData as unknown as Call)({ context: { supabase: { from }, userId: UID } }),
    ).rejects.toThrow("In-app account data unavailable. Refresh to retry.");
    expect(from).toHaveBeenCalledTimes(2);
    expect(signals).toHaveLength(2);
  });
});
