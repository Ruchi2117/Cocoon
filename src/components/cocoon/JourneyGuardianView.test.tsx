import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JourneyGuardianView } from "./JourneyGuardianView";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  user: { id: "20202020-2020-4020-8020-202020202020" } as { id: string } | null,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/production/auth", () => ({ useProductionAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/production/journey.functions", () => ({ readPrivateJourneys: mocks.read }));
let client: QueryClient;
afterEach(() => {
  cleanup();
  client?.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.user = { id: "20202020-2020-4020-8020-202020202020" };
});
function wrap(open: boolean) {
  return (
    <QueryClientProvider client={client}>
      <JourneyGuardianView open={open} />
    </QueryClientProvider>
  );
}
describe("guardian journey inbox with synthetic services", () => {
  it("does not redisplay cached snapshots when the inbox reopens before fresh permission retrieval", async () => {
    let resolve: ((value: unknown) => void) | undefined;
    mocks.read.mockResolvedValueOnce({
      serverNow: "2026-10-17T20:00:00Z",
      journeys: [
        {
          id: "50505050-5050-4050-8050-505050505050",
          destination: "Library",
          traveller_name: "Synthetic traveller",
          expected_at: "2026-10-17T21:00:00Z",
          status: "active",
          sharing: true,
          last_check_in_at: null,
          note: "Private cached note",
          location: null,
          overdue: false,
        },
      ],
    });
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(wrap(true));
    await screen.findByText("Private cached note");
    view.rerender(wrap(false));
    mocks.read.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    view.rerender(wrap(true));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Private cached note")).toBeNull();
    await act(async () => {
      resolve?.({ serverNow: "2026-10-17T20:01:00Z", journeys: [] });
    });
    await screen.findByText("No active permitted shared journeys.");
  });
  it("retrieves only in an open inbox and displays chosen note/snapshot then removes revoked status", async () => {
    const row = {
      id: "50505050-5050-4050-8050-505050505050",
      destination: "Synthetic library",
      traveller_name: "Synthetic traveller",
      expected_at: "2026-10-17T19:00:00Z",
      status: "active",
      sharing: true,
      last_check_in_at: null,
      note: "Synthetic chosen note",
      location: { latitude: 12.34, longitude: 56.78, accuracy: 25, timestamp: 1792252800000 },
      overdue: true,
    };
    mocks.read
      .mockResolvedValueOnce({ serverNow: "2026-10-17T20:00:00Z", journeys: [row] })
      .mockResolvedValue({ serverNow: "2026-10-17T20:01:00Z", journeys: [] });
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(wrap(false));
    expect(mocks.read).not.toHaveBeenCalled();
    view.rerender(wrap(true));
    await screen.findByText("Synthetic chosen note");
    expect(
      screen.getByRole("link", { name: /Open journey snapshot/ }).getAttribute("href"),
    ).toContain("12.34");
    fireEvent.click(screen.getByRole("button", { name: "Refresh shared journeys" }));
    await screen.findByText("No active permitted shared journeys.");
    expect(screen.queryByText("Synthetic chosen note")).toBeNull();
  });
  it("stops polling and hides snapshots while hidden, closed or signed out", async () => {
    mocks.read.mockResolvedValue({ serverNow: "2026-10-17T20:00:00Z", journeys: [] });
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(wrap(true));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1));
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61000);
    });
    expect(mocks.read).toHaveBeenCalledTimes(1);
    view.rerender(wrap(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61000);
    });
    expect(mocks.read).toHaveBeenCalledTimes(1);
    mocks.user = null;
    view.rerender(wrap(true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61000);
    });
    expect(mocks.read).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Refresh shared journeys" })).toBeNull();
  });
});
