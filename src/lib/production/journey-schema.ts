import { z } from "zod";
import { locationInput } from "./security";
export const journeyInput = z
  .object({
    requestKey: z.string().uuid(),
    action: z.enum(["start", "check_in", "arrived", "cancelled", "stop_sharing"]),
    journeyId: z.string().uuid().optional(),
    destination: z.string().trim().min(1).max(160).optional(),
    expectedAt: z.string().datetime().optional(),
    recipientIds: z.array(z.string().uuid()).min(1).max(5).optional(),
    note: z.string().max(500),
    location: locationInput.nullable(),
    locationConsent: z.boolean(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.action === "start" && (!v.destination || !v.recipientIds || !v.expectedAt))
      ctx.addIssue({ code: "custom", message: "Review destination, guardians and check-in time." });
    if (v.action !== "start" && !v.journeyId)
      ctx.addIssue({ code: "custom", message: "Choose your journey." });
    if (v.action === "check_in" && !v.expectedAt)
      ctx.addIssue({ code: "custom", message: "Choose the next check-in time." });
  });
export type JourneyInput = z.infer<typeof journeyInput>;
export const journeySchema = z.object({
  id: z.string().uuid(),
  traveller_id: z.string().uuid(),
  destination: z.string(),
  expected_at: z.string(),
  status: z.enum(["active", "arrived", "cancelled"]),
  sharing: z.boolean(),
  note: z.string(),
  location: locationInput.nullable(),
  last_check_in_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  overdue: z.boolean(),
  traveller_name: z.string(),
});
export const journeyReadSchema = z.object({
  serverNow: z.string(),
  journeys: z.array(journeySchema),
});
export type PrivateJourney = z.infer<typeof journeySchema>;
export const JOURNEY_LIMITATION =
  "Private in-app journey · guardians must sign in and keep their inbox open. Manual check-ins and optional one-time snapshots only; no live tracking, background/push alerts, SMS, WhatsApp or authority dispatch. Check-in overdue is not proof of danger.";
