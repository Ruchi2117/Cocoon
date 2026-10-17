import { z } from "zod";
export const locationInput = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0).max(100000),
    timestamp: z.number().int(),
  })
  .strict();
export const sosInput = z
  .object({
    requestKey: z.string().uuid(),
    recipientIds: z.array(z.string().uuid()).min(1).max(5),
    channel: z.literal("whatsapp"),
    note: z.string().max(500),
    location: locationInput.nullable(),
    locationConsent: z.boolean(),
    destination: z.string().max(160).default("Emergency support request"),
  })
  .strict();
export function validateLocation(
  value: z.infer<typeof locationInput> | null,
  consent: boolean,
  now = Date.now(),
) {
  if (!value) return null;
  if (!consent || value.timestamp > now + 10000 || now - value.timestamp > 120000)
    throw new Error("Location requires consent and a fresh one-time fix.");
  return value;
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export async function tokenHash(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, "0")).join("");
}
export const VOICE_LIMITS = {
  seconds: 600,
  hourlyStarts: 3,
  dailyStarts: 10,
  concurrent: 1,
} as const;

export async function boundedBody(request: Request, maxBytes: number) {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) throw new Error("Too large");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let total = 0,
    text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Too large");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

