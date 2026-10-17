import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { ScriptedPresenceDemo } from "./ScriptedPresenceDemo";
const PresenceRoom = () => <ScriptedPresenceDemo onSos={() => {}} />;
const m = vi.hoisted(() => ({
  listen: vi.fn(),
  speak: vi.fn(),
  stop: vi.fn(),
  onVoices: vi.fn(),
  callbacks: [] as Array<{
    start(): void;
    result(t: string, f: boolean): void;
    end(): void;
    error(c: string): void;
  }>,
  reduced: false,
}));
vi.mock("@tanstack/react-router", () => ({
  useHydrated: () => true,
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("motion/react", () => ({ useInView: () => true, useReducedMotion: () => m.reduced }));
vi.mock("@/lib/cocoon/locale", () => ({ usePrefs: () => ({ country: null }) }));
vi.mock("@/lib/cocoon/store", () => ({ useDemoState: () => ({}) }));
vi.mock("@/lib/cocoon/access", () => ({ activeTrip: () => null }));
vi.mock("@/components/cocoon/SosPanel", () => ({
  SosButton: () => <p>Separate private SOS review</p>,
}));
vi.mock("@/components/cocoon/SupportWorkspace", () => ({
  SupportWorkspace: ({ stopSignal }: { stopSignal: number }) => (
    <p>Manual desk · stop signal {stopSignal}</p>
  ),
}));
vi.mock("@/lib/cocoon/browser-session", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/cocoon/browser-session")>();
  return {
    ...original,
    browserSpeechPort: () => ({
      recognitionSupported: true,
      speechSupported: true,
      voices: () => [{ id: "v", name: "Mock local", lang: "en", local: true }],
      onVoicesChanged: m.onVoices,
      listen: m.listen,
      speak: m.speak,
    }),
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  m.callbacks = [];
  m.reduced = false;
  m.onVoices.mockReturnValue(vi.fn());
  m.listen.mockImplementation((c) => {
    m.callbacks.push(c);
    return m.stop;
  });
  m.speak.mockReturnValue(m.stop);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("Presence room mocked browser call flow", () => {
  it("text-first scripted session without microphone", async () => {
    render(<PresenceRoom />);
    fireEvent.click(screen.getByRole("button", { name: /Begin text session/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your message" }), {
      target: { value: "Where is my journey?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("link", { name: "Open Journey ↗" });
    fireEvent.click(screen.getByRole("button", { name: /^End$/ }));
    expect(m.listen).not.toHaveBeenCalled();
    expect(m.speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear session" }));
    expect(screen.queryByText("Where is my journey?")).toBeNull();
  });
  it("permission denial is actionable, typing works and late recognition after end is ignored", async () => {
    render(<PresenceRoom />);
    fireEvent.click(screen.getByRole("button", { name: "Browser voice" }));
    fireEvent.click(screen.getByRole("button", { name: /Begin browser session/ }));
    fireEvent.click(screen.getByRole("button", { name: "Stop listening / playback" }));
    fireEvent.click(screen.getByRole("button", { name: "Listen once" }));
    act(() => m.callbacks[0]?.error("not-allowed"));
    expect(screen.getByRole("alert")).toHaveTextContent("permission denied");
    expect(m.listen).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByRole("textbox", { name: "Your message" }), {
      target: { value: "type instead" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(screen.getByRole("log")).toHaveTextContent("type instead"));
    fireEvent.click(screen.getByRole("button", { name: /^End$/ }));
    act(() => m.callbacks[0]?.result("late callback", true));
    expect(screen.getByRole("log")).not.toHaveTextContent("late callback");
  });
  it("hidden page stops voice and does not resume; unmount detaches voice-list subscription", () => {
    const unsub = vi.fn();
    m.onVoices.mockReturnValue(unsub);
    const view = render(<PresenceRoom />);
    fireEvent.click(screen.getByRole("button", { name: "Browser voice" }));
    fireEvent.click(screen.getByRole("button", { name: /Begin browser session/ }));
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.getByText(/Session paused while/)).toBeVisible();
    expect(m.stop).toHaveBeenCalled();
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    expect(m.listen).not.toHaveBeenCalled();
    expect(m.speak).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
  it("reduced motion disables animation controls without disabling text or SOS access", () => {
    m.reduced = true;
    render(<PresenceRoom />);
    expect(screen.getByRole("button", { name: "Reduced motion enabled" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Begin text session/ })).toBeEnabled();
  });
});
