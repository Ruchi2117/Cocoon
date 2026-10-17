import { beforeEach, describe, expect, it, vi } from "vitest";
import { productionDeps } from "./live-relay.server";

const m = vi.hoisted(() => ({
  state: { data: { paused: false } as { paused: boolean } | null, error: null as object | null },
  rpc: vi.fn(async () => ({ data: "synthetic-slot", error: null })),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => m.state }) }) }),
    rpc: m.rpc,
  },
}));
beforeEach(() => {
  m.state = { data: { paused: false }, error: null };
  m.rpc.mockClear();
});
describe("production guest pause control (synthetic database, no traffic)", () => {
  it("fails closed on lookup error before reserving any credit-using slot", async () => {
    m.state.error = { message: "synthetic lookup failure" };
    const result = await productionDeps.reserveGuest?.("a".repeat(64));
    expect(result).toEqual({ error: "Live voice limits could not be checked. Try again later." });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("fails closed when the control row is missing", async () => {
    m.state.data = null;
    expect(await productionDeps.reserveGuest?.("a".repeat(64))).toHaveProperty("error");
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("owner pause refuses guest reservation", async () => {
    m.state.data = { paused: true };
    expect(await productionDeps.reserveGuest?.("a".repeat(64))).toEqual({
      error: "Live voice is paused by the owner.",
    });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("verified unpaused control reserves only the hashed key", async () => {
    expect(await productionDeps.reserveGuest?.("a".repeat(64))).toEqual({ id: "synthetic-slot" });
    expect(m.rpc).toHaveBeenCalledExactlyOnceWith("reserve_guest_voice", {
      p_client: "a".repeat(64),
    });
  });
});
