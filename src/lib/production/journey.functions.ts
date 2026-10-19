import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { journeyInput, journeyReadSchema } from "./journey-schema";
import { validateLocation } from "./security";
import { privateMutation, privateRead } from "./private-deadline";
export const readPrivateJourneys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ guardian: z.boolean() }).strict())
  .handler(async ({ data, context }) => {
    const result = await privateRead(
      (signal) =>
        context.supabase
          .rpc("read_private_journeys", { p_guardian: data.guardian })
          .abortSignal(signal),
      "Private journeys unavailable. Refresh to retry.",
    );
    return journeyReadSchema.parse(result);
  });
export const writePrivateJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(journeyInput)
  .handler(async ({ data, context }) => {
    validateLocation(data.location, data.locationConsent);
    const { requestKey, ...payload } = data;
    const result = await privateMutation(
      (signal) =>
        context.supabase
          .rpc("write_private_journey", { p_request: requestKey, p_payload: payload })
          .abortSignal(signal),
      "Journey confirmation unavailable: it may have saved. Refresh current status before starting a new journey; retrying the same unchanged action is safe. Rules: one active journey, a future check-in within 24 hours, up to 20 starts and 200 actions per day, current guardian consent.",
    );
    return z.object({ id: z.string().uuid(), duplicate: z.boolean() }).parse(result);
  });
export const setJourneyConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), consent: z.boolean() }).strict())
  .handler(async ({ data, context }) => {
    await privateMutation(
      (signal) =>
        context.supabase
          .rpc("set_journey_consent", { p_id: data.id, p_consent: data.consent })
          .abortSignal(signal),
      "Journey consent confirmation unavailable: it may have changed. Refresh your in-app connections to see the current setting.",
    );
    return { ok: true };
  });
