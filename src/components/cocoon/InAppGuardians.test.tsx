import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InAppGuardians } from "./InAppGuardians";

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  invite: vi.fn(),
  confirm: vi.fn(),
  revoke: vi.fn(),
  retrieve: vi.fn(),
  open: vi.fn(),
  user: { id: "20202020-2020-4020-8020-202020202020" } as { id: string } | null,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/production/auth", () => ({
  useProductionAuth: () => ({ user: mocks.user }),
}));
vi.mock("@/lib/production/inapp.functions", () => ({
  inappAccountData: mocks.read,
  inviteInAppGuardian: mocks.invite,
  confirmInAppGuardian: mocks.confirm,
  revokeInAppGuardian: mocks.revoke,
  retrieveInAppInbox: mocks.retrieve,
  openInAppAlert: mocks.open,
}));
const alert = {
  id: "60606060-6060-4060-8060-606060606060",
  traveller_name: "Synthetic traveller",
  created_at: "2026-10-17T16:00:00Z",
  note: "Synthetic chosen SOS note",
  location: { latitude: 12.34, longitude: 56.78, accuracy: 25, timestamp: 1792252800000 },
  delivered_at: "2026-10-17T16:01:00Z",
  read_at: null,
  acknowledged_at: null,
};
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.user = { id: "20202020-2020-4020-8020-202020202020" };
});
describe("in-app guardian flow with synthetic authenticated services, no hosted users", () => {
  it("retrieves only when inbox opens, explicitly opens chosen note/location and acknowledges separately", async () => {
    mocks.read.mockResolvedValue({ contacts: [], sent: [] });
    mocks.retrieve.mockResolvedValue([alert]);
    mocks.open.mockImplementation(({ data }: { data: { acknowledge: boolean } }) =>
      Promise.resolve({
        ...alert,
        read_at: "2026-10-17T16:02:00Z",
        acknowledged_at: data.acknowledge ? "2026-10-17T16:03:00Z" : null,
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <InAppGuardians />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(mocks.read).toHaveBeenCalled());
    expect(mocks.retrieve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open guardian inbox" }));
    await screen.findByRole("button", { name: "Open SOS alert" });
    expect(mocks.open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open SOS alert" }));
    await screen.findByText("Synthetic chosen SOS note");
    expect(mocks.open).toHaveBeenCalledWith({ data: { id: alert.id, acknowledge: false } });
    expect(
      screen.getByRole("link", { name: /Open shared snapshot/ }).getAttribute("href"),
    ).toContain("12.34");
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge this in-app SOS" }));
    await waitFor(() =>
      expect(mocks.open).toHaveBeenCalledWith({ data: { id: alert.id, acknowledge: true } }),
    );
    view.unmount();
    client.clear();
  });
  it("stops periodic retrieval while hidden and after the inbox closes", async () => {
    mocks.read.mockResolvedValue({ contacts: [], sent: [] });
    mocks.retrieve.mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <InAppGuardians />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open guardian inbox" }));
    await waitFor(() => expect(mocks.retrieve).toHaveBeenCalledTimes(1));
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61000);
    });
    expect(mocks.retrieve).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close guardian inbox" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61000);
    });
    expect(mocks.retrieve).toHaveBeenCalledTimes(1);
    view.unmount();
    client.clear();
  });
  it("stops polling and removes the inbox when signed out", async () => {
    mocks.read.mockResolvedValue({ contacts: [], sent: [] });
    mocks.retrieve.mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrap = () => (
      <QueryClientProvider client={client}>
        <InAppGuardians />
      </QueryClientProvider>
    );
    const view = render(wrap());
    fireEvent.click(screen.getByRole("button", { name: "Open guardian inbox" }));
    await waitFor(() => expect(mocks.retrieve).toHaveBeenCalledTimes(1));
    vi.useFakeTimers();
    mocks.user = null;
    view.rerender(wrap());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61000);
    });
    expect(mocks.retrieve).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Refresh guardian inbox" })).toBeNull();
    view.unmount();
    client.clear();
  });
});

