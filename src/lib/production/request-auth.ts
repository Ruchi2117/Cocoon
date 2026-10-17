import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
/** Raw HTTP endpoints validate the bearer with the auth service, not browser state. */
export async function authenticateRequest(request: Request) {
  const url = process.env["SUPABASE_URL"],
    key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!url || !key || !token) return null;
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { apikey: key, Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || !data.user.email_confirmed_at) return null;
  return { user: data.user, client };
}

