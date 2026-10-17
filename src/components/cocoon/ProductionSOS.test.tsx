import { fireEvent, render, screen, waitFor, cleanup, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductionSOS } from "./ProductionSOS";
const T = "10101010-1010-4010-8010-101010101010",
  U = "30303030-3030-4030-8030-303030303030",
  E = "40404040-4040-4040-8040-404040404040";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  draft: vi.fn(),
  submit: vi.fn(),
  user: null as { id: string } | null,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/lib/production/auth", () => ({
  useProductionAuth: () => ({ user: mocks.user, ready: true }),
}));
vi.mock("@/lib/production/inapp.functions", () => ({
  inappAccountData: mocks.read,
  readEmergencyDraft: mocks.draft,
  submitInAppSOS: mocks.submit,
}));
let client: QueryClient;
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductionSOS />
    </QueryClientProvider>,
  );
}
async function prepare() {
  fireEvent.click(screen.getByRole("button", { name: "Prepare in-app guardian SOS" }));
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: /Refresh in-app guardians/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
}
async function review() {
  fireEvent.click(screen.getByRole("button", { name: "Review in-app SOS" }));
  await screen.findByRole("button", { name: "Confirm in-app SOS to selected guardians" });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user = { id: T };
  mocks.read.mockResolvedValue({
    contacts: [
      { id: E, traveller_id: T, consent: "opted_in", revoked_at: null, name: "Synthetic guardian" },
    ],
    sent: [],
  });
  mocks.draft.mockResolvedValue({
    draft: {
      introduction: "Saved private intro",
      helpInstructions: "Saved private help",
      preferredRecipientIds: [E],
    },
    senderName: "Traveller",
  });
  mocks.submit.mockResolvedValue({
    id: "50505050-5050-4050-8050-505050505050",
    count: 1,
    duplicate: false,
  });
});
afterEach(() => {
  cleanup();
  client?.clear();
  vi.restoreAllMocks();
});
describe("explicit real in-app SOS review with synthetic signed-in services", () => {
  it("requires recipients and separate review, omits saved draft and GPS by default", async () => {
    mount();
    await prepare();
    expect(
      (screen.getByRole("checkbox", { name: /Synthetic guardian/ }) as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Review in-app SOS" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /Synthetic guardian/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Optional note" }), {
      target: { value: "Chosen note" },
    });
    await review();
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(screen.queryByText("Saved private intro")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
    );
    await screen.findByText(/SOS stored for 1 selected/);
    expect(mocks.submit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientIds: [E],
        note: "Chosen note",
        location: null,
        locationConsent: false,
        content: expect.objectContaining({
          introduction: "",
          helpInstructions: "",
          includeDraft: false,
          senderName: "Traveller",
        }),
      }),
    });
  });
  it("uses only explicitly included edited snapshot and does not change the account draft", async () => {
    mount();
    await prepare();
    fireEvent.click(screen.getByRole("checkbox", { name: /Synthetic guardian/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Include an optional emergency/ }));
    expect(
      (
        screen.getByRole("textbox", {
          name: "Introduction for this SOS (optional)",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Saved private intro");
    fireEvent.change(
      screen.getByRole("textbox", { name: "Introduction for this SOS (optional)" }),
      { target: { value: "Edited for this SOS" } },
    );
    await review();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
    );
    await waitFor(() => expect(mocks.submit).toHaveBeenCalled());
    expect(mocks.submit.mock.calls[0]?.[0].data.content).toMatchObject({
      introduction: "Edited for this SOS",
      helpInstructions: "Saved private help",
      includeDraft: true,
    });
  });
  it("retains key and timestamp for identical uncertain retries, creates a new key after changed payload", async () => {
    mocks.submit
      .mockRejectedValueOnce(new Error("Uncertain result"))
      .mockRejectedValueOnce(new Error("Uncertain again"));
    mount();
    await prepare();
    fireEvent.click(screen.getByRole("checkbox", { name: /Synthetic guardian/ }));
    await review();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
    );
    await screen.findByText("Uncertain result");
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
    );
    await screen.findByText("Uncertain again");
    expect(mocks.submit.mock.calls[0]?.[0].data).toEqual(mocks.submit.mock.calls[1]?.[0].data);
    fireEvent.change(screen.getByRole("textbox", { name: "Optional note" }), {
      target: { value: "Changed after uncertain failure" },
    });
    await review();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
    );
    await screen.findByText(/SOS stored/);
    expect(mocks.submit.mock.calls[2]?.[0].data.requestKey).not.toBe(
      mocks.submit.mock.calls[0]?.[0].data.requestKey,
    );
  });
  it("cancel and reopen discard content, selection and failed request key", async () => {
    mocks.submit.mockRejectedValueOnce(new Error("Uncertain result"));
    mount();
    await prepare();
    fireEvent.click(screen.getByRole("checkbox", { name: /Synthetic guardian/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Optional note" }), {
      target: { value: "Discard me" },
    });
    await review();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
    );
    await screen.findByText("Uncertain result");
    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/ }));
    await prepare();
    expect(
      (screen.getByRole("textbox", { name: "Optional note" }) as HTMLTextAreaElement).value,
    ).toBe("");
    expect(
      (screen.getByRole("checkbox", { name: /Synthetic guardian/ }) as HTMLInputElement).checked,
    ).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: /Synthetic guardian/ }));
    await review();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
    );
    await screen.findByText(/SOS stored/);
    expect(mocks.submit.mock.calls[1]?.[0].data.requestKey).not.toBe(
      mocks.submit.mock.calls[0]?.[0].data.requestKey,
    );
  });
  it("disables editing and cancel while pending, ignores late result after account switch", async () => {
    let resolve: ((v: unknown) => void) | undefined;
    mocks.submit.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const view = mount();
    await prepare();
    fireEvent.click(screen.getByRole("checkbox", { name: /Synthetic guardian/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Optional note" }), {
      target: { value: "Private old account" },
    });
    await review();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
    );
    expect(screen.getByRole("button", { name: /^Cancel$/ }).matches(":disabled")).toBe(true);
    expect(screen.getByRole("textbox", { name: "Optional note" }).matches(":disabled")).toBe(true);
    mocks.user = { id: U };
    mocks.read.mockResolvedValue({ contacts: [], sent: [] });
    mocks.draft.mockResolvedValue({ draft: null, senderName: "Other traveller" });
    view.rerender(
      <QueryClientProvider client={client}>
        <ProductionSOS />
      </QueryClientProvider>,
    );
    await act(async () => {
      resolve?.({ id: "50505050-5050-4050-8050-505050505050", count: 1, duplicate: false });
    });
    expect(screen.queryByText(/SOS stored/)).toBeNull();
    await prepare();
    expect(
      (screen.getByRole("textbox", { name: "Optional note" }) as HTMLTextAreaElement).value,
    ).toBe("");
    expect(screen.queryByText("Saved private intro")).toBeNull();
  });
  it("refresh removes eligibility and prevents sending an outdated review", async () => {
    mount();
    await prepare();
    fireEvent.click(screen.getByRole("checkbox", { name: /Synthetic guardian/ }));
    await review();
    mocks.read.mockResolvedValue({ contacts: [], sent: [] });
    fireEvent.click(screen.getByRole("button", { name: /Refresh in-app guardians/ }));
    await screen.findByText(/A selected guardian is no longer eligible/);
    expect(
      screen.queryByRole("button", { name: "Confirm in-app SOS to selected guardians" }),
    ).toBeNull();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("unavailable draft fails closed with retry; signed-out public SOS makes no private reads", async () => {
    mocks.user = null;
    const view = mount();
    expect(screen.getByText(/Sign in for real/)).toBeVisible();
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.draft).not.toHaveBeenCalled();
    mocks.user = { id: T };
    mocks.draft.mockRejectedValueOnce(new Error("Offline"));
    view.rerender(
      <QueryClientProvider client={client}>
        <ProductionSOS />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(mocks.draft).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Prepare in-app guardian SOS" }));
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: /Refresh in-app guardians/ }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
