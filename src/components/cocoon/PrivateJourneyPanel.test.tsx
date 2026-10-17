import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivateJourneyPanel } from "./PrivateJourneyPanel";
const T = "10101010-1010-4010-8010-101010101010",
  E = "40404040-4040-4040-8040-404040404040",
  J = "50505050-5050-4050-8050-505050505050";
const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  ready: true,
  read: vi.fn(),
  contacts: vi.fn(),
  write: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/lib/production/auth", () => ({
  useProductionAuth: () => ({ user: mocks.user, ready: mocks.ready }),
}));
vi.mock("@/lib/production/inapp.functions", () => ({ inappAccountData: mocks.contacts }));
vi.mock("@/lib/production/journey.functions", () => ({
  readPrivateJourneys: mocks.read,
  writePrivateJourney: mocks.write,
}));
const journey = {
  id: J,
  traveller_id: T,
  destination: "Synthetic library",
  expected_at: "2026-10-17T21:00:00Z",
  status: "active",
  sharing: true,
  note: "Synthetic chosen note",
  location: null,
  last_check_in_at: null,
  created_at: "2026-10-17T19:00:00Z",
  updated_at: "2026-10-17T19:00:00Z",
  overdue: false,
  traveller_name: "Synthetic traveller",
};
let client: QueryClient;
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PrivateJourneyPanel destination="Synthetic library" />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: T };
  mocks.ready = true;
  mocks.read.mockResolvedValue({ serverNow: "2026-10-17T19:00:00Z", journeys: [] });
  mocks.contacts.mockResolvedValue({
    contacts: [
      {
        id: E,
        traveller_id: T,
        name: "Synthetic guardian",
        consent: "opted_in",
        revoked_at: null,
        journey_opt_in: true,
      },
    ],
    sent: [],
  });
});
afterEach(() => {
  cleanup();
  client?.clear();
  vi.restoreAllMocks();
});
describe("private journey UI with synthetic signed-in services", () => {
  it("preserves signed-out public usability without private reads", () => {
    mocks.user = null;
    mount();
    expect(screen.getByText(/Sign in for private journeys/)).toBeVisible();
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.contacts).not.toHaveBeenCalled();
  });
  it("shows a loading account state without making private calls", () => {
    mocks.user = null;
    mocks.ready = false;
    mount();
    expect(screen.getByText("Checking account…")).toBeVisible();
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("requires review and chosen guardians, starts without GPS, reads back and supports check-in and arrival", async () => {
    let records: (typeof journey)[] = [];
    mocks.read.mockImplementation(() =>
      Promise.resolve({ serverNow: "2026-10-17T19:00:00Z", journeys: records }),
    );
    mocks.write.mockImplementation(({ data }: { data: { action: string; note: string } }) => {
      records = [
        {
          ...journey,
          note: data.note,
          status: data.action === "arrived" ? "arrived" : "active",
          sharing: data.action !== "arrived",
        },
      ];
      return Promise.resolve({ id: J, duplicate: false });
    });
    mount();
    const review = await screen.findByRole("button", { name: "Review private journey" });
    expect((review as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Synthetic guardian" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Journey note (optional)" }), {
      target: { value: "Synthetic selected note" },
    });
    fireEvent.click(review);
    expect(mocks.write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm start private journey" }));
    await screen.findByRole("button", { name: "I'm okay · private check-in" });
    expect(mocks.write).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "start",
        destination: "Synthetic library",
        recipientIds: [E],
        note: "Synthetic selected note",
        location: null,
        locationConsent: false,
      }),
    });
    fireEvent.click(screen.getByRole("button", { name: "I'm okay · private check-in" }));
    await waitFor(() =>
      expect(mocks.write).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "check_in", journeyId: J }),
      }),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "I've arrived · finish private journey",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "I've arrived · finish private journey" }));
    await screen.findByRole("button", { name: "Review private journey" });
    expect(mocks.write).toHaveBeenCalledTimes(3);
  });
  it("retries unchanged failed start with the same idempotency key", async () => {
    mocks.write
      .mockRejectedValueOnce(new Error("Synthetic temporary failure"))
      .mockResolvedValue({ id: J, duplicate: true });
    mount();
    await screen.findByRole("checkbox", { name: "Synthetic guardian" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Synthetic guardian" }));
    fireEvent.click(screen.getByRole("button", { name: "Review private journey" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm start private journey" }));
    await screen.findByText("Synthetic temporary failure");
    fireEvent.click(screen.getByRole("button", { name: "Confirm start private journey" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(2));
    expect(mocks.write.mock.calls[0]?.[0].data.requestKey).toBe(
      mocks.write.mock.calls[1]?.[0].data.requestKey,
    );
  });
  it("handles unavailable data with refresh and an empty guardian state", async () => {
    mocks.read.mockRejectedValueOnce(new Error("Synthetic offline"));
    mount();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Refresh private journeys & guardians" }));
    await screen.findByRole("button", { name: "Review private journey" });
  });
  it("uses explicit stop-sharing and cancel actions without external messages", async () => {
    mocks.read.mockResolvedValue({ serverNow: "2026-10-17T19:00:00Z", journeys: [journey] });
    mocks.write.mockResolvedValue({ id: J, duplicate: false });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Stop private sharing" }));
    await waitFor(() =>
      expect(mocks.write).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "stop_sharing", journeyId: J, location: null }),
      }),
    );
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Cancel private journey" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel private journey" }));
    await waitFor(() =>
      expect(mocks.write).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "cancelled", journeyId: J }),
      }),
    );
  });
});
