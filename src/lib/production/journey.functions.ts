import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { journeyInput, journeyReadSchema } from "./journey-schema";
import { validateLocation } from "./security";
export const readPrivateJourneys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ guardian: z.boolean() }).strict())
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("read_private_journeys", {
      p_guardian: data.guardian,
    });
    if (error) throw new Error("Private journeys unavailable. Refresh to retry.");
    return journeyReadSchema.parse(result);
  });
export const writePrivateJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(journeyInput)
  .handler(async ({ data, context }) => {
    validateLocation(data.location, data.locationConsent);
    const { requestKey, ...payload } = data;
    const { data: result, error } = await context.supabase.rpc("write_private_journey", {
      p_request: requestKey,
      p_payload: payload,
    });
    if (error)
      throw new Error(
        "Journey not saved. Refresh current status and guardian consent; choose a future check-in within 24 hours. Only one active journey, up to 20 starts and 200 actions per day. A changed retry needs a new request.",
      );
    return z.object({ id: z.string().uuid(), duplicate: z.boolean() }).parse(result);
  });
export const setJourneyConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), consent: z.boolean() }).strict())
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_journey_consent", {
      p_id: data.id,
      p_consent: data.consent,
    });
    if (error) throw new Error("Journey consent unavailable. Refresh your in-app connections.");
    return { ok: true };
  });
