import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAtlasPreview } from "./use-atlas-preview";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("atlas preview intent", () => {
  it("coalesces rapid crossings and commits only the last sustained hover", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useAtlasPreview(true, commit));
    act(() => {
      result.current.schedule("Routes");
      vi.advanceTimersByTime(60);
      result.current.schedule("Circle");
      vi.advanceTimersByTime(119);
    });
    expect(commit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(commit).toHaveBeenCalledExactlyOnceWith("Circle");
  });

  it("leaving an edge cancels accidental entry without changing the scene", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useAtlasPreview(true, commit));
    act(() => {
      result.current.schedule("Routes");
      vi.advanceTimersByTime(50);
      result.current.cancel();
      vi.advanceTimersByTime(200);
    });
    expect(commit).not.toHaveBeenCalled();
  });

  it("keyboard or explicit scene selection is immediate and supersedes hover", () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useAtlasPreview(true, commit));
    act(() => {
      result.current.schedule("Routes");
      result.current.select("Learn");
    });
    expect(commit).toHaveBeenCalledExactlyOnceWith("Learn");
    act(() => vi.advanceTimersByTime(500));
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("closing cancels pending work and reopening cannot resurrect it", () => {
    const commit = vi.fn();
    const { result, rerender } = renderHook(({ open }) => useAtlasPreview(open, commit), {
      initialProps: { open: true },
    });
    act(() => result.current.schedule("Routes"));
    rerender({ open: false });
    act(() => result.current.schedule("Circle"));
    rerender({ open: true });
    act(() => vi.advanceTimersByTime(500));
    expect(commit).not.toHaveBeenCalled();
  });

  it("unmounting cancels a queued preview", () => {
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useAtlasPreview(true, commit));
    act(() => result.current.schedule("Routes"));
    unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(commit).not.toHaveBeenCalled();
  });
});
