import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { AuthProvider, useProductionAuth, bearerHeaders } from "./auth";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  router: { invalidate: vi.fn() },
  cache: { cancelQueries: vi.fn(), clear: vi.fn(), invalidateQueries: vi.fn() },
}));
vi.mock("@tanstack/react-router", () => ({ useRouter: () => mocks.router }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => mocks.cache }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      getSession: mocks.getSession,
      onAuthStateChange: mocks.subscribe,
    },
  },
}));
function Status() {
  const { ready, user } = useProductionAuth();
  return <p>{ready ? (user ? "Signed in" : "Demo available") : "Loading"}</p>;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.subscribe.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
it("keeps the demo available without cloud configuration or authentication requests", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
  render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  );
  expect(screen.getByText("Demo available")).toBeVisible();
  expect(await bearerHeaders()).toEqual({});
  expect(mocks.getUser).not.toHaveBeenCalled();
  expect(mocks.getSession).not.toHaveBeenCalled();
  expect(mocks.subscribe).not.toHaveBeenCalled();
});
it("lets public pages remain usable if the configured auth service is unreachable", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "mock-public-key");
  mocks.getUser.mockRejectedValue(new Error("Offline"));
  const view = render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText("Demo available")).toBeVisible());
  view.unmount();
  expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
});
