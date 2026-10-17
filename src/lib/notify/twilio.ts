/**
 * Twilio WhatsApp adapter (server-only). Sends approved Content templates from Cocoon's
 * business sender through the Lovable connector gateway, and verifies Twilio status
 * callback signatures (X-Twilio-Signature, HMAC-SHA1 with the account Auth Token).
 * Docs: https://www.twilio.com/docs/whatsapp/api
 *       https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates
 */
import type { NotifyEvent, SendResult, WhatsAppProvider } from "./engine";

export const TEMPLATE_ENV: Record<NotifyEvent, string> = {
  trip_started: "TWILIO_TEMPLATE_TRIP_STARTED",
  checkin_overdue: "TWILIO_TEMPLATE_CHECKIN_OVERDUE",
  concern: "TWILIO_TEMPLATE_CONCERN",
  sos: "TWILIO_TEMPLATE_SOS",
  arrived: "TWILIO_TEMPLATE_ARRIVED",
};
/** Positional variables each approved template must accept, in order. */
export const TEMPLATE_VARS: Record<NotifyEvent, string[]> = {
  trip_started: ["traveller", "destination", "eta"],
  checkin_overdue: ["traveller", "destination", "eta", "note"],
  concern: ["traveller", "destination", "eta"],
  sos: ["traveller", "destination", "eta"],
  arrived: ["traveller", "destination"],
};

export interface TwilioConfig {
  lovableApiKey: string;
  twilioApiKey: string; // connector connection key
  from: string; // E.164 business WhatsApp sender
  statusCallbackUrl: string;
  templates: Record<NotifyEvent, string>; // approved Content SIDs (HX...)
  fetchImpl?: typeof fetch;
}

const GATEWAY = "https://connector-gateway.lovable.dev/twilio";

export function contentVariables(event: NotifyEvent, vars: Record<string, string>) {
  const out: Record<string, string> = {};
  TEMPLATE_VARS[event].forEach((k, i) => (out[String(i + 1)] = (vars[k] ?? "").slice(0, 300)));
  return JSON.stringify(out);
}

export function twilioProvider(cfg: TwilioConfig): WhatsAppProvider {
  const f = cfg.fetchImpl ?? fetch;
  return {
    async send({ toE164Digits, event, vars }): Promise<SendResult> {
      const res = await f(`${GATEWAY}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.lovableApiKey}`,
          "X-Connection-Api-Key": cfg.twilioApiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: `whatsapp:${cfg.from}`,
          To: `whatsapp:+${toE164Digits}`,
          ContentSid: cfg.templates[event],
          ContentVariables: contentVariables(event, vars),
          StatusCallback: cfg.statusCallbackUrl,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        return { ok: false, retryable, error: `Twilio ${res.status}: ${text.slice(0, 300)}` };
      }
      try {
        const sid = (JSON.parse(text) as { sid?: string }).sid;
        return sid
          ? { ok: true, sid }
          : { ok: false, retryable: false, error: "No message SID returned" };
      } catch {
        return { ok: false, retryable: false, error: "Unreadable provider response" };
      }
    },
  };
}

/** Reads config from server env. Returns missing names instead of throwing. */
export function readTwilioConfig(env: Record<string, string | undefined>, origin: string) {
  const need = [
    "LOVABLE_API_KEY",
    "TWILIO_API_KEY",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_FROM",
    ...Object.values(TEMPLATE_ENV),
  ];
  const missing = need.filter((k) => !env[k]);
  if (missing.length) return { ok: false as const, missing };
  const templates = Object.fromEntries(
    Object.entries(TEMPLATE_ENV).map(([e, k]) => [e, env[k]!]),
  ) as Record<NotifyEvent, string>;
  return {
    ok: true as const,
    missing: [] as string[],
    authToken: env["TWILIO_AUTH_TOKEN"]!,
    config: {
      lovableApiKey: env["LOVABLE_API_KEY"]!,
      twilioApiKey: env["TWILIO_API_KEY"]!,
      from: env["TWILIO_WHATSAPP_FROM"]!,
      statusCallbackUrl: `${origin}/api/public/whatsapp/twilio-status`,
      templates,
    } satisfies TwilioConfig,
  };
}

/** Twilio signature: base64(HMAC-SHA1(authToken, url + sorted(key+value)...)). */
export async function computeTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
) {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  let bin = "";
  new Uint8Array(sig).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export async function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
) {
  if (!signature || !authToken) return false;
  const expected = await computeTwilioSignature(authToken, url, params);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
