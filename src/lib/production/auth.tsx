import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
const AuthContext = createContext<{ user: User | null; ready: boolean }>({
  user: null,
  ready: false,
});
export const productionAuthConfigured = () =>
  !!(import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(() => !productionAuthConfigured());
  const cache = useQueryClient(),
    router = useRouter();
  useEffect(() => {
    if (!productionAuthConfigured()) return;
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) {
          setUser(data.user);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      setUser(session?.user ?? null);
      setReady(true);
      void router.invalidate();
      if (event === "SIGNED_OUT") {
        void cache.cancelQueries();
        cache.clear();
      } else void cache.invalidateQueries();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [cache, router]);
  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>;
}
export const useProductionAuth = () => useContext(AuthContext);
export async function bearerHeaders() {
  if (!productionAuthConfigured()) return {};
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
