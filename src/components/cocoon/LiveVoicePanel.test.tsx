import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveVoicePanel } from "./LiveVoicePanel";
const mocks = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock("@/lib/production/auth", () => ({
  useProductionAuth: () => ({ user: { id: "synthetic" } }),
  bearerHeaders: async () => ({}),
}));
vi.mock("@tanstack/react-router", () => ({ Link: () => null }));
vi.mock("./PresenceBuddy", () => ({ PresenceBuddy: () => null }));
vi.mock("./art", () => ({ Waveform: () => null }));
vi.mock("@/lib/cocoon/live-voice", () => ({ connectLiveVoice: mocks.connect }));
vi.mock("@/lib/cocoon/store", () => ({
  useDemoState: () => ({ companion: { name: "Coco", style: "calm" } }),
}));
vi.mock("@/lib/cocoon/locale", () => ({ usePrefs: () => ({ country: "" }) }));
vi.mock("@/lib/cocoon/access", () => ({ activeTrip: () => null }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
async function start() {
  // Mock capability solely to exercise dormant lifecycle; immutable server policy unchanged.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ available: true }) }));
  const view = render(<LiveVoicePanel />);
  await waitFor(() =>
    expect(
      (screen.getByRole("checkbox", { name: /I choose to share/ }) as HTMLInputElement).disabled,
    ).toBe(false),
  );
  fireEvent.click(screen.getByRole("checkbox", { name: /I choose to share/ }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Call Coco" }));
  });
  return view;
}
describe("dormant voice lifecycle with mocked handles, no media/provider calls", () => {
  it("preserves the original connection rejection even when cleanup closes first", async () => {
    mocks.connect.mockImplementation(async (o) => {
      o.onClosed();
      throw new Error("Original connection failure");
    });
    const view = await start();
    expect((await screen.findByRole("alert")).textContent).toBe("Original connection failure");
    expect(mocks.connect.mock.calls[0]?.[0]?.signal.aborted).toBe(false);
    view.unmount();
  });
  it("does not install a handle that already closed; normal close returns idle", async () => {
    const close = vi.fn(),
      mute = vi.fn(),
      speaker = vi.fn();
    mocks.connect.mockImplementation(async (o) => {
      o.onPhase("listening");
      o.onClosed();
      return { close, mute, speaker };
    });
    const view = await start();
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(mute).not.toHaveBeenCalled();
    expect(speaker).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /End call/ })).toBeNull();
    view.unmount();
  });
});
