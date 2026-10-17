import { afterEach, describe, expect, it, vi } from "vitest";
import type { MouseEvent } from "react";
import { enterWorld, WORLD_ENTRANCE, type WorldEntrance } from "./world-navigation";
const event = (overrides = {}) => ({
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  preventDefault: vi.fn(),
  ...overrides,
});
afterEach(() => vi.unstubAllGlobals());
describe("optional world navigation", () => {
  it("does not cancel navigation when the animation host is unavailable", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const click = event();
    enterWorld(click as unknown as MouseEvent<HTMLAnchorElement>, {
      to: "/circle",
      label: "The courtyard",
    });
    expect(click.preventDefault).not.toHaveBeenCalled();
  });
  it("hands navigation over only after a mounted host accepts it", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    let received: WorldEntrance | undefined;
    const accept = (e: Event) => {
      received = (e as CustomEvent<WorldEntrance>).detail;
      received.handled = true;
    };
    window.addEventListener(WORLD_ENTRANCE, accept);
    try {
      const click = event();
      enterWorld(click as unknown as MouseEvent<HTMLAnchorElement>, {
        to: "/circle",
        label: "The courtyard",
      });
      expect(received?.to).toBe("/circle");
      expect(click.preventDefault).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener(WORLD_ENTRANCE, accept);
    }
  });
  it("preserves new-tab, middle-click and already-handled link behaviour", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const listener = vi.fn();
    window.addEventListener(WORLD_ENTRANCE, listener);
    try {
      for (const override of [
        { ctrlKey: true },
        { metaKey: true },
        { shiftKey: true },
        { altKey: true },
        { button: 1 },
        { defaultPrevented: true },
      ]) {
        const click = event(override);
        enterWorld(click as unknown as MouseEvent<HTMLAnchorElement>, {
          to: "/learn",
          label: "Library",
        });
        expect(click.preventDefault).not.toHaveBeenCalled();
      }
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(WORLD_ENTRANCE, listener);
    }
  });
  it("keeps normal immediate navigation for reduced-motion preferences", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const listener = vi.fn();
    window.addEventListener(WORLD_ENTRANCE, listener);
    try {
      const click = event();
      enterWorld(click as unknown as MouseEvent<HTMLAnchorElement>, {
        to: "/learn",
        label: "Library",
      });
      expect(listener).not.toHaveBeenCalled();
      expect(click.preventDefault).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(WORLD_ENTRANCE, listener);
    }
  });
});
