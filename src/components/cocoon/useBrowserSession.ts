import { useEffect, useRef, useState } from "react";
import {
  BrowserSession,
  browserSpeechPort,
  INITIAL_SESSION,
  type BrowserSpeechPort,
} from "@/lib/cocoon/browser-session";
import type { RoomProvider, ScriptContext } from "@/lib/cocoon/presence-script";

export function useBrowserSession(
  context: () => Omit<ScriptContext, "intent" | "turn">,
  portFactory: () => BrowserSpeechPort = browserSpeechPort,
  provider?: RoomProvider,
) {
  const [snapshot, setSnapshot] = useState(INITIAL_SESSION);
  const controller = useRef<BrowserSession | null>(null);
  const contextRef = useRef(context);
  contextRef.current = context;
  useEffect(() => {
    const session = new BrowserSession(portFactory(), provider, () => contextRef.current());
    controller.current = session;
    const unsubscribe = session.subscribe(setSnapshot);
    setSnapshot(session.snapshot());
    const visibility = () => session.setVisible(!document.hidden);
    const leave = () => session.end();
    visibility();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", leave);
    return () => {
      unsubscribe();
      session.dispose();
      controller.current = null;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", leave);
    };
  }, [portFactory, provider]);
  return { snapshot, controller };
}
