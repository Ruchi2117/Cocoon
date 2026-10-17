import { createFileRoute } from "@tanstack/react-router";
import { verifyTwilioSignature } from "@/lib/notify/twilio";

/**
 * Twilio WhatsApp status callback. Verifies X-Twilio-Signature before anything else.
 * Once outbox storage exists, verified events go to applyProviderStatus() (idempotent,
 * replay-safe, never downgrades delivered/read). Until then it refuses with 503 so Twilio
 * retries rather than losing events silently.
 */
export const Route = createFileRoute("/api/public/whatsapp/twilio-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authToken = process.env["TWILIO_AUTH_TOKEN"];
        if (!authToken) return new Response("WhatsApp provider not configured", { status: 503 });
        const raw = await request.text();
        if (raw.length > 20_000) return new Response("Too large", { status: 413 });
        const params = Object.fromEntries(new URLSearchParams(raw));
        const ok = await verifyTwilioSignature(
          authToken,
          request.url,
          params,
          request.headers.get("x-twilio-signature"),
        );
        if (!ok) return new Response("Invalid signature", { status: 401 });
        if (!params["MessageSid"] || !params["MessageStatus"])
          return new Response("Bad request", { status: 400 });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { tokenHash } = await import("@/lib/production/security");
          const key = await tokenHash(
            JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b))),
          );
          const { error } = await supabaseAdmin.rpc("store_notify_callback", {
            p_key: key,
            p_sid: params["MessageSid"],
            p_status: params["MessageStatus"],
            p_payload: params,
          });
          if (error) return new Response("Callback persistence pending", { status: 503 });
          return new Response("Stored", { status: 200 });
        } catch {
          return new Response("Callback storage unavailable", { status: 503 });
        }
      },
    },
  },
});

