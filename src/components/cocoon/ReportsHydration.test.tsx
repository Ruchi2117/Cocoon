import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { ReportType } from "./ReportType";
import { NewsFlipbook } from "./NewsFlipbook";
import { ScrollWords } from "./ScrollWords";

const items = [
  {
    title: "Sample headline one",
    publisher: "P",
    publishedAt: "2026-10-17T00:00:00Z",
    url: "https://example.org/1",
  },
  {
    title: "Sample headline two",
    publisher: "P",
    publishedAt: "2026-10-17T00:00:00Z",
    url: "https://example.org/2",
  },
];

function setReduced(reduce: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: reduce && q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

async function hydrate(ui: React.ReactElement) {
  const html = renderToString(ui);
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  const errors: unknown[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...a) => errors.push(a));
  await act(async () => {
    hydrateRoot(el, ui, { onRecoverableError: (e) => errors.push(e) });
  });
  spy.mockRestore();
  return { el, errors };
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  document.body.innerHTML = "";
});

// motion caches the media query per module; reduced mode lives in ReportsHydrationReduced.test.tsx.
describe.each([false])("Reports motion hydration (reduced=%s)", (reduced) => {
  it("ReportType hydrates without mismatch and then reflects the preference on its control", async () => {
    setReduced(reduced);
    const { el, errors } = await hydrate(<ReportType />);
    expect(errors.map((e) => String(Array.isArray(e) ? e[0] : e).slice(0, 300))).toEqual([]);
    const btn = el.querySelector("button")!;
    expect(btn.disabled).toBe(reduced);
    expect(btn.getAttribute("aria-pressed")).toBe(String(reduced));
  });

  it("NewsFlipbook and ScrollWords hydrate cleanly and still paginate", async () => {
    setReduced(reduced);
    const { el, errors } = await hydrate(
      <>
        <ScrollWords text="STAY INFORMED." />
        <NewsFlipbook items={items} />
      </>,
    );
    expect(errors.map((e) => String(Array.isArray(e) ? e[0] : e).slice(0, 300))).toEqual([]);
    expect(el.textContent).toContain("STAY INFORMED.");
    const next = el.querySelector<HTMLButtonElement>('[aria-label="Next headline"]')!;
    await act(async () => next.click());
    await act(async () => new Promise((r) => setTimeout(r, 500)));
    expect(el.textContent).toContain("2 / 2");
    expect(el.querySelector('a[href="https://example.org/2"]')).not.toBeNull();
  });
});
