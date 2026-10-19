import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bindLiveConnection,
  type LiveConnector,
  type LiveDeps,
  type LiveSocket,
} from "./live-relay.server";

vi.mock("@/integrations/supabase/client.server", () => {
  throw new Error("Real database access forbidden in relay tests");
});

function socket() {
  const handlers: {
    message: ((d: unknown) => void)[];
    close: (() => void)[];
    error: (() => void)[];
  } = { message: [], close: [], error: [] };
  const sent: string[] = [];
  const s: LiveSocket & { sent: string[]; push(d: unknown): void; state: number } = {
    state: 1,
    get readyState() {
      return s.state;
    },
    sent,
    send: (d) => void sent.push(d),
    close: () => {
      s.state = 3;
    },
    onMessage: (h) => void handlers.message.push(h),
    onClose: (h) => void handlers.close.push(h),
    onError: (h) => void handlers.error.push(h),
    push: (d) => handlers.message.forEach((h) => h(typeof d === "string" ? d : JSON.stringify(d))),
  };
  return s;
}
const context = {
  mode: "pretend",
  alias: "Didi",
  relationship: "sister",
  voice: "marin",
  language: "en",
  ride: null,
  arrival: null,
  etaMinutes: null,
  safeWord: null,
  audioConsent: true,
  roleplayAck: true,
  ageAck: true,
};
const config = { baseURL: "https://gateway.test", key: "mock-key", liveModel: "openai/gpt-live-1" };
function setup(over: Partial<LiveDeps> = {}, clientKey?: string) {
  const browser = socket();
  const gateway = socket();
  const tasks: Promise<unknown>[] = [];
  const connect = vi.fn<LiveConnector>(async () => gateway);
  const deps: LiveDeps = {
    authenticate: vi.fn(async (t: string) => (t === "good" ? { userId: "u1" } : null)),
    reserve: vi.fn(async () => ({ id: "slot-1" })),
    release: vi.fn(async () => {}),
    limitSeconds: 300,
    ...over,
  };
  bindLiveConnection(
    browser,
    config,
    { waitUntil: (p) => void tasks.push(p) },
    connect,
    deps,
    clientKey,
  );
  const flush = async () => {
    for (let i = 0; i < 5; i++) await Promise.all(tasks.splice(0));
  };
  return { browser, gateway, connect, deps, flush };
}
const types = (s: { sent: string[] }) => s.sent.map((d) => JSON.parse(d).type as string);
afterEach(() => vi.useRealTimers());

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
async function settleMicrotasks() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("overall startup deadline (injected dependencies only)", () => {
  it("times out pending guest hashing without starting a late reservation", async () => {
    vi.useFakeTimers();
    const hash = deferred<ArrayBuffer>();
    const digest = vi.spyOn(crypto.subtle, "digest").mockReturnValue(hash.promise);
    try {
      const reserveGuest = vi.fn(async () => ({ id: "g1" }));
      const t = setup({ reserveGuest, releaseGuest: vi.fn(async () => {}) }, "203.0.113.9");
      t.browser.push({ type: "app.start", sdp: "v=0", token: "", context });
      await vi.advanceTimersByTimeAsync(40_000);
      expect(t.browser.state).toBe(3);
      hash.resolve(new ArrayBuffer(32));
      await t.flush();
      expect(reserveGuest).not.toHaveBeenCalled();
      expect(t.connect).not.toHaveBeenCalled();
    } finally {
      digest.mockRestore();
    }
  });

  it("rejects late gateway startup events while draining after the deadline", async () => {
    vi.useFakeTimers();
    const t = setup();
    t.browser.push({ type: "app.start", sdp: "v=0", token: "good", context });
    await t.flush();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(t.connect.mock.calls[0]?.[2]?.aborted).toBe(true);
    expect(types(t.gateway)).toContain("session.close");
    const count = t.browser.sent.length;
    t.gateway.push({ type: "gateway.session.created", session: { id: "too-late" } });
    expect(t.browser.sent).toHaveLength(count);
    await vi.advanceTimersByTimeAsync(15_000);
    await t.flush();
    expect(t.deps.release).toHaveBeenCalledExactlyOnceWith("slot-1", "failed");
    expect(t.browser.state).toBe(3);
  });

  it("times out hung authentication at 40s and never reserves after late authentication", async () => {
    vi.useFakeTimers();
    const auth = deferred<{ userId: string }>();
    const t = setup({ authenticate: vi.fn(() => auth.promise) });
    t.browser.push({ type: "app.start", sdp: "v=0", token: "good", context });
    await vi.advanceTimersByTimeAsync(39_999);
    expect(t.browser.state).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(t.browser.state).toBe(3);
    expect(t.browser.sent.join()).toMatch(/Voice startup timed out/);
    auth.resolve({ userId: "u1" });
    await t.flush();
    expect(t.deps.reserve).not.toHaveBeenCalled();
    expect(t.connect).not.toHaveBeenCalled();
  });

  for (const guest of [false, true]) {
    for (const cancelled of [false, true]) {
      it(`releases a late ${guest ? "guest" : "account"} slot once after ${cancelled ? "cancellation" : "deadline"}`, async () => {
        vi.useFakeTimers();
        const slot = deferred<{ id: string }>();
        const reserve = vi.fn(() => slot.promise);
        const release = vi.fn(async () => {});
        // Hashing is synthetic; no address or network leaves this test.
        const digest = vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));
        try {
          const t = setup(
            guest ? { reserveGuest: reserve, releaseGuest: release } : { reserve, release },
            "203.0.113.9",
          );
          t.browser.push({ type: "app.start", sdp: "v=0", token: guest ? "" : "good", context });
          await settleMicrotasks();
          expect(reserve).toHaveBeenCalledTimes(1);
          if (cancelled) t.browser.push({ type: "session.close" });
          else await vi.advanceTimersByTimeAsync(40_000);
          expect(t.browser.state).toBe(3);
          slot.resolve({ id: "late-slot" });
          await t.flush();
          t.browser.push({ type: "session.close" });
          await t.flush();
          expect(release).toHaveBeenCalledExactlyOnceWith("late-slot", "failed");
          expect(t.connect).not.toHaveBeenCalled();
          if (guest) expect(t.deps.release).not.toHaveBeenCalled();
        } finally {
          digest.mockRestore();
        }
      });
    }
  }

  it("does not reset the deadline after reservation and aborts/closes a delayed connector", async () => {
    vi.useFakeTimers();
    const slot = deferred<{ id: string }>();
    const connector = deferred<LiveSocket>();
    const t = setup({ reserve: vi.fn(() => slot.promise) });
    t.connect.mockImplementationOnce(() => connector.promise as Promise<typeof t.gateway>);
    t.browser.push({ type: "app.start", sdp: "v=0", token: "good", context });
    await vi.advanceTimersByTimeAsync(30_000);
    slot.resolve({ id: "slow-slot" });
    await settleMicrotasks();
    expect(t.connect).toHaveBeenCalledTimes(1);
    const signal = t.connect.mock.calls[0]?.[2];
    await vi.advanceTimersByTimeAsync(10_000);
    expect(signal?.aborted).toBe(true);
    expect(t.browser.state).toBe(3);
    connector.resolve(t.gateway);
    await t.flush();
    expect(t.gateway.state).toBe(3);
    expect(t.gateway.sent).toEqual([]);
    expect(t.deps.release).toHaveBeenCalledExactlyOnceWith("slow-slot", "failed");
  });

  it("cancellation aborts a pending connector without sending a late session.start", async () => {
    vi.useFakeTimers();
    const connector = deferred<LiveSocket>();
    const t = setup();
    t.connect.mockImplementationOnce(() => connector.promise as Promise<typeof t.gateway>);
    t.browser.push({ type: "app.start", sdp: "v=0", token: "good", context });
    await settleMicrotasks();
    t.browser.push({ type: "session.close" });
    expect(t.connect.mock.calls[0]?.[2]?.aborted).toBe(true);
    connector.resolve(t.gateway);
    await t.flush();
    expect(t.gateway.state).toBe(3);
    expect(t.gateway.sent).toEqual([]);
    expect(t.deps.release).toHaveBeenCalledExactlyOnceWith("slot-1", "failed");
  });

  it("clears the startup deadline only on successful gateway startup", async () => {
    vi.useFakeTimers();
    const t = setup();
    t.browser.push({ type: "app.start", sdp: "v=0", token: "good", context });
    await t.flush();
    await vi.advanceTimersByTimeAsync(39_000);
    t.gateway.push({ type: "gateway.session.created", session: { id: "s1" } });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(t.browser.state).toBe(1);
    expect(types(t.browser)).not.toContain("app.error");
    expect(t.deps.release).not.toHaveBeenCalled();
    t.browser.push({ type: "session.close" });
    t.gateway.push({ type: "session.closed" });
    await t.flush();
    expect(t.deps.release).toHaveBeenCalledExactlyOnceWith("slot-1", "closed");
  });
});

