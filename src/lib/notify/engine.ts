/**
 * Automatic WhatsApp safety notifications: provider-agnostic outbox engine.
 *
 * Pure server-side logic over a `NotifyRepo` (durable storage) and a `WhatsAppProvider`.
 * - Events come only from authenticated user actions or the server scheduler, never AI inference.
 * - Each recipient must be enrolled, opted in, have a valid E.164 number and be attached to the trip.
 * - Idempotency keys dedupe duplicate events; sends retry a bounded number of times.
 * - Overdue check-in jobs are re-validated against current trip state at dispatch time.
 * - Provider status (queued/sent/delivered/read/failed) is applied only from verified provider
 *   callbacks and is tracked separately from any recipient acknowledgement.
 */
import { intlDigits } from "@/lib/cocoon/share";

export type NotifyEvent = "trip_started" | "checkin_overdue" | "concern" | "sos" | "arrived";
export type EventOrigin = "user_action" | "scheduler";

export interface Rules {
  travellerId: string;
  enabled: Record<NotifyEvent, boolean>;
  /** Minutes after a missed check-in before an overdue alert is sent. */
  graceMinutes: number;
}

export type OptIn = "invited" | "opted_in" | "opted_out";
export interface Recipient {
  id: string;
  travellerId: string;
  name: string;
  phone: string; // as entered; validated to E.164 at enqueue and dispatch
  optIn: OptIn;
  optInAt?: string | undefined;
}

export interface TripSnapshot {
  id: string;
  travellerId: string;
  travellerName?: string | undefined;
  emergencyNote?: string | undefined;
  locationSnapshot?: {
    latitude: number;
    longitude: number;
    timestamp: number;
    accuracy: number;
  } | null;
  status: "active" | "completed" | "cancelled";
  destination: string;
  etaIso: string;
  /** Recipient ids the traveller attached to this trip (per-trip consent). */
  recipientIds: string[];
  nextCheckInDueIso?: string | undefined;
  lastCheckInIso?: string | undefined;
}

export type MessageStatus =
  | "queued" // in Cocoon's outbox, not yet accepted by the provider
  | "sending" // claimed by a worker
  | "accepted" // provider API accepted the request (not yet sent)
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "undelivered"
  | "cancelled";

export interface OutboxMessage {
  id: string;
  idempotencyKey: string;
  tripId: string;
  travellerId: string;
  recipientId: string;
  event: NotifyEvent;
  origin: EventOrigin;
  vars: Record<string, string>;
  status: MessageStatus;
  attempts: number;
  nextAttemptAt: string;
  providerSid?: string | undefined;
  lastError?: string | undefined;
  statusTimes: Partial<Record<MessageStatus, string>>;
  /** Recipient acknowledgement is separate from provider delivery state. */
  acknowledgedAt?: string | undefined;
  createdAt: string;
  checkInDueIso?: string | undefined;
}

export interface OverdueJob {
  id: string;
  key: string; // tripId:dueIso — one job per due time
  tripId: string;
  dueIso: string;
  runAt: string;
  status: "scheduled" | "cancelled" | "fired" | "skipped";
  reason?: string | undefined;
}

export interface NotifyRepo {
  getRules(travellerId: string): Promise<Rules | null>;
  getRecipient(id: string): Promise<Recipient | null>;
  getTrip(id: string): Promise<TripSnapshot | null>;
  /** Insert unless idempotencyKey exists; returns [row, created]. */
  insertMessage(m: OutboxMessage): Promise<[OutboxMessage, boolean]>;
  updateMessage(id: string, patch: Partial<OutboxMessage>): Promise<void>;
  findMessageBySid(sid: string): Promise<OutboxMessage | null>;
  dueMessages(nowIso: string, limit: number): Promise<OutboxMessage[]>;
  /** Atomically move queued -> sending; false if another worker claimed it. */
  claimMessage(id: string): Promise<boolean>;
  upsertJob(j: OverdueJob): Promise<void>;
  jobsForTrip(tripId: string): Promise<OverdueJob[]>;
  dueJobs(nowIso: string, limit: number): Promise<OverdueJob[]>;
  updateJob(id: string, patch: Partial<OverdueJob>): Promise<void>;
  /** Returns false if this provider event id was already processed (replay). */
  recordProviderEvent(eventId: string): Promise<boolean>;
}

