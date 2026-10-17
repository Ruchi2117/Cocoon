import { describe, expect, it } from "vitest";
import { couragePocket, COURAGE_SCENES } from "./courage-studio";
describe("Courage Studio pocket notes", () => {
  it("keeps the selected response and its source aligned for all six branches", () => {
    COURAGE_SCENES.forEach((scene, i) =>
      scene.choices.forEach((choice, j) => {
        const note = couragePocket(i, j)!;
        expect(note).toContain(choice.pocket);
        expect(note).toContain(choice.title);
        expect(note).toContain(scene.url);
        expect(note).toContain("Harm is never your fault");
      }),
    );
  });
  it("does not fabricate a note before a valid selection", () => {
    expect(couragePocket(-1, 0)).toBeNull();
    expect(couragePocket(0, -1)).toBeNull();
    expect(couragePocket(99, 0)).toBeNull();
    expect(couragePocket(0, 99)).toBeNull();
  });
});
