import { useSyncExternalStore } from "react";

const KEY = "cocoon-entry-session-v1";
const CHANGE = "cocoon-entry-complete";
let memoryEntry = false;
let storageUnavailable = false;
function snapshot() {
  if (typeof window === "undefined") return false;
  if (storageUnavailable) return memoryEntry;
  try {
    return window.sessionStorage.getItem(KEY) === "entered";
  } catch {
    return memoryEntry;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener(CHANGE, listener);
  return () => window.removeEventListener(CHANGE, listener);
}
/** Entry is a skippable introduction, independent of authentication and demo reset. */
export function completeEntry() {
  memoryEntry = true;
  try {
    window.sessionStorage.setItem(KEY, "entered");
  } catch {
    storageUnavailable = true;
  }
  window.dispatchEvent(new Event(CHANGE));
}
export const useEntryComplete = () => useSyncExternalStore(subscribe, snapshot, () => false);
