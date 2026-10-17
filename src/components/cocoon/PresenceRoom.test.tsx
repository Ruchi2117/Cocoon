import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresenceRoom } from "./PresenceRoom";

const m = vi.hoisted(() => ({
  user: null as null | { id: string },
  start: vi.fn(),
  stop: vi.fn(),
  status: "idle",
  error: null as string | null,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/lib/production/auth", () => ({
  useProductionAuth: () => ({ user: m.user, ready: true }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) } },
}));
vi.mock("@/hooks/use-live-voice", () => ({
  useLiveVoice: () => ({
    status: m.status,
    error: m.error,
    muted: false,
    playbackBlocked: false,
    audioRef: { current: null },
    start: m.start,
    stop: m.stop,
    setMuted: vi.fn(),
    resumePlayback: vi.fn(),
  }),
}));
vi.mock("@/components/cocoon/ScriptedPresenceDemo", () => ({
  ScriptedPresenceDemo: () => <p>Scripted demo body</p>,
}));
vi.mock("@/components/cocoon/SosPanel", () => ({ SosButton: () => <p>SOS review</p> }));
vi.mock("@/components/cocoon/SupportWorkspace", () => ({ SupportWorkspace: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  m.user = null;
  m.status = "idle";
  m.error = null;
  localStorage.clear();
});
afterEach(cleanup);

describe("Presence live call screen", () => {
  it("signed out: offers a capped demo call that sends no sign-in token", () => {
    render(<PresenceRoom />);
    expect(screen.getByText(/Demo call · real AI voice, 2 minutes/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Try a demo call/ })).toBeVisible();
  });
  it("after a failed call: user-initiated trusted-contact dialler", () => {
    localStorage.setItem(
      "cocoon-kit-v1",
      JSON.stringify({ trustedName: "Asha", trustedNumber: "+919800000000" }),
    );
    m.error = "Voice service connection failed";
    render(<PresenceRoom />);
    expect(screen.getByRole("link", { name: /Asha/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^tel:/),
    );
  });
  it("no guided-intent questionnaire; scripted demo is collapsed and secondary", () => {
    render(<PresenceRoom />);
    expect(screen.queryByText(/Help decide a next step/)).toBeNull();
    expect(
      screen.getByText(/Scripted browser demo \(not AI/).closest("details"),
    ).not.toHaveAttribute("open");
  });
  it("signed in: start won't call until all three acknowledgements, then sends token + context once", async () => {
    m.user = { id: "u" };
    render(<PresenceRoom />);
    const startBtn = screen.getByRole("button", { name: /Start call/ });
    fireEvent.click(startBtn);
    expect(m.start).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/three boxes/);
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
    fireEvent.click(startBtn);
    expect(m.start).toHaveBeenCalledTimes(1);
    const payload = await m.start.mock.calls[0]?.[0]();
    expect(payload.token).toBe("t");
    expect(payload.context).toMatchObject({ mode: "pretend", alias: "Didi", audioConsent: true });
    expect(payload.context).not.toHaveProperty("location");
  });
  it("failed call shows the error and the trusted-contact handoff instead of a scripted fallback", () => {
    m.user = { id: "u" };
    m.status = "closed";
    m.error = "You already have a call open, or reached today's call limit.";
    render(<PresenceRoom />);
    expect(screen.getByRole("alert")).toHaveTextContent(/call limit/);
    expect(screen.getByText(/Call a real person instead/)).toBeVisible();
  });
  it("in a call: End call uses the single stop path", () => {
    m.user = { id: "u" };
    m.status = "connected";
    render(<PresenceRoom />);
    fireEvent.click(screen.getByRole("button", { name: /End call/ }));
    expect(m.stop).toHaveBeenCalledTimes(1);
  });
  it("account switch or sign-out ends the active call", () => {
    m.user = { id: "u" };
    m.status = "connected";
    const view = render(<PresenceRoom />);
    m.stop.mockClear();
    m.user = { id: "other" };
    view.rerender(<PresenceRoom />);
    expect(m.stop).toHaveBeenCalled();
  });
  it("consent copy does not promise zero retention", () => {
    m.user = { id: "u" };
    render(<PresenceRoom />);
    expect(document.body.textContent).not.toMatch(/no data retention|Nothing is recorded/i);
    expect(document.body.textContent).toMatch(/retention policies apply/);
  });
});