describe("live relay (mocked gateway, no real accounts or audio)", () => {
  it("refuses unauthenticated callers before reserving quota or contacting the gateway", async () => {
    const t = setup();
    t.browser.push({ type: "app.start", sdp: "v=0 offer", token: "bad", context });
    await t.flush();
    expect(t.connect).not.toHaveBeenCalled();
    expect(t.deps.reserve).not.toHaveBeenCalled();
    expect(t.browser.sent.join()).toMatch(/Sign in with a verified account/);
  });
  it("guest demo: refused when no guest quota exists, without contacting the gateway", async () => {
    const t = setup({}, "203.0.113.9");
    t.browser.push({ type: "app.start", sdp: "v=0", token: "", context });
    await t.flush();
    expect(t.connect).not.toHaveBeenCalled();
    expect(t.browser.sent.join()).toMatch(/Sign in/);
  });
  it("guest demo: reserves a hashed trusted-IP slot, never the raw address", async () => {
    const reserveGuest = vi.fn(async (_h: string) => ({ id: "g1" }));
    const t = setup(
      { reserveGuest, releaseGuest: vi.fn(async () => {}), guestLimitSeconds: 120 },
      "203.0.113.9",
    );
    t.browser.push({ type: "app.start", sdp: "v=0", token: "", context });
    await t.flush();
    const hash = reserveGuest.mock.calls[0]?.[0] ?? "";
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203.0.113.9");
    expect(t.deps.authenticate).not.toHaveBeenCalled();
    expect(t.deps.reserve).not.toHaveBeenCalled();
    expect(t.connect).toHaveBeenCalledTimes(1);
  });
  it("guest demo: stops at the guest cap without a paid session", async () => {
    const t = setup(
      {
        reserveGuest: vi.fn(async () => ({ error: "Demo calls are busy" })),
        releaseGuest: vi.fn(async () => {}),
      },
      "203.0.113.9",
    );
    t.browser.push({ type: "app.start", sdp: "v=0", token: "", context });
    await t.flush();
    expect(t.connect).not.toHaveBeenCalled();
    expect(t.browser.sent.join()).toMatch(/Demo calls are busy/);
  });
  it("missing trusted client key refuses empty-token guests even with a supplied identity", async () => {
    const reserveGuest = vi.fn(async () => ({ id: "g1" }));
    const t = setup({ reserveGuest, releaseGuest: vi.fn(async () => {}) });
    t.browser.push({ type: "app.start", sdp: "v=0", token: "", context, clientKey: "spoofed" });
    await t.flush();
    expect(reserveGuest).not.toHaveBeenCalled();
    expect(t.deps.authenticate).not.toHaveBeenCalled();
    expect(t.connect).not.toHaveBeenCalled();
    expect(t.browser.state).toBe(3);
  });
  it("nonempty invalid tokens never fall through to guest reservation", async () => {
    const reserveGuest = vi.fn(async () => ({ id: "g1" }));
    const t = setup({ reserveGuest, releaseGuest: vi.fn(async () => {}) }, "203.0.113.9");
    t.browser.push({ type: "app.start", sdp: "v=0", token: "bad", context });
    await t.flush();
    expect(reserveGuest).not.toHaveBeenCalled();
    expect(t.connect).not.toHaveBeenCalled();
  });
  it("guest pause-check rejection prevents provider traffic", async () => {
    const t = setup(
      {
        reserveGuest: vi.fn(async () => ({ error: "Live voice limits could not be checked" })),
        releaseGuest: vi.fn(async () => {}),
      },
      "203.0.113.9",
    );
    t.browser.push({ type: "app.start", sdp: "v=0", token: "", context });
    await t.flush();
    expect(t.connect).not.toHaveBeenCalled();
    expect(t.browser.state).toBe(3);
  });
  it("guest cutoff is 120 seconds and duplicate session-created events cannot extend it; releases once", async () => {
    vi.useFakeTimers();
    const releaseGuest = vi.fn(async () => {});
    const t = setup(
      { reserveGuest: vi.fn(async () => ({ id: "g1" })), releaseGuest, guestLimitSeconds: 120 },
      "203.0.113.9",
    );
    t.browser.push({ type: "app.start", sdp: "v=0", token: "", context });
    await t.flush();
    t.gateway.push({ type: "gateway.session.created", session: { id: "s1" } });
    await vi.advanceTimersByTimeAsync(119_000);
    expect(types(t.browser)).not.toContain("app.limit");
    t.gateway.push({ type: "gateway.session.created", session: { id: "s1" } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.browser.sent.map((v) => JSON.parse(v)).find((v) => v.type === "app.limit")).toEqual({
      type: "app.limit",
      seconds: 120,
    });
    expect(types(t.gateway)).toContain("session.close");
    // Provider close acknowledgement may never arrive: drain fallback still releases.
    await vi.advanceTimersByTimeAsync(15_000);
    await t.flush();
    t.gateway.push({ type: "session.closed" });
    await t.flush();
    expect(releaseGuest).toHaveBeenCalledExactlyOnceWith("g1", "closed");
    expect(t.deps.release).not.toHaveBeenCalled();
    expect(t.browser.state).toBe(3);
  });
  it("guest cancellation during reservation releases the late slot without connecting", async () => {
    let resolve: (slot: { id: string }) => void = () => {};
    const releaseGuest = vi.fn(async () => {});
    const t = setup(
      {
        reserveGuest: vi.fn(
          () =>
            new Promise<{ id: string }>((r) => {
              resolve = r;
            }),
        ),
        releaseGuest,
      },
      "203.0.113.9",
    );
    t.browser.push({ type: "app.start", sdp: "v=0", token: "", context });
    // Allow hashing to finish without awaiting the pending reservation.
    await new Promise((r) => setTimeout(r, 10));
    t.browser.push({ type: "session.close" });
    resolve({ id: "g1" });
    await t.flush();
    expect(releaseGuest).toHaveBeenCalledExactlyOnceWith("g1", "failed");
    expect(t.connect).not.toHaveBeenCalled();
  });
  it("guest provider refusal releases startup reservation exactly once", async () => {
    const releaseGuest = vi.fn(async () => {});
    const t = setup(
      { reserveGuest: vi.fn(async () => ({ id: "g1" })), releaseGuest },
      "203.0.113.9",
    );
    t.connect.mockRejectedValueOnce(new Error("Synthetic gateway refusal"));
    t.browser.push({ type: "app.start", sdp: "v=0", token: "", context });
    await t.flush();
    expect(releaseGuest).toHaveBeenCalledExactlyOnceWith("g1", "failed");
    expect(t.deps.release).not.toHaveBeenCalled();
  });
  it("refuses missing consent without authenticating or connecting", async () => {
    const t = setup();
    t.browser.push({
      type: "app.start",
      sdp: "v=0",
      token: "good",
      context: { ...context, audioConsent: false },
    });
    await t.flush();
    expect(t.deps.authenticate).not.toHaveBeenCalled();
    expect(t.connect).not.toHaveBeenCalled();
  });
  it("stops at the quota without a paid session", async () => {
    const t = setup({ reserve: vi.fn(async () => ({ error: "limit reached" })) });
    t.browser.push({ type: "app.start", sdp: "v=0", token: "good", context });
    await t.flush();
    expect(t.connect).not.toHaveBeenCalled();
    expect(t.browser.sent.join()).toMatch(/limit reached/);
  });
  it("starts with server-owned persona settings and never forwards the user token", async () => {
    const t = setup();
    t.browser.push({ type: "app.start", sdp: "v=0 offer", token: "good", context });
    await t.flush();
    const start = JSON.parse(t.gateway.sent[0] ?? "{}");
    expect(start.type).toBe("session.start");
    expect(start.session.model).toBe("openai/gpt-live-1");
    expect(start.session.audio.output.voice).toBe("marin");
    expect(start.session.delegation).toEqual({ type: "client" });
    expect(start.session.instructions).toMatch(/Didi, the caller's sister/);
    expect(t.gateway.sent.join()).not.toContain("good");
  });
  it("greets once after media is ready, answers delegations without backend calls, and enforces the hard stop", async () => {
    vi.useFakeTimers();
    const t = setup();
    t.browser.push({ type: "app.start", sdp: "v=0", token: "good", context });
    await t.flush();
    t.gateway.push({
      type: "gateway.session.created",
      session: { id: "s1" },
      transport: { type: "webrtc", sdp: "ans" },
    });
    t.browser.push({ type: "app.ready" });
    t.browser.push({ type: "gateway.heartbeat" });
    expect(types(t.gateway).filter((x) => x === "session.instructions.append")).toHaveLength(1);
    t.gateway.push({
      type: "session.delegation.created",
      delegation: { id: "d1", target: "client" },
    });
    t.gateway.push({
      type: "session.delegation.created",
      delegation: { id: "d1", target: "client" },
    });
    expect(types(t.gateway).filter((x) => x === "session.commentary.append")).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(types(t.browser)).toContain("app.limit");
    expect(types(t.gateway)).toContain("session.close");
    t.gateway.push({ type: "session.closed", usage: { seconds: 300 } });
    await t.flush();
    expect(t.deps.release).toHaveBeenCalledTimes(1);
    expect(t.deps.release).toHaveBeenCalledWith("slot-1", "closed");
  });
  it("releases a failed startup slot exactly once when the browser hangs up early", async () => {
    const t = setup();
    t.browser.push({ type: "app.start", sdp: "v=0", token: "good", context });
    await t.flush();
    t.browser.push({ type: "session.close" });
    t.browser.push({ type: "session.close" });
    t.gateway.push({ type: "session.closed" });
    await t.flush();
    expect(t.deps.release).toHaveBeenCalledTimes(1);
    expect(t.deps.release).toHaveBeenCalledWith("slot-1", "failed");
  });
});
