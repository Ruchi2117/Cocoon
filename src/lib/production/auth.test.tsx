import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, bearerHeaders, productionAuthConfigured, useProductionAuth } from "./auth";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      getSession: mocks.getSession,
      onAuthStateChange: mocks.subscribe,
    },
  },
}));
vi.mock("@tanstack/react-router", () => ({ useRouter: () => ({ invalidate: mocks.invalidate }) }));
function Demo() {
  const { ready, user } = useProductionAuth();
  return (
    <div>
      {ready ? "Public demo usable" : "Checking account"}
      {user ? "signed in" : "signed out"}
    </div>
  );
}
function mount() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Demo />
      </AuthProvider>
    </QueryClientProvider>,
  );
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("public auth availability without real accounts", () => {
  it("makes no auth calls or bearer lookup when public config is absent", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    expect(productionAuthConfigured()).toBe(false);
    const view = mount();
    expect(screen.getByText(/Public demo usable/)).toBeTruthy();
    expect(await bearerHeaders()).toEqual({});
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.subscribe).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
    view.unmount();
  });
  it("preserves public usability after rejected offline auth", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://auth.example.test");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    mocks.getUser.mockRejectedValue(new Error("offline"));
    mocks.getSession.mockRejectedValue(new Error("offline"));
    mocks.subscribe.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
    const view = mount();
    await waitFor(() => expect(screen.getByText(/Public demo usable/)).toBeTruthy());
    expect(await bearerHeaders()).toEqual({});
    view.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalled();
  });
  it("unblocks the public demo if auth never responds", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://auth.example.test");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    mocks.getUser.mockReturnValue(new Promise(() => {}));
    mocks.subscribe.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
    vi.useFakeTimers();
    const view = mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(screen.getByText(/Public demo usablesigned out/)).toBeTruthy();
    view.unmount();
  });
});
