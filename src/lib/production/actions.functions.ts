import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { sosInput, tokenHash, validateLocation } from "./security";
import { CloudNotifyRepo, asJson } from "./notify-repo";
import {
  enqueueEvent,
  cancelOverdue,
  scheduleOverdue,
  type TripSnapshot,
} from "@/lib/notify/engine";
const enabled = z
  .object({
    trip_started: z.boolean(),
    checkin_overdue: z.boolean(),
    concern: z.boolean(),
    sos: z.boolean(),
    arrived: z.boolean(),
  })
  .strict();
function checked(error: { message: string } | null) {
  if (error) throw new Error("Private account data could not be saved.");
}
export const accountData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const [profile, contacts, prefs, messages, sessions] = await Promise.all([
      db.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      db
        .from("guardian_enrollments")
        .select("id,traveller_id,recipient_id,name,phone,consent,consent_at,revoked_at,expires_at")
        .order("created_at", { ascending: false }),
      db.from("alert_preferences").select("*").eq("traveller_id", context.userId).maybeSingle(),
      db
        .from("notify_outbox")
        .select("id,trip_id,recipient_id,status,payload,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("emergency_sessions")
        .select("id,payload,note,location,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    for (const r of [profile, contacts, prefs, messages, sessions]) checked(r.error);
    return {
      userId: context.userId,
      profile: profile.data,
      contacts: contacts.data ?? [],
      prefs: prefs.data,
      messages: messages.data ?? [],
      sessions: sessions.data ?? [],
    };
  });
export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      enabled,
      graceMinutes: z.number().int().min(1).max(60),
      displayName: z.string().min(1).max(60),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("alert_preferences").upsert({
      traveller_id: context.userId,
      enabled: data.enabled,
      grace_minutes: data.graceMinutes,
      channel: "whatsapp",
    });
    checked(error);
    const { error: e } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName })
      .eq("id", context.userId);
    checked(e);
    return { ok: true };
  });
export const inviteGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string().min(1).max(60), email: z.string().email().max(254) }))
  .handler(async ({ data, context }) => {
    const { data: u, error } = await context.supabase.auth.getUser();
    if (error || !u.user?.email_confirmed_at)
      throw new Error("Verify your email before inviting a guardian.");
    const { count, error: countError } = await context.supabase
      .from("guardian_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("traveller_id", context.userId);
    checked(countError);
    if ((count ?? 0) >= 10) throw new Error("Maximum ten enrollments.");
    const token = crypto.randomUUID() + crypto.randomUUID();
    const hash = await tokenHash(token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: e } = await supabaseAdmin.from("guardian_enrollments").insert({
      traveller_id: context.userId,
      name: data.name,
      invited_email: data.email.toLowerCase(),
      token_hash: hash,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    checked(e);
    return { token }; // User-initiated invitation handoff only; never sends an invitation automatically.
  });
export const confirmGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      token: z.string().min(60).max(100),
      phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
      consent: z.literal(true),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("confirm_guardian", {
      p_hash: await tokenHash(data.token),
      p_phone: data.phone,
    });
    if (error) throw new Error("Invitation unavailable for this verified account.");
    return { ok: true };
  });
export const revokeGuardian = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.string().uuid())
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("revoke_guardian", { p_id: data });
    checked(error);
    return { ok: true };
  });
export const acknowledgeAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.string().min(1).max(160))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("ack_notify", { p_id: data });
    checked(error);
    return { ok: true };
  });
