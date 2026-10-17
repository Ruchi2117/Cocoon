import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type {
  NotifyRepo,
  Rules,
  Recipient,
  TripSnapshot,
  OutboxMessage,
  OverdueJob,
} from "@/lib/notify/engine";
export const asJson = (v: unknown) => JSON.parse(JSON.stringify(v)) as Json;
function check(error: { message: string } | null) {
  if (error) throw new Error("Private storage operation failed.");
}
/** Construct ONLY inside authenticated handlers or signature/cron-verified handlers. */
export class CloudNotifyRepo implements NotifyRepo {
  constructor(private db: SupabaseClient<Database>) {}
  async getRules(id: string): Promise<Rules | null> {
    const { data, error } = await this.db
      .from("alert_preferences")
      .select("*")
      .eq("traveller_id", id)
      .maybeSingle();
    check(error);
    return data
      ? {
          travellerId: id,
          enabled: data.enabled as unknown as Rules["enabled"],
          graceMinutes: data.grace_minutes,
        }
      : null;
  }
  async getRecipient(id: string): Promise<Recipient | null> {
    const { data, error } = await this.db
      .from("guardian_enrollments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    check(error);
    return data
      ? {
          id: data.id,
          travellerId: data.traveller_id,
          name: data.name,
          phone: data.phone ?? "",
          optIn: data.revoked_at ? "opted_out" : (data.consent as Recipient["optIn"]),
          optInAt: data.consent_at ?? undefined,
        }
      : null;
  }
  async getTrip(id: string): Promise<TripSnapshot | null> {
    const { data, error } = await this.db
      .from("emergency_sessions")
      .select("payload")
      .eq("id", id)
      .maybeSingle();
    check(error);
    return data?.payload as unknown as TripSnapshot | null;
  }
  async insertMessage(m: OutboxMessage): Promise<[OutboxMessage, boolean]> {
    const { error } = await this.db.from("notify_outbox").insert({
      id: m.id,
      idempotency_key: m.idempotencyKey,
      trip_id: m.tripId,
      traveller_id: m.travellerId,
      recipient_id: m.recipientId,
      status: m.status,
      next_attempt_at: m.nextAttemptAt,
      payload: asJson(m),
    });
    if (error?.code === "23505") {
      const { data, error: e } = await this.db
        .from("notify_outbox")
        .select("payload")
        .eq("idempotency_key", m.idempotencyKey)
        .single();
      check(e);
      return [data?.payload as unknown as OutboxMessage, false];
    }
    check(error);
    return [m, true];
  }
  async updateMessage(id: string, patch: Partial<OutboxMessage>) {
    const { error } = await this.db.rpc("patch_notify", { p_id: id, p_patch: asJson(patch) });
    check(error);
  }
  async findMessageBySid(sid: string) {
    const { data, error } = await this.db
      .from("notify_outbox")
      .select("payload")
      .eq("provider_sid", sid)
      .maybeSingle();
    check(error);
    return data?.payload as unknown as OutboxMessage | null;
  }
  async dueMessages(now: string, limit: number) {
    const { data, error } = await this.db
      .from("notify_outbox")
      .select("payload")
      .eq("status", "queued")
      .lte("next_attempt_at", now)
      .order("next_attempt_at")
      .limit(Math.min(limit, 1));
    check(error);
    return (data ?? []).map((r) => r.payload as unknown as OutboxMessage);
  }
  async claimMessage(id: string) {
    const { data, error } = await this.db.rpc("claim_notify", { p_id: id });
    check(error);
    return data === true;
  }
  async upsertJob(j: OverdueJob) {
    const { error } = await this.db.from("notify_jobs").upsert(
      {
        id: j.id,
        job_key: j.key,
        trip_id: j.tripId,
        status: j.status,
        run_at: j.runAt,
        payload: asJson(j),
      },
      { onConflict: "job_key" },
    );
    check(error);
  }
  async jobsForTrip(id: string) {
    const { data, error } = await this.db.from("notify_jobs").select("payload").eq("trip_id", id);
    check(error);
    return (data ?? []).map((r) => r.payload as unknown as OverdueJob);
  }
  async dueJobs(now: string, limit: number) {
    const { data, error } = await this.db
      .from("notify_jobs")
      .select("payload")
      .eq("status", "scheduled")
      .lte("run_at", now)
      .order("run_at")
      .limit(Math.min(limit, 1));
    check(error);
    return (data ?? []).map((r) => r.payload as unknown as OverdueJob);
  }
  async updateJob(id: string, patch: Partial<OverdueJob>) {
    const { data, error } = await this.db
      .from("notify_jobs")
      .select("payload")
      .eq("id", id)
      .single();
    check(error);
    const updated = { ...(data?.payload as unknown as OverdueJob), ...patch };
    const { error: e } = await this.db
      .from("notify_jobs")
      .update({ payload: asJson(updated), status: updated.status })
      .eq("id", id);
    check(e);
  }
  async recordProviderEvent(): Promise<boolean> {
    throw new Error("Use transactional store_notify_callback, not non-atomic engine callbacks.");
  }
}

