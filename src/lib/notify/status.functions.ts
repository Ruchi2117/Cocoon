import { createServerFn } from "@tanstack/react-start";
import { readTwilioConfig } from "./twilio";

/** Reports whether automatic WhatsApp alerts can run. Exposes secret NAMES only, never values. */
export const getWhatsAppStatus = createServerFn({ method: "GET" }).handler(async () => {
  const env = process.env as Record<string, string | undefined>;
  const provider = readTwilioConfig(env, "");
  const storage = Boolean(env["SUPABASE_URL"] && env["SUPABASE_SERVICE_ROLE_KEY"]);
  const auth = storage; // real sign-in requires the backend
  return {
    // Environment variables alone do not mean storage, auth or scheduling is wired.
    live: false as boolean,
    repositoryConnected: false,
    providerConfigured: provider.ok,
    providerMissing: provider.missing,
    storageConfigured: storage,
    authConfigured: auth,
    schedulerSecret: Boolean(env["LOVABLE_CRON_SECRET"]),
  };
});
