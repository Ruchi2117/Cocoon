import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { tokenHash, validateLocation } from "./security";
import { emergencyDraftInput, inappAlertSchema, inappSOSInput } from "./inapp-schema";

export const readEmergencyDraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [draft, profile] = await Promise.all([
      context.supabase
        .from("emergency_drafts")
        .select("*")
        .eq("traveller_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("display_name")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);
    if (draft.error || profile.error)
      throw new Error("Emergency preferences unavailable. Refresh to retry.");
    return {
      draft: draft.data
        ? {
            introduction: draft.data.introduction,
            helpInstructions: draft.data.help_instructions,
            preferredRecipientIds: draft.data.preferred_recipient_ids,
          }
        : null,
      senderName: profile.data?.display_name ?? "Traveller",
    };
  });
export const saveEmergencyDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(emergencyDraftInput)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("write_emergency_draft", {
      p_delete: false,
      p_introduction: data.introduction,
      p_help: data.helpInstructions,
      p_recipients: data.preferredRecipientIds,
    });
    if (error) throw new Error("Draft not saved. Refresh current guardian consent and retry.");
    return { ok: true };
  });
export const deleteEmergencyDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("write_emergency_draft", {
      p_delete: true,
      p_introduction: "",
      p_help: "",
      p_recipients: [],
    });
    if (error) throw new Error("Draft not deleted. Retry.");
    return { ok: true };
  });

export const inappAccountData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [contacts, sent] = await Promise.all([
      context.supabase
        .from("inapp_guardians")
        .select(
          "id,traveller_id,recipient_id,name,expires_at,consent,consent_at,revoked_at,created_at,journey_opt_in",
        )
        .order("created_at", { ascending: false }),
      context.supabase
        .from("inapp_alerts")
        .select("*")
        .eq("traveller_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (contacts.error || sent.error)
      throw new Error("In-app account data unavailable. Refresh to retry.");
    return {
      contacts: contacts.data ?? [],
      sent: z.array(inappAlertSchema).parse(sent.data ?? []),
    };
  });

export const inviteInAppGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z
      .object({ name: z.string().trim().min(1).max(60), email: z.string().email().max(254) })
      .strict(),
  )
  .handler(async ({ data, context }) => {
    const token = crypto.randomUUID() + crypto.randomUUID();
    const { error } = await context.supabase.rpc("invite_inapp_guardian", {
      p_name: data.name,
      p_email: data.email,
      p_hash: await tokenHash(token),
    });
    if (error)
      throw new Error(
        "Invitation unavailable: verify your account and keep fewer than ten active invitations.",
      );
    return { token };
  });

export const confirmInAppGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ token: z.string().min(60).max(100), consent: z.literal(true) }).strict(),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("confirm_inapp_guardian", {
      p_hash: await tokenHash(data.token),
      p_consent: data.consent,
    });
    if (error)
      throw new Error(
        "Invitation expired, consumed or unavailable for this verified email. Ask for a new invitation.",
      );
    return { ok: true };
  });

export const revokeInAppGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.string().uuid())
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("revoke_inapp_guardian", { p_id: data });
    if (error) throw new Error("In-app connection could not be revoked. Refresh and retry.");
    return { ok: true };
  });

export const submitInAppSOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(inappSOSInput)
  .handler(async ({ data, context }) => {
    const location = validateLocation(data.location, data.locationConsent);
    if (!data.content) throw new Error("Review the current SOS snapshot before confirming.");
    const { data: result, error } = await context.supabase.rpc("send_inapp_sos_snapshot", {
      p_request: data.requestKey,
      p_recipients: data.recipientIds,
      p_note: data.note,
      p_location: location,
      p_location_consent: data.locationConsent,
      p_content: data.content,
    });
    if (error)
      throw new Error(
        "SOS not saved: refresh guardian consent, check location freshness, or start a new SOS if you changed a retried request.",
      );
    return z
      .object({ id: z.string().uuid(), count: z.number(), duplicate: z.boolean() })
      .parse(result);
  });

// POST: retrieving the authenticated inbox records retrieval, not reading or acknowledgement.
export const retrieveInAppInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("retrieve_inapp_inbox");
    if (error) throw new Error("Guardian inbox unavailable. Refresh to retry.");
    return z.array(inappAlertSchema).parse(data);
  });

export const openInAppAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), acknowledge: z.boolean() }).strict())
  .handler(async ({ data, context }) => {
    const { data: alert, error } = await context.supabase.rpc("open_inapp_alert", {
      p_id: data.id,
      p_ack: data.acknowledge,
    });
    if (error)
      throw new Error(
        "Alert unavailable: consent may be revoked. Open the alert before acknowledging it.",
      );
    return inappAlertSchema.parse(alert);
  });
