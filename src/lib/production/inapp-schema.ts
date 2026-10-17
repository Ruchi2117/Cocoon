import { z } from "zod";
import { locationInput } from "./security";

export const inappSOSInput = z
  .object({
    requestKey: z.string().uuid(),
    recipientIds: z.array(z.string().uuid()).min(1).max(5),
    channel: z.literal("in_app"),
    note: z.string().max(500),
    location: locationInput.nullable(),
    locationConsent: z.boolean(),
  })
  .strict();

export const inappAlertSchema = z.object({
  id: z.string().uuid(),
  sos_id: z.string().uuid(),
  traveller_id: z.string().uuid(),
  enrollment_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
  traveller_name: z.string(),
  note: z.string(),
  location: locationInput.nullable(),
  created_at: z.string(),
  delivered_at: z.string().nullable(),
  read_at: z.string().nullable(),
  acknowledged_at: z.string().nullable(),
});
export type InAppAlert = z.infer<typeof inappAlertSchema>;
export const INAPP_POLL_MS = 30_000;
export const INAPP_LIMITATION =
  "In-app only: guardians must sign in and keep this inbox open. No background or push alerts, SMS, WhatsApp, nearby broadcast or authority dispatch. Cocoon is not an emergency dispatch service.";
