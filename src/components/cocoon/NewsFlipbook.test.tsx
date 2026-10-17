import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NewsFlipbook } from "./NewsFlipbook";
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => true,
}));
describe("headline reading context", () => {
  it("keeps the publisher link aligned with the selected story and retains the flip control", async () => {
    render(
      <NewsFlipbook
        items={[
          {
            title: "Sample headline one",
            publisher: "Sample publisher",
            publishedAt: "2026-10-17",
            url: "https://example.org/one",
          },
          {
            title: "Sample headline two",
            publisher: "Sample publisher",
            publishedAt: "2026-10-17",
            url: "https://example.org/two",
          },
        ]}
      />,
    );
    const flip = screen.getByRole("button", { name: "Before you share" });
    flip.focus();
    fireEvent.click(flip);
    await screen.findByText(/PAUSE BEFORE/);
    expect(document.activeElement).toBe(flip);
    fireEvent.click(screen.getByRole("button", { name: "Next headline" }));
    await screen.findByText("Sample headline two");
    expect(screen.getByRole("link", { name: "Read the publisher’s coverage ↗" })).toHaveAttribute(
      "href",
      "https://example.org/two",
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Previous headline" }), {
      key: "ArrowLeft",
    });
    await screen.findByText("Sample headline one");
    expect(screen.getByRole("link", { name: "Read the publisher’s coverage ↗" })).toHaveAttribute(
      "href",
      "https://example.org/one",
    );
  });
});