export interface SendResult {
  ok: boolean;
  sid?: string;
  retryable?: boolean;
  error?: string;
}
export interface WhatsAppProvider {
  send(input: {
    toE164Digits: string;
    event: NotifyEvent;
    vars: Record<string, string>;
  }): Promise<SendResult>;
}

export const MAX_ATTEMPTS = 5;
export const backoffMs = (attempt: number) => Math.min(30 * 60_000, 30_000 * 2 ** (attempt - 1));

export class NotifyError extends Error {
  constructor(
    public code: "forbidden" | "not_found" | "invalid_origin" | "invalid_state",
    msg: string,
  ) {
    super(msg);
  }
}

const uid = (p: string) => `${p}_${crypto.randomUUID()}`;

/** Message variables — structured trip facts only; never transcripts or free text from AI. */
export function templateVars(trip: TripSnapshot, event: NotifyEvent): Record<string, string> {
  const v: Record<string, string> = {
    traveller: trip.travellerName ?? "Your trusted contact",
    destination: trip.destination,
    eta: trip.etaIso,
  };
  if (event === "checkin_overdue")
    v["note"] =
      "A planned check-in was missed. This does not mean something is wrong — please try contacting them.";
  if (event === "sos") {
    const l = trip.locationSnapshot;
    v["note"] = trip.emergencyNote || "No note provided";
    v["location"] = l
      ? `https://www.openstreetmap.org/?mlat=${l.latitude}&mlon=${l.longitude}#map=16/${l.latitude}/${l.longitude}`
      : "No location shared";
    v["location_time"] = l ? new Date(l.timestamp).toISOString() : "Not available";
    v["accuracy"] = l
      ? `${Math.round(l.accuracy)} m; one-time snapshot, not live tracking`
      : "Not available";
  }
  return v;
}

export interface EnqueueResult {
  created: string[];
  duplicates: string[];
  skipped: { recipientId: string; reason: string }[];
}

/**
 * Creates outbox rows for one event. `actorId` must be the authenticated traveller for user
 * actions; the scheduler may only emit `checkin_overdue`.
 */
export async function enqueueEvent(
  repo: NotifyRepo,
  args: {
    actorId: string | null;
    tripId: string;
    event: NotifyEvent;
    origin: EventOrigin;
    occurrence?: string;
    now?: Date;
  },
): Promise<EnqueueResult> {
  const now = args.now ?? new Date();
  if (args.origin === "scheduler" && args.event !== "checkin_overdue")
    throw new NotifyError("invalid_origin", "Scheduler may only create overdue check-in alerts.");
  if (args.origin === "user_action" && args.event === "checkin_overdue")
    throw new NotifyError("invalid_origin", "Overdue alerts come from the server scheduler only.");
  const trip = await repo.getTrip(args.tripId);
  if (!trip) throw new NotifyError("not_found", "Trip not found.");
  if (args.origin === "user_action" && args.actorId !== trip.travellerId)
    throw new NotifyError("forbidden", "Only the traveller can trigger alerts for this trip.");
  if (trip.status !== "active" && args.event !== "arrived")
    throw new NotifyError("invalid_state", "Trip is not active.");

  const res: EnqueueResult = { created: [], duplicates: [], skipped: [] };
  const rules = await repo.getRules(trip.travellerId);
  if (!rules?.enabled[args.event]) return res;

  for (const rid of trip.recipientIds) {
    const r = await repo.getRecipient(rid);
    if (!r || r.travellerId !== trip.travellerId) {
      res.skipped.push({ recipientId: rid, reason: "not_enrolled" });
      continue;
    }
    if (r.optIn !== "opted_in") {
      res.skipped.push({
        recipientId: rid,
        reason: r.optIn === "opted_out" ? "opted_out" : "not_opted_in",
      });
      continue;
    }
    if (!intlDigits(r.phone)) {
      res.skipped.push({ recipientId: rid, reason: "invalid_number" });
      continue;
    }
    const key = `${trip.id}:${args.event}:${args.occurrence ?? "once"}:${rid}`;
    const [row, created] = await repo.insertMessage({
      id: uid("msg"),
      idempotencyKey: key,
      tripId: trip.id,
      travellerId: trip.travellerId,
      recipientId: rid,
      event: args.event,
      origin: args.origin,
      vars: templateVars(trip, args.event),
      status: "queued",
      attempts: 0,
      nextAttemptAt: now.toISOString(),
      statusTimes: { queued: now.toISOString() },
      createdAt: now.toISOString(),
      checkInDueIso: args.event === "checkin_overdue" ? args.occurrence : undefined,
    });
    (created ? res.created : res.duplicates).push(row.id);
  }
  return res;
}