export const submitSOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sosInput)
  .handler(async ({ data, context }) => {
    const { data: u, error: authError } = await context.supabase.auth.getUser();
    if (authError || !u.user?.email_confirmed_at) throw new Error("Verified sign-in required.");
    const location = validateLocation(data.location, data.locationConsent);
    const { data: contacts, error } = await context.supabase
      .from("guardian_enrollments")
      .select("id,traveller_id,consent,revoked_at")
      .in("id", data.recipientIds);
    checked(error);
    if (
      !contacts ||
      data.recipientIds.some(
        (id) =>
          !contacts.some(
            (g) =>
              g.id === id &&
              g.traveller_id === context.userId &&
              g.consent === "opted_in" &&
              !g.revoked_at,
          ),
      )
    )
      throw new Error("Select only your confirmed, opted-in guardians.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const repo = new CloudNotifyRepo(supabaseAdmin);
    const rules = await repo.getRules(context.userId);
    if (!rules?.enabled.sos) throw new Error("Enable automatic SOS in your preferences first.");
    const { data: old, error: e } = await context.supabase
      .from("emergency_sessions")
      .select("id,payload")
      .eq("request_key", data.requestKey)
      .eq("traveller_id", context.userId)
      .maybeSingle();
    checked(e);
    const id = old?.id ?? crypto.randomUUID();
    const { data: p, error: profileError } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();
    checked(profileError);
    const snapshot: TripSnapshot = (old?.payload as unknown as TripSnapshot) ?? {
      id,
      travellerId: context.userId,
      travellerName: p?.display_name ?? "Traveller",
      status: "active",
      destination: data.destination,
      etaIso: new Date().toISOString(),
      recipientIds: [...new Set(data.recipientIds)],
      emergencyNote: data.note,
      locationSnapshot: location,
    };
    const messages: import("@/lib/notify/engine").OutboxMessage[] = [];
    const staged: import("@/lib/notify/engine").NotifyRepo = {
      getRules: () => repo.getRules(context.userId),
      getRecipient: (recipientId) => repo.getRecipient(recipientId),
      getTrip: async () => snapshot,
      insertMessage: async (m) => {
        messages.push(m);
        return [m, true];
      },
      updateMessage: async () => {},
      findMessageBySid: async () => null,
      dueMessages: async () => [],
      claimMessage: async () => false,
      upsertJob: async () => {},
      jobsForTrip: async () => [],
      dueJobs: async () => [],
      updateJob: async () => {},
      recordProviderEvent: async () => false,
    };
    const result = await enqueueEvent(staged, {
      actorId: context.userId,
      tripId: id,
      event: "sos",
      origin: "user_action",
    });
    const { data: committed, error: commitError } = await supabaseAdmin.rpc("commit_sos_intent", {
      p_owner: context.userId,
      p_request: data.requestKey,
      p_snapshot: asJson(snapshot),
      p_note: data.note,
      p_location: asJson(location),
      p_messages: asJson(messages),
    });
    checked(commitError);
    if (!committed) throw new Error("Emergency intent not committed.");
    return { id: committed, ...result, dispatch: "queued_not_delivered" };
  });
export const updateEmergency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      action: z.enum(["check_in", "arrived", "cancelled", "concern"]),
      nextDue: z.string().datetime().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("emergency_sessions")
      .select("payload")
      .eq("id", data.id)
      .eq("traveller_id", context.userId)
      .single();
    checked(error);
    if (!row) throw new Error("Session unavailable.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const repo = new CloudNotifyRepo(supabaseAdmin);
    const trip = row.payload as unknown as TripSnapshot;
    if (data.action === "check_in") {
      trip.lastCheckInIso = new Date().toISOString();
      trip.nextCheckInDueIso = data.nextDue;
    }
    if (data.action === "arrived" || data.action === "cancelled")
      trip.status = data.action === "arrived" ? "completed" : "cancelled";
    const { error: e } = await supabaseAdmin
      .from("emergency_sessions")
      .update({ payload: asJson(trip) })
      .eq("id", data.id)
      .eq("traveller_id", context.userId);
    checked(e);
    if (data.action !== "concern")
      await cancelOverdue(repo, data.id, data.action === "check_in" ? "checked_in" : "trip_ended");
    if (data.action === "check_in" && data.nextDue) await scheduleOverdue(repo, trip);
    if (data.action === "arrived" || data.action === "concern")
      await enqueueEvent(repo, {
        actorId: context.userId,
        tripId: trip.id,
        event: data.action,
        origin: "user_action",
        ...(data.action === "concern" ? { occurrence: crypto.randomUUID() } : {}),
      });
    return { ok: true };
  });

