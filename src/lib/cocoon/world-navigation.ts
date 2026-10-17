import type { MouseEvent } from "react";
export interface WorldEntrance {
  to: string;
  label: string;
  hash?: string;
  x?: number;
  y?: number;
  handled?: boolean;
}
export const WORLD_ENTRANCE = "cocoon:world-entrance";
/** Preserve normal modified-click behaviour and make animation an optional enhancement. */
export function enterWorld(event: MouseEvent<Element>, entrance: WorldEntrance) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const request = { ...entrance, handled: false };
  window.dispatchEvent(new CustomEvent(WORLD_ENTRANCE, { detail: request }));
  if (request.handled) event.preventDefault();
}
