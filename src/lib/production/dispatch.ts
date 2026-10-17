import { CloudNotifyRepo } from "./notify-repo";
import { runDispatch } from "@/lib/notify/engine";
import { readTwilioConfig, twilioProvider } from "@/lib/notify/twilio";
import { expireVoiceSessions } from "./voice-service";
import { PROVIDER_POLICY, WHATSAPP_DISABLED } from "./provider-policy";
/** Called only after cron caller verification. Never invoked on page load. */
export async function dispatchProduction(origin: string) {
  if (!PROVIDER_POLICY.whatsapp) return { ran: false, reason: WHATSAPP_DISABLED };
  const env = process.env as Record<string, string | undefined>;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Process expired call controls separately from the message lease.
  await expireVoiceSessions();
  // Recover durable callback work, including callback-before-send-result races.
  const { data: pending, error } = await supabaseAdmin
    .from("notify_webhook_events")
    .select("sid")
    .is("processed_at", null)
    .order("received_at")
    .limit(50);
  if (error) throw new Error("Callback recovery storage unavailable.");
  for (const sid of new Set((pending ?? []).map((e) => e.sid))) {
    const { error: e } = await supabaseAdmin.rpc("reconcile_notify", { p_sid: sid });
    if (e) throw new Error("Callback recovery failed.");
  }
  // Never reclaim ambiguous sending rows: a worker may have sent before crashing.
  const { error: staleError } = await supabaseAdmin.rpc("fail_ambiguous_notify");
  if (staleError) throw new Error("Outbox recovery failed.");
  const cfg = readTwilioConfig(env, origin);
  if (
    !cfg.ok ||
    env["COCOON_WHATSAPP_ENABLED"] !== "true" ||
    env["COCOON_DURABLE_SCHEDULER_READY"] !== "true"
  )
    return { ran: false, reason: "WhatsApp not connected — automatic messages unavailable" };
  const { data: paused, error: e } = await supabaseAdmin
    .from("production_service_state")
    .select("paused")
    .eq("service", "whatsapp")
    .maybeSingle();
  if (e || paused?.paused) return { ran: false, reason: "WhatsApp paused for owner review" };
  const repo = new CloudNotifyRepo(supabaseAdmin);
  const token = crypto.randomUUID();
  const { data: claimed, error: claimError } = await supabaseAdmin.rpc("acquire_notify_worker", {
    p_token: token,
  });
  if (claimError) throw new Error("Worker lease unavailable.");
  if (!claimed) return { ran: false, reason: "Another worker is active" };
  try {
    return { ran: true, ...(await runDispatch(repo, twilioProvider(cfg.config))) };
  } finally {
    const { error: releaseError } = await supabaseAdmin.rpc("release_notify_worker", {
      p_token: token,
    });
    if (releaseError)
      console.error("Worker lease release pending; expiry retains concurrency protection.");
  }
}

