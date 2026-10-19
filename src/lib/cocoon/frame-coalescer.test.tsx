import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createFrameCoalescer } from "./frame-coalescer";
import { CallCharacter } from "@/components/cocoon/CallCharacter";

let frames: Map<number, FrameRequestCallback>;
let nextId: number;
function installRaf() {
  frames = new Map();
  nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = nextId++;
    frames.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
}
function flush() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((cb) => cb(0));
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("createFrameCoalescer", () => {
  it("runs once per frame with only the latest value", () => {
    installRaf();
    const run = vi.fn();
    const c = createFrameCoalescer<number>(run);
    for (let i = 0; i < 50; i++) c.schedule(i);
    expect(frames.size).toBe(1);
    flush();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(49);
  });
  it("cancel drops the pending frame", () => {
    installRaf();
    const run = vi.fn();
    const c = createFrameCoalescer<number>(run);
    c.schedule(1);
    c.cancel();
    expect(frames.size).toBe(0);
    flush();
    expect(run).not.toHaveBeenCalled();
  });
});

function mockMedia(reduce: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce") ? reduce : q.includes("fine"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  window.matchMedia = globalThis.matchMedia;
}
function moves(n: number) {
  for (let i = 0; i < n; i++)
    window.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: 900, clientY: 10 }));
}

describe("CallCharacter pointer lean", () => {
  it("reads layout at most once per frame and cancels on unmount", () => {
    installRaf();
    mockMedia(false);
    const { container, unmount } = render(<CallCharacter state="idle" />);
    const el = container.querySelector(".friend") as HTMLElement;
    const rect = vi.spyOn(el, "getBoundingClientRect");
    moves(40);
    flush();
    expect(rect).toHaveBeenCalledTimes(1);
    expect(el.style.getPropertyValue("--look-x")).not.toBe("");
    moves(5);
    unmount();
    expect(frames.size).toBe(0);
  });
  it("does no pointer work in reduced motion", () => {
    installRaf();
    mockMedia(true);
    const { container } = render(<CallCharacter state="idle" />);
    const el = container.querySelector(".friend") as HTMLElement;
    const rect = vi.spyOn(el, "getBoundingClientRect");
    moves(20);
    flush();
    expect(rect).not.toHaveBeenCalled();
    expect(el.style.getPropertyValue("--look-x")).toBe("0.00");
  });
});