/** Schedule (or reschedule) the overdue job for the trip's next due check-in. */
export async function scheduleOverdue(repo: NotifyRepo, trip: TripSnapshot) {
  if (!trip.nextCheckInDueIso || trip.status !== "active") return null;
  const rules = await repo.getRules(trip.travellerId);
  if (!rules?.enabled.checkin_overdue) return null;
  const runAt = new Date(new Date(trip.nextCheckInDueIso).getTime() + rules.graceMinutes * 60_000);
  const job: OverdueJob = {
    id: uid("job"),
    key: `${trip.id}:${trip.nextCheckInDueIso}`,
    tripId: trip.id,
    dueIso: trip.nextCheckInDueIso,
    runAt: runAt.toISOString(),
    status: "scheduled",
  };
  for (const j of await repo.jobsForTrip(trip.id))
    if (j.status === "scheduled" && j.key !== job.key)
      await repo.updateJob(j.id, { status: "cancelled", reason: "rescheduled" });
  await repo.upsertJob(job);
  return job;
}

/** Called on check-in and arrival/end. */
export async function cancelOverdue(
  repo: NotifyRepo,
  tripId: string,
  reason: "checked_in" | "trip_ended",
) {
  for (const j of await repo.jobsForTrip(tripId))
    if (j.status === "scheduled") await repo.updateJob(j.id, { status: "cancelled", reason });
}

