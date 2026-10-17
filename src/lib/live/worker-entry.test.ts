import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Exercises the Cloudflare server entry (src/server.ts) /api/live upgrade with synthetic sockets. */
vi.mock("@/integrations/supabase/client.server", () => {
  throw new Error("Real database access forbidden");
});
type L = (e: { data?: unknown }) => void;
class Side {
  readyState = 1;
  sent: string[] = [];
  l: Record<string, L[]> = {};
  accept = vi.fn();
  peer?: Side;
  addEventListener(t: string, f: L) {
    (this.l[t] ??= []).push(f);
  }
  send(d: string) {
    this.sent.push(d);
  }
  close() {
    this.readyState = 3;
    if (this.peer) this.peer.readyState = 3;
  }
  emit(t: string, data?: unknown) {
    for (const f of this.l[t] ?? []) f({ data });
  }
}
let server: Side;
const fetchSpy = vi.fn(async () => new Response("no", { status: 500 }));
beforeEach(() => {
  vi.stubEnv("LOVABLE_API_KEY", "mock-key");
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal(
    "WebSocketPair",
    class {
      0: Side;
      1: Side;
      constructor() {
        this[0] = new Side();
        this[1] = server = new Side();
        this[1].peer = this[0];
      }
    },
  );
  // workerd-only Response option: allow status 101 in the test runtime.
  vi.stubGlobal(
    "Response",
    class extends Response {
      constructor(body: BodyInit | null, init?: ResponseInit) {
        const s = init?.status;
        super(body, s === 101 ? { ...init, status: 200 } : init);
        if (s === 101) Object.defineProperty(this, "status", { value: 101 });
      }
    },
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchSpy.mockClear();
});
const ctx = () => {
  const tasks: Promise<unknown>[] = [];
  return { tasks, waitUntil: (p: Promise<unknown>) => void tasks.push(p) };
};
const upgrade = (origin = "https://coco.example") =>
  new Request("https://coco.example/api/live", {
    headers: { Upgrade: "websocket", Origin: origin },
  });

describe("server entry /api/live (synthetic, no provider session)", () => {
  it("upgrades, then rejects an unauthenticated start before any upstream connection", async () => {
    const { default: entry } = await import("@/server");
    const c = ctx();
    const res = await entry.fetch(upgrade(), {}, c);
    expect(res.status).toBe(101);
    server.emit(
      "message",
      JSON.stringify({
        type: "app.start",
        sdp: "v=0",
        token: "x",
        context: {
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
        },
      }),
    );
    for (let i = 0; i < 5; i++) await Promise.all(c.tasks.splice(0));
    expect(server.sent.join()).toMatch(/Sign in with a verified account/);
    expect(server.readyState).toBe(3);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("rejects arbitrary first messages (e.g. instruction/model overrides) without upstream", async () => {
    const { default: entry } = await import("@/server");
    const c = ctx();
    await entry.fetch(upgrade(), {}, c);
    server.emit(
      "message",
      JSON.stringify({ type: "session.update", session: { model: "x", instructions: "y" } }),
    );
    await Promise.all(c.tasks);
    expect(server.readyState).toBe(3);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it("rejects cross-origin upgrades", async () => {
    const { default: entry } = await import("@/server");
    const res = await entry.fetch(upgrade("https://evil.example"), {}, ctx());
    expect(res.status).toBe(403);
  });
  it("missing trusted IP ignores spoofed forwarded headers and browser identity before database/provider access", async () => {
    const { default: entry } = await import("@/server");
    const c = ctx();
    const request = upgrade();
    request.headers.set("x-forwarded-for", "203.0.113.9");
    await entry.fetch(request, {}, c);
    server.emit(
      "message",
      JSON.stringify({
        type: "app.start",
        sdp: "v=0",
        token: "",
        clientKey: "spoofed",
        context: {
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
        },
      }),
    );
    for (let i = 0; i < 5; i++) await Promise.all(c.tasks.splice(0));
    expect(server.sent.join()).toMatch(/Demo network limits could not be checked/);
    expect(server.readyState).toBe(3);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
