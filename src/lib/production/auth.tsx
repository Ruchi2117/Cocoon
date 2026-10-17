import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
const AuthContext = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});
export function productionAuthConfigured() {
  return Boolean(
    import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
  );
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = productionAuthConfigured();
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(!configured);
  const cache = useQueryClient(),
    router = useRouter();
  useEffect(() => {
    if (!configured) return;
    let active = true;
    // Public demo must remain usable even when the auth service never responds.
    const timeout = setTimeout(() => {
      if (active) setReady(true);
    }, 8000);
    let unsubscribe: (() => void) | undefined;
    try {
      void supabase.auth
        .getUser()
        .then(({ data }) => {
          if (active) setUser(data.user);
        })
        .catch(() => {
          if (active) setUser(null);
        })
        .finally(() => {
          clearTimeout(timeout);
          if (active) setReady(true);
        });
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
        setUser(session?.user ?? null);
        setReady(true);
        void router.invalidate();
        if (event === "SIGNED_OUT") {
          void cache.cancelQueries();
          cache.clear();
        } else void cache.invalidateQueries();
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      clearTimeout(timeout);
      setReady(true);
    }
    return () => {
      active = false;
      clearTimeout(timeout);
      unsubscribe?.();
    };
  }, [cache, router, configured]);
  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>;
}
export const useProductionAuth = () => useContext(AuthContext);
export async function bearerHeaders() {
  if (!productionAuthConfigured()) return {};
  try {
    const { data } = await supabase.auth.getSession();
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  } catch {
    return {};
  }
}
