import { useSyncExternalStore } from "react";
import { makeSeed, PROFILES } from "./seed";
import type { DemoState, Role } from "./types";
import { parseSavedDemo } from "./persistence";

/**
 * Local demo adapter. Persists to localStorage (this browser only) — NOT a production
 * database. Syncs across tabs via the storage event so different roles can be open side by side.
 */
const KEY = "cocoon-demo-v1";
const ROLE_KEY = "cocoon-role-this-tab";
const ACTOR_KEY = "cocoon-actors-this-tab";
function tabActors(): DemoState["actorIds"] {
  const base = makeSeed().actorIds;
  try {
    const saved = JSON.parse(sessionStorage.getItem(ACTOR_KEY) ?? "{}") as Record<string, unknown>;
    for (const r of Object.keys(base) as Role[]) {
      const id = saved[r];
      if (typeof id === "string" && PROFILES.some((p) => p.id === id && p.role === r)) base[r] = id;
    }
  } catch {
    /* unavailable */
  }
  return base;
}
function tabRole(): Role {
  try {
    const r = sessionStorage.getItem(ROLE_KEY);
    if (r && ["traveller", "guardian", "responder", "moderator"].includes(r)) return r as Role;
  } catch {
    /* unavailable */
  }
  return "traveller";
}
let state: DemoState | null = null;
const listeners = new Set<() => void>();

function load(): DemoState {
  if (typeof window === "undefined") return makeSeed();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = parseSavedDemo(JSON.parse(raw));
      if (parsed) {
        // Migrate older saved demo data: strip placeholder citations that looked like real sources.
        const fresh = makeSeed();
        parsed.reports = parsed.reports.map((r) => {
          const f = fresh.reports.find((x) => x.id === r.id);
          return r.sourceUrl?.includes("example.org") && f
            ? { ...r, ...f, flags: r.flags, flaggedBy: r.flaggedBy, moderation: r.moderation }
            : r;
        });
        return { ...parsed, role: tabRole(), actorIds: tabActors() };
      }
    }
  } catch {
    /* fall through */
  }
  return { ...makeSeed(), role: tabRole(), actorIds: tabActors() };
}

export function getState(): DemoState {
  if (!state) state = load();
  return state;
}

export function setState(fn: (s: DemoState) => DemoState) {
  state = fn(getState());
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
  listeners.forEach((l) => l());
}

export function resetDemo() {
  try {
    sessionStorage.setItem(ROLE_KEY, "traveller");
  } catch {
    /* unavailable */
  }
  try {
    sessionStorage.removeItem(ACTOR_KEY);
  } catch {
    /* unavailable */
  }
  setState(() => makeSeed());
}
/** Each demo tab keeps its own role while journey/incident data syncs through localStorage. */
export function setTabRole(role: Role) {
  try {
    sessionStorage.setItem(ROLE_KEY, role);
  } catch {
    /* unavailable */
  }
  setState((s) => ({ ...s, role }));
}
export function setTabActor(role: Role, id: string) {
  if (!PROFILES.some((p) => p.id === id && p.role === role)) return;
  const actors = { ...getState().actorIds, [role]: id };
  try {
    sessionStorage.setItem(ACTOR_KEY, JSON.stringify(actors));
  } catch {
    /* unavailable */
  }
  setState((s) => ({ ...s, actorIds: actors }));
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

let serverSnap: DemoState | null = null;
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Returns the whole (referentially stable) state; derive with plain code / useMemo. */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getState, () => (serverSnap ??= makeSeed()));
}

export const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
export const now = () => new Date().toISOString();
