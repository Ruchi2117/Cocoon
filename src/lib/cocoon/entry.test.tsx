import { beforeEach, afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { completeEntry, useEntryComplete } from "./entry";

function EntryProbe() {
  const complete = useEntryComplete();
  return complete ? <p>World</p> : <button onClick={completeEntry}>Skip intro</button>;
}
beforeEach(() => sessionStorage.clear());
afterEach(cleanup);
it("opens with the introduction, then enters the world without a reload", () => {
  render(<EntryProbe />);
  fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
  expect(screen.getByText("World")).toBeVisible();
});
it("remembers entry across remounts in the same tab", () => {
  completeEntry();
  const first = render(<EntryProbe />);
  expect(screen.getByText("World")).toBeVisible();
  first.unmount();
  render(<EntryProbe />);
  expect(screen.getByText("World")).toBeVisible();
});
it("server renders the entry without requiring browser storage", () => {
  completeEntry();
  expect(renderToString(<EntryProbe />)).toContain("Skip intro");
});
