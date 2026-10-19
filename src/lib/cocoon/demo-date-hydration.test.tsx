import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

async function harness() {
  const { useDemoState } = await import("./store");
  const { LocalDate } = await import("@/components/cocoon/LocalDate");
  return function DemoDates() {
    const s = useDemoState();
    return createElement(
      "ul",
      null,
      s.circle.posts
        .slice(0, 4)
        .map((p) =>
          createElement("li", { key: p.id }, createElement(LocalDate, { iso: p.createdAt })),
        ),
      s.reports.slice(0, 2).map((r) => createElement("li", { key: r.id }, r.submittedAt)),
    );
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
  localStorage.clear();
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("demo dates hydrate identically across clocks and locales", () => {
  it("server and client snapshots match despite different clocks, then show fresh local dates", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T23:30:00Z")); // warm server, hours earlier
    const ServerTree = await harness();
    const html = renderToString(createElement(ServerTree));

    vi.resetModules();
    vi.setSystemTime(new Date("2026-10-19T03:10:00Z")); // fresh browser, different day
    const real = Date.prototype.toLocaleDateString;
    // Simulate a browser whose default locale/zone formats differently from the server.
    vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(function (
      this: Date,
      locale?: Intl.LocalesArgument,
      opts?: Intl.DateTimeFormatOptions,
    ) {
      return locale === undefined
        ? real.call(this, "de-DE", { ...opts, timeZone: "Asia/Kolkata" })
        : real.call(this, locale, opts);
    });
    const ClientTree = await harness();
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const errors: unknown[] = [];
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});
    await act(async () => {
      hydrateRoot(container, createElement(ClientTree), {
        onRecoverableError: (e) => errors.push(e),
      });
    });
    expect(errors).toEqual([]);
    expect(consoleErr.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    // After hydration the browser's own fresh demo data and local formatting apply.
    const times = [...container.querySelectorAll("time")].map((t) => t.getAttribute("dateTime"));
    expect(times[0]?.startsWith("2026-10-")).toBe(true);
    expect(container.querySelector("time")?.textContent).toMatch(/\d+\. /);
    container.remove();
  });
});