/** One worker pass. Run by a durable server scheduler (cron), never by a browser timer. */
export async function runDispatch(repo: NotifyRepo, provider: WhatsAppProvider, now = new Date()) {
  const nowIso = now.toISOString();
  const report = { jobsFired: 0, jobsSkipped: 0, sent: 0, retried: 0, failed: 0, cancelled: 0 };

  for (const j of await repo.dueJobs(nowIso, 50)) {
    if (j.status !== "scheduled") continue;
    const trip = await repo.getTrip(j.tripId);
    const checkedIn = trip?.lastCheckInIso && trip.lastCheckInIso >= j.dueIso;
    if (!trip || trip.status !== "active" || checkedIn || trip.nextCheckInDueIso !== j.dueIso) {
      await repo.updateJob(j.id, {
        status: "skipped",
        reason:
          !trip || trip.status !== "active"
            ? "trip_not_active"
            : checkedIn
              ? "checked_in"
              : "rescheduled",
      });
      report.jobsSkipped++;
      continue;
    }
    await enqueueEvent(repo, {
      actorId: null,
      tripId: trip.id,
      event: "checkin_overdue",
      origin: "scheduler",
      occurrence: j.dueIso,
      now,
    });
    await repo.updateJob(j.id, { status: "fired" });
    report.jobsFired++;
  }

  for (const m of await repo.dueMessages(nowIso, 50)) {
    if (m.status !== "queued" || !(await repo.claimMessage(m.id))) continue;
    // Revalidate consent and state at dispatch time.
    const r = await repo.getRecipient(m.recipientId);
    const trip = await repo.getTrip(m.tripId);
    const rules = await repo.getRules(m.travellerId);
    const digits = r ? intlDigits(r.phone) : null;
    let cancelReason: string | null = null;
    if (trip?.status === "cancelled" || (trip?.status === "completed" && m.event !== "arrived"))
      cancelReason = "session_ended";
    else if (!r || r.optIn !== "opted_in") cancelReason = "recipient_not_opted_in";
    else if (!rules?.enabled[m.event]) cancelReason = "rule_disabled";
    else if (r.travellerId !== m.travellerId || trip?.travellerId !== m.travellerId)
      cancelReason = "ownership_changed";
    else if (!digits) cancelReason = "invalid_number";
    else if (!trip?.recipientIds.includes(r.id)) cancelReason = "removed_from_trip";
    else if (
      m.event === "checkin_overdue" &&
      (trip.status !== "active" ||
        !m.checkInDueIso ||
        trip.nextCheckInDueIso !== m.checkInDueIso ||
        (trip.lastCheckInIso ?? "") >= m.checkInDueIso)
    )
      cancelReason = "no_longer_overdue";
    if (cancelReason) {
      await repo.updateMessage(m.id, {
        status: "cancelled",
        lastError: cancelReason,
        statusTimes: { ...m.statusTimes, cancelled: nowIso },
      });
      report.cancelled++;
      continue;
    }
    if (!digits) continue;
    const attempts = m.attempts + 1;
    let res: SendResult;
    try {
      res = await provider.send({ toE164Digits: digits, event: m.event, vars: m.vars });
    } catch (e) {
      res = { ok: false, retryable: true, error: e instanceof Error ? e.message : "network error" };
    }
    if (res.ok && res.sid) {
      await repo.updateMessage(m.id, {
        status: "accepted",
        attempts,
        providerSid: res.sid,
        lastError: undefined,
        statusTimes: { ...m.statusTimes, accepted: nowIso },
      });
      report.sent++;
    } else if (res.retryable && attempts < MAX_ATTEMPTS) {
      await repo.updateMessage(m.id, {
        status: "queued",
        attempts,
        lastError: res.error,
        nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)).toISOString(),
      });
      report.retried++;
    } else {
      await repo.updateMessage(m.id, {
        status: "failed",
        attempts,
        lastError: res.error ?? "send failed",
        statusTimes: { ...m.statusTimes, failed: nowIso },
      });
      report.failed++;
    }
  }
  return report;
}

const RANK: Partial<Record<MessageStatus, number>> = {
  accepted: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};
const PROVIDER_MAP: Record<string, MessageStatus> = {
  accepted: "accepted",
  queued: "accepted",
  sending: "accepted",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
  undelivered: "undelivered",
};

/** Apply a VERIFIED provider status callback. Idempotent; never downgrades delivered/read. */
export async function applyProviderStatus(
  repo: NotifyRepo,
  cb: {
    sid: string;
    status: string;
    errorCode?: string | undefined;
    errorMessage?: string | undefined;
  },
  now = new Date(),
): Promise<"applied" | "replay" | "unknown_message" | "ignored"> {
  const mapped = PROVIDER_MAP[cb.status.toLowerCase()];
  if (!mapped) return "ignored";
  const m = await repo.findMessageBySid(cb.sid);
  if (!m) return "unknown_message";
  if (!(await repo.recordProviderEvent(`${cb.sid}:${mapped}:${cb.errorCode ?? ""}`)))
    return "replay";
  const times = { ...m.statusTimes, [mapped]: m.statusTimes[mapped] ?? now.toISOString() };
  const terminalError = mapped === "failed" || mapped === "undelivered";
  const cur = RANK[m.status] ?? 0;
  const next = RANK[mapped] ?? 0;
  if (terminalError) {
    // A late failure after delivered/read is recorded but doesn't erase the delivery.
    if (cur >= 3) await repo.updateMessage(m.id, { statusTimes: times, lastError: cb.errorCode });
    else
      await repo.updateMessage(m.id, {
        status: mapped,
        statusTimes: times,
        lastError: [cb.errorCode, cb.errorMessage].filter(Boolean).join(" ") || mapped,
      });
  } else if (next > cur) await repo.updateMessage(m.id, { status: mapped, statusTimes: times });
  else await repo.updateMessage(m.id, { statusTimes: times });
  return "applied";
}

