import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ProductionSOS } from "./ProductionSOS";
const mocks = vi.hoisted(() => ({ read: vi.fn(), submit: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/lib/production/auth", () => ({
  useProductionAuth: () => ({ user: { id: "10101010-1010-4010-8010-101010101010" } }),
}));
vi.mock("@/lib/production/inapp.functions", () => ({
  inappAccountData: mocks.read,
  submitInAppSOS: mocks.submit,
}));
describe("real-mode in-app SOS using synthetic services, no device permissions", () => {
  it("requires choosing an opted-in guardian and sends only an explicit in-app note without GPS", async () => {
    const guardian = "40404040-4040-4040-8040-404040404040";
    mocks.read.mockResolvedValue({
      contacts: [
        {
          id: guardian,
          traveller_id: "10101010-1010-4010-8010-101010101010",
          consent: "opted_in",
          revoked_at: null,
          name: "Synthetic guardian",
        },
      ],
      sent: [],
    });
    mocks.submit.mockResolvedValue({
      id: "50505050-5050-4050-8050-505050505050",
      count: 1,
      duplicate: false,
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <ProductionSOS />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(mocks.read).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Prepare in-app guardian SOS" }));
    const submit = screen.getByRole("button", { name: "Confirm in-app SOS to selected guardians" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /Synthetic guardian/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Optional note" }), {
      target: { value: "Synthetic chosen SOS note" },
    });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mocks.submit).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientIds: [guardian],
          channel: "in_app",
          note: "Synthetic chosen SOS note",
          location: null,
          locationConsent: false,
        }),
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
      ).toBeNull(),
    );
    expect(mocks.submit).toHaveBeenCalledTimes(1);
    view.unmount();
    client.clear();
  });
});

