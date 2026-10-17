import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomAtmosphere } from "./RoomAtmosphere";

afterEach(() => vi.restoreAllMocks());

describe("RoomAtmosphere reduced-motion hydration", () => {
  it("hydrates server artwork without mismatch when the browser prefers reduced motion", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: () => true,
    }));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recoverable = vi.fn();
    const host = document.createElement("div");
    host.innerHTML = renderToString(<RoomAtmosphere room="world-city" />);
    document.body.append(host);
    let root: Root | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(host, <RoomAtmosphere room="world-city" />, {
          onRecoverableError: recoverable,
        });
      });
      expect(recoverable).not.toHaveBeenCalled();
      expect(
        errors.mock.calls.filter((args) => /hydrat|didn't match/i.test(String(args[0]))),
      ).toHaveLength(0);
    } finally {
      await act(async () => root?.unmount());
      host.remove();
    }
  });
});
