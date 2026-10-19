import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { tokenHash, validateLocation } from "./security";
import { emergencyDraftInput, inappAlertSchema, inappSOSInput } from "./inapp-schema";
import { privateMutation, privateRead } from "./private-deadline";

export const readEmergencyDraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const message = "Emergency preferences unavailable. Refresh to retry.";
    const [draft, profile] = await Promise.all([
      privateRead(
        (signal) =>
          context.supabase
            .from("emergency_drafts")
            .select("*")
            .eq("traveller_id", context.userId)
            .abortSignal(signal)
            .maybeSingle(),
        message,
      ),
      privateRead(
        (signal) =>
          context.supabase
            .from("profiles")
            .select("display_name")
            .eq("id", context.userId)
            .abortSignal(signal)
            .maybeSingle(),
        message,
      ),
    ]);
    return {
      draft: draft
        ? {
            introduction: draft.introduction,
            helpInstructions: draft.help_instructions,
            preferredRecipientIds: draft.preferred_recipient_ids,
          }
        : null,
      senderName: profile?.display_name ?? "Traveller",
    };
  });
export const saveEmergencyDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(emergencyDraftInput)
  .handler(async ({ data, context }) => {
    await privateMutation(
      (signal) =>
        context.supabase
          .rpc("write_emergency_draft", {
            p_delete: false,
            p_introduction: data.introduction,
            p_help: data.helpInstructions,
            p_recipients: data.preferredRecipientIds,
          })
          .abortSignal(signal),
      "Draft save confirmation unavailable: it may have saved. Refresh to see the current draft and guardian consent before saving again.",
    );
    return { ok: true };
  });
export const deleteEmergencyDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await privateMutation(
      (signal) =>
        context.supabase
          .rpc("write_emergency_draft", {
            p_delete: true,
            p_introduction: "",
            p_help: "",
            p_recipients: [],
          })
          .abortSignal(signal),
      "Draft delete confirmation unavailable: it may have been deleted. Refresh to see the current draft.",
    );
    return { ok: true };
  });

export const inappAccountData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const message = "In-app account data unavailable. Refresh to retry.";
    const [contacts, sent] = await Promise.all([
      privateRead(
        (signal) =>
          context.supabase
            .from("inapp_guardians")
            .select(
              "id,traveller_id,recipient_id,name,expires_at,consent,consent_at,revoked_at,created_at,journey_opt_in",
            )
            .order("created_at", { ascending: false })
            .abortSignal(signal),
        message,
      ),
      privateRead(
        (signal) =>
          context.supabase
            .from("inapp_alerts")
            .select("*")
            .eq("traveller_id", context.userId)
            .order("created_at", { ascending: false })
            .limit(50)
            .abortSignal(signal),
        message,
      ),
    ]);
    return {
      contacts: contacts ?? [],
      sent: z.array(inappAlertSchema).parse(sent ?? []),
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
    const p_hash = await tokenHash(token);
    await privateMutation(
      (signal) =>
        context.supabase
          .rpc("invite_inapp_guardian", { p_name: data.name, p_email: data.email, p_hash })
          .abortSignal(signal),
      "Invitation confirmation unavailable: an invitation may have been created. Refresh your connections before inviting again; you can keep fewer than ten active invitations and need a verified account.",
    );
    return { token };
  });

export const confirmInAppGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ token: z.string().min(60).max(100), consent: z.literal(true) }).strict(),
  )
  .handler(async ({ data, context }) => {
    const p_hash = await tokenHash(data.token);
    await privateMutation(
      (signal) =>
        context.supabase
          .rpc("confirm_inapp_guardian", { p_hash, p_consent: data.consent })
          .abortSignal(signal),
      "Confirmation unavailable: you may already be connected. Refresh your connections; if not connected, the invitation may be expired, used or for another verified email, so ask for a new one.",
    );
    return { ok: true };
  });

export const revokeInAppGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.string().uuid())
  .handler(async ({ data, context }) => {
    await privateMutation(
      (signal) => context.supabase.rpc("revoke_inapp_guardian", { p_id: data }).abortSignal(signal),
      "Revoke confirmation unavailable: the connection may already be revoked. Refresh to see its current state.",
    );
    return { ok: true };
  });

export const submitInAppSOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(inappSOSInput)
  .handler(async ({ data, context }) => {
    const location = validateLocation(data.location, data.locationConsent);
    if (!data.content) throw new Error("Review the current SOS snapshot before confirming.");
    const result = await privateMutation(
      (signal) =>
        context.supabase
          .rpc("send_inapp_sos_snapshot", {
            p_request: data.requestKey,
            p_recipients: data.recipientIds,
            p_note: data.note,
            p_location: location,
            p_location_consent: data.locationConsent,
            p_content: data.content,
          })
          .abortSignal(signal),
      "SOS confirmation unavailable: it may have been saved. Retrying this same unchanged SOS is safe and will not duplicate it. If you changed anything, check sent alerts first; guardian consent or location freshness may also need a refresh.",
    );
    return z
      .object({ id: z.string().uuid(), count: z.number(), duplicate: z.boolean() })
      .parse(result);
  });

// POST: retrieving the authenticated inbox records retrieval, not reading or acknowledgement.
export const retrieveInAppInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const data = await privateRead(
      (signal) => context.supabase.rpc("retrieve_inapp_inbox").abortSignal(signal),
      "Guardian inbox unavailable. Refresh to retry.",
    );
    return z.array(inappAlertSchema).parse(data);
  });

export const openInAppAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), acknowledge: z.boolean() }).strict())
  .handler(async ({ data, context }) => {
    const alert = await privateMutation(
      (signal) =>
        context.supabase
          .rpc("open_inapp_alert", { p_id: data.id, p_ack: data.acknowledge })
          .abortSignal(signal),
      "Alert confirmation unavailable: it may already be opened or acknowledged. Refresh the inbox to see its current state; consent may also have been revoked.",
    );
    return inappAlertSchema.parse(alert);
  });
