import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { EmergencyDraftEditor } from "./EmergencyDraftEditor";
const T = "10101010-1010-4010-8010-101010101010",
  E = "40404040-4040-4040-8040-404040404040";
const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  read: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  contacts: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/production/auth", () => ({ useProductionAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/production/inapp.functions", () => ({
  readEmergencyDraft: mocks.read,
  saveEmergencyDraft: mocks.save,
  deleteEmergencyDraft: mocks.remove,
  inappAccountData: mocks.contacts,
}));
let client: QueryClient;
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EmergencyDraftEditor />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user = { id: T };
  mocks.read.mockResolvedValue({
    draft: {
      introduction: "Private original",
      helpInstructions: "Original help",
      preferredRecipientIds: [],
    },
    senderName: "Traveller",
  });
  mocks.contacts.mockResolvedValue({
    contacts: [
      { id: E, traveller_id: T, name: "Synthetic guardian", consent: "opted_in", revoked_at: null },
    ],
    sent: [],
  });
  mocks.save.mockResolvedValue({ ok: true });
  mocks.remove.mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
  client?.clear();
});
describe("owner private emergency preferences with mocked services", () => {
  it("edits and saves bounded optional content and explicit preferred recipients then deletes independently", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Edit emergency draft" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Short self-introduction (optional)" }), {
      target: { value: "Edited private introduction" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Instructions / help needed (optional)" }),
      { target: { value: "Please meet me" } },
    );
    expect(
      (screen.getByRole("checkbox", { name: /Synthetic guardian/ }) as HTMLInputElement).checked,
    ).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: /Synthetic guardian/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save private emergency draft" }));
    await screen.findByText(/Emergency draft saved privately/);
    expect(mocks.save).toHaveBeenCalledWith({
      data: {
        introduction: "Edited private introduction",
        helpInstructions: "Please meet me",
        preferredRecipientIds: [E],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete private emergency draft" }));
    await screen.findByText(/Emergency draft deleted/);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
  it("keeps failed edit retryable and drops private draft state on account switch, including late result", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Draft not saved"));
    let done: ((v: unknown) => void) | undefined;
    mocks.save
      .mockImplementationOnce(() => Promise.reject(new Error("Draft not saved")))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            done = resolve;
          }),
      );
    const view = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Edit emergency draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Save private emergency draft" }));
    await screen.findByText("Draft not saved");
    fireEvent.click(screen.getByRole("button", { name: "Save private emergency draft" }));
    mocks.user = { id: "30303030-3030-4030-8030-303030303030" };
    mocks.read.mockResolvedValue({ draft: null, senderName: "Other" });
    mocks.contacts.mockResolvedValue({ contacts: [], sent: [] });
    view.rerender(
      <QueryClientProvider client={client}>
        <EmergencyDraftEditor />
      </QueryClientProvider>,
    );
    await act(async () => {
      done?.({ ok: true });
    });
    await screen.findByText("No emergency introduction saved.");
    expect(screen.queryByText("Private original")).toBeNull();
    expect(screen.queryByText(/Emergency draft saved privately/)).toBeNull();
  });
  it("signed-out renders no private content and makes no reads", () => {
    mocks.user = null;
    mount();
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.contacts).not.toHaveBeenCalled();
  });
  it("shows unavailable state and retry reads back successfully", async () => {
    mocks.read.mockRejectedValueOnce(new Error("Offline"));
    mount();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Refresh emergency preferences" }));
    await waitFor(() => expect(screen.getByText("Private original")).toBeVisible());
  });
});
