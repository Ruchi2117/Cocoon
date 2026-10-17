import { z } from "zod";
import { locationInput } from "./security";

export const emergencyDraftInput = z
  .object({
    introduction: z.string().max(300),
    helpInstructions: z.string().max(500),
    preferredRecipientIds: z.array(z.string().uuid()).max(5),
  })
  .strict()
  .refine(
    (v) => new Set(v.preferredRecipientIds).size === v.preferredRecipientIds.length,
    "Duplicate recipients",
  );
export const sosContent = z
  .object({
    introduction: z.string().max(300),
    helpInstructions: z.string().max(500),
    includeDraft: z.boolean(),
    senderName: z.string().min(1).max(60),
    preparedAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (v) => v.includeDraft || (!v.introduction && !v.helpInstructions),
    "Omitted draft must be empty",
  );

export const inappSOSInput = z
  .object({
    requestKey: z.string().uuid(),
    recipientIds: z.array(z.string().uuid()).min(1).max(5),
    channel: z.literal("in_app"),
    note: z.string().max(500),
    location: locationInput.nullable(),
    locationConsent: z.boolean(),
    content: sosContent,
  })
  .strict()
  .refine(
    (v) => new Set(v.recipientIds).size === v.recipientIds.length,
    "Duplicate SOS recipients",
  );

export const inappAlertSchema = z.object({
  id: z.string().uuid(),
  sos_id: z.string().uuid(),
  traveller_id: z.string().uuid(),
  enrollment_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
  traveller_name: z.string(),
  introduction: z.string().default(""),
  help_instructions: z.string().default(""),
  draft_included: z.boolean().default(false),
  prepared_at: z.string().nullable().default(null),
  recipient_name: z.string().default("Guardian"),
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
