import { cleanup, act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorldDoorway } from "./WorldDoorway";
import { WORLD_ENTRANCE, type WorldEntrance } from "@/lib/cocoon/world-navigation";
const m = vi.hoisted(() => ({ navigate: vi.fn(async () => {}), reduce: false, toast: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => m.navigate }));
vi.mock("sonner", () => ({ toast: { error: m.toast } }));
vi.mock("./NightAtlasScene", () => ({ NightAtlasScene: () => null }));
vi.mock("./WaveText", () => ({ WaveText: ({ text }: { text: string }) => <p>{text}</p> }));
vi.mock("motion/react", () => ({
  useReducedMotion: () => m.reduce,
  motion: {
    div: ({
      children,
      onAnimationComplete,
      ...props
    }: {
      children: React.ReactNode;
      onAnimationComplete?: () => void;
      className?: string;
    }) => (
      <div className={props.className} onTransitionEnd={onAnimationComplete}>
        {children}
      </div>
    ),
  },
}));
function enter(to = "/presence") {
  const detail: WorldEntrance = { to, label: "The listening nook" };
  act(() => window.dispatchEvent(new CustomEvent(WORLD_ENTRANCE, { detail })));
  return detail;
}
beforeEach(() => {
  vi.useFakeTimers();
  m.reduce = false;
  m.navigate.mockReset().mockResolvedValue(undefined);
  m.toast.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("world doorway lifecycle (no animation completion dependency)", () => {
  it("navigates once at cover duration even if completion never fires, then cleans up", async () => {
    render(<WorldDoorway />);
    expect(enter().handled).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(m.navigate).toHaveBeenCalledExactlyOnceWith({ to: "/presence", viewTransition: false });
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("skip plus animation completion cannot duplicate navigation", async () => {
    const view = render(<WorldDoorway />);
    enter();
    fireEvent.click(screen.getByRole("button", { name: "Skip this transition" }));
    const overlay = view.container.querySelector(".world-doorway");
    if (!overlay) throw new Error("Expected overlay");
    fireEvent.transitionEnd(overlay);
    await act(async () => {});
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(m.navigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("swallows overlapping doorway requests while navigation settles, without a second native update", async () => {
    let resolve = () => {};
    m.navigate.mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    render(<WorldDoorway />);
    enter();
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(enter("/circle").handled).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(m.navigate).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(screen.queryByRole("status")).toBeNull();
    enter("/circle");
    await act(() => vi.advanceTimersByTimeAsync(1100));
    expect(m.navigate).toHaveBeenCalledTimes(2);
  });
  it("rejected navigation reports failure and releases the doorway", async () => {
    m.navigate.mockRejectedValueOnce(new Error("Synthetic failure"));
    render(<WorldDoorway />);
    enter();
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(m.toast).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("unmount cancels scheduled navigation", async () => {
    const view = render(<WorldDoorway />);
    enter();
    view.unmount();
    await act(() => vi.advanceTimersByTimeAsync(1100));
    expect(m.navigate).not.toHaveBeenCalled();
  });
  it("hung navigation clears its cover and stale resolution cannot dismiss a newer request", async () => {
    let resolve = () => {};
    m.navigate.mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    render(<WorldDoorway />);
    enter();
    await act(() => vi.advanceTimersByTimeAsync(5000));
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(screen.queryByRole("status")).toBeNull();
    enter("/circle");
    await act(async () => resolve());
    expect(screen.getByRole("status")).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(m.navigate).toHaveBeenLastCalledWith({ to: "/circle", viewTransition: false });
    await act(() => vi.advanceTimersByTimeAsync(550));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("reduced motion leaves normal links untouched and settles an already accepted request", async () => {
    m.reduce = true;
    const view = render(<WorldDoorway />);
    expect(enter().handled).not.toBe(true);
    m.reduce = false;
    view.rerender(<WorldDoorway />);
    enter();
    m.reduce = true;
    view.rerender(<WorldDoorway />);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(m.navigate).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
