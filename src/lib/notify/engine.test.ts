import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyProviderStatus,
  cancelOverdue,
  enqueueEvent,
  MAX_ATTEMPTS,
  NotifyError,
  runDispatch,
  scheduleOverdue,
  type NotifyRepo,
  type OutboxMessage,
  type OverdueJob,
  type Recipient,
  type Rules,
  type TripSnapshot,
  type WhatsAppProvider,
} from "./engine";
import {
  computeTwilioSignature,
  contentVariables,
  twilioProvider,
  verifyTwilioSignature,
} from "./twilio";

function memRepo() {
  const rules = new Map<string, Rules>();
  const recips = new Map<string, Recipient>();
  const trips = new Map<string, TripSnapshot>();
  const msgs = new Map<string, OutboxMessage>();
  const jobs = new Map<string, OverdueJob>();
  const events = new Set<string>();
  const repo: NotifyRepo = {
    getRules: async (t) => rules.get(t) ?? null,
    getRecipient: async (id) => recips.get(id) ?? null,
    getTrip: async (id) => trips.get(id) ?? null,
    insertMessage: async (m) => {
      const ex = [...msgs.values()].find((x) => x.idempotencyKey === m.idempotencyKey);
      if (ex) return [ex, false];
      msgs.set(m.id, m);
      return [m, true];
    },
    updateMessage: async (id, p) => void msgs.set(id, { ...msgs.get(id)!, ...p }),
    findMessageBySid: async (sid) => [...msgs.values()].find((m) => m.providerSid === sid) ?? null,
    dueMessages: async (now) =>
      [...msgs.values()].filter((m) => m.status === "queued" && m.nextAttemptAt <= now),
    claimMessage: async (id) => {
      const m = msgs.get(id)!;
      if (m.status !== "queued") return false;
      msgs.set(id, { ...m, status: "sending" });
      return true;
    },
    upsertJob: async (j) => {
      const ex = [...jobs.values()].find((x) => x.key === j.key);
      if (!ex) jobs.set(j.id, j);
    },
    jobsForTrip: async (t) => [...jobs.values()].filter((j) => j.tripId === t),
    dueJobs: async (now) =>
      [...jobs.values()].filter((j) => j.status === "scheduled" && j.runAt <= now),
    updateJob: async (id, p) => void jobs.set(id, { ...jobs.get(id)!, ...p }),
    recordProviderEvent: async (e) => (events.has(e) ? false : (events.add(e), true)),
  };
  return { repo, rules, recips, trips, msgs, jobs };
}

const T0 = new Date("2026-10-16T12:00:00Z");
const all = { trip_started: true, checkin_overdue: true, concern: true, sos: true, arrived: true };
let db: ReturnType<typeof memRepo>;
const okProvider = (): WhatsAppProvider & { send: ReturnType<typeof vi.fn> } => ({
  send: vi.fn(async () => ({ ok: true, sid: `SM${Math.random()}` })),
});

beforeEach(() => {
  db = memRepo();
  db.rules.set("u1", { travellerId: "u1", enabled: all, graceMinutes: 10 });
  db.recips.set("r1", {
    id: "r1",
    travellerId: "u1",
    name: "Asha",
    phone: "+44 7700 900123",
    optIn: "opted_in",
  });
  db.recips.set("r2", {
    id: "r2",
    travellerId: "u1",
    name: "Out",
    phone: "+14155550100",
    optIn: "opted_out",
  });
  db.recips.set("r3", {
    id: "r3",
    travellerId: "u1",
    name: "Bad",
    phone: "98765 43210",
    optIn: "opted_in",
  });
  db.recips.set("r4", {
    id: "r4",
    travellerId: "u1",
    name: "Pending",
    phone: "+919876543210",
    optIn: "invited",
  });
  db.trips.set("t1", {
    id: "t1",
    travellerId: "u1",
    status: "active",
    destination: "Library",
    etaIso: "2026-10-16T12:30:00Z",
    recipientIds: ["r1", "r2", "r3", "r4"],
    nextCheckInDueIso: "2026-10-16T12:15:00Z",
  });
});

describe("enqueue", () => {
  it("only opted-in, valid recipients get messages; others are skipped with reasons", async () => {
    const r = await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "trip_started",
      origin: "user_action",
      now: T0,
    });
    expect(r.created).toHaveLength(1);
    expect(r.skipped.map((s) => s.reason).sort()).toEqual([
      "invalid_number",
      "not_opted_in",
      "opted_out",
    ]);
  });
  it("dedupes duplicate events", async () => {
    await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "sos",
      origin: "user_action",
      occurrence: "inc1",
    });
    const again = await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "sos",
      origin: "user_action",
      occurrence: "inc1",
    });
    expect(again.created).toHaveLength(0);
    expect(again.duplicates).toHaveLength(1);
    expect(db.msgs.size).toBe(1);
  });
  it("rejects other users and non-scheduler overdue events", async () => {
    await expect(
      enqueueEvent(db.repo, {
        actorId: "intruder",
        tripId: "t1",
        event: "sos",
        origin: "user_action",
      }),
    ).rejects.toBeInstanceOf(NotifyError);
    await expect(
      enqueueEvent(db.repo, {
        actorId: "u1",
        tripId: "t1",
        event: "checkin_overdue",
        origin: "user_action",
      }),
    ).rejects.toThrow(/scheduler/);
    await expect(
      enqueueEvent(db.repo, { actorId: null, tripId: "t1", event: "sos", origin: "scheduler" }),
    ).rejects.toThrow(/Scheduler/);
  });
  it("respects disabled rules", async () => {
    db.rules.set("u1", {
      travellerId: "u1",
      enabled: { ...all, trip_started: false },
      graceMinutes: 10,
    });
    const r = await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "trip_started",
      origin: "user_action",
    });
    expect(r.created).toHaveLength(0);
  });
});

describe("overdue jobs", () => {
  it("fires after grace and the message says it is not proof of danger", async () => {
    await scheduleOverdue(db.repo, db.trips.get("t1")!);
    const p = okProvider();
    expect((await runDispatch(db.repo, p, new Date("2026-10-16T12:20:00Z"))).jobsFired).toBe(0);
    const rep = await runDispatch(db.repo, p, new Date("2026-10-16T12:26:00Z"));
    expect(rep.jobsFired).toBe(1);
    expect(rep.sent).toBe(1);
    expect(p.send.mock.calls[0]![0].vars["note"]).toMatch(/does not mean something is wrong/);
  });
  it("cancelled on check-in", async () => {
    await scheduleOverdue(db.repo, db.trips.get("t1")!);
    await cancelOverdue(db.repo, "t1", "checked_in");
    const rep = await runDispatch(db.repo, okProvider(), new Date("2026-10-16T13:00:00Z"));
    expect(rep.jobsFired).toBe(0);
    expect([...db.jobs.values()][0]!.status).toBe("cancelled");
  });
  it("revalidates state at dispatch even if cancellation was missed", async () => {
    await scheduleOverdue(db.repo, db.trips.get("t1")!);
    db.trips.set("t1", { ...db.trips.get("t1")!, lastCheckInIso: "2026-10-16T12:16:00Z" });
    const rep = await runDispatch(db.repo, okProvider(), new Date("2026-10-16T13:00:00Z"));
    expect(rep.jobsSkipped).toBe(1);
    expect(db.msgs.size).toBe(0);
  });
});

describe("dispatch", () => {
  it("checks the complete ISO due time, including minutes and seconds", async () => {
    db.trips.set("t1", { ...db.trips.get("t1")!, lastCheckInIso: "2026-10-16T12:05:00Z" });
    await enqueueEvent(db.repo, {
      actorId: null,
      tripId: "t1",
      event: "checkin_overdue",
      origin: "scheduler",
      occurrence: "2026-10-16T12:15:00Z",
      now: T0,
    });
    const p = okProvider();
    const rep = await runDispatch(db.repo, p, new Date("2026-10-16T12:26:00Z"));
    expect(rep.sent).toBe(1);
    expect(p.send).toHaveBeenCalledTimes(1);
  });
  it("cancels queued overdue alerts after a later check-in", async () => {
    await enqueueEvent(db.repo, {
      actorId: null,
      tripId: "t1",
      event: "checkin_overdue",
      origin: "scheduler",
      occurrence: "2026-10-16T12:15:00Z",
      now: T0,
    });
    db.trips.set("t1", { ...db.trips.get("t1")!, lastCheckInIso: "2026-10-16T12:16:00Z" });
    const p = okProvider();
    expect((await runDispatch(db.repo, p, T0)).cancelled).toBe(1);
    expect(p.send).not.toHaveBeenCalled();
  });
  it("honors a disabled rule even after the message was queued", async () => {
    await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "concern",
      origin: "user_action",
      now: T0,
    });
    db.rules.set("u1", {
      travellerId: "u1",
      enabled: { ...all, concern: false },
      graceMinutes: 10,
    });
    const p = okProvider();
    expect((await runDispatch(db.repo, p, T0)).cancelled).toBe(1);
    expect(p.send).not.toHaveBeenCalled();
  });
  it("cancels when recipient opts out before send", async () => {
    await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "concern",
      origin: "user_action",
      now: T0,
    });
    db.recips.set("r1", { ...db.recips.get("r1")!, optIn: "opted_out" });
    const p = okProvider();
    const rep = await runDispatch(db.repo, p, T0);
    expect(rep.cancelled).toBe(1);
    expect(p.send).not.toHaveBeenCalled();
  });
  it("retries retryable failures with bounded attempts, then fails visibly", async () => {
    await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "sos",
      origin: "user_action",
      now: T0,
    });
    const p: WhatsAppProvider = {
      send: async () => ({ ok: false, retryable: true, error: "Twilio 503" }),
    };
    let t = T0.getTime();
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) {
      await runDispatch(db.repo, p, new Date(t));
      t += 60 * 60_000;
    }
    const m = [...db.msgs.values()][0]!;
    expect(m.status).toBe("failed");
    expect(m.attempts).toBe(MAX_ATTEMPTS);
    expect(m.lastError).toMatch(/503/);
  });
  it("non-retryable errors fail immediately", async () => {
    await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "sos",
      origin: "user_action",
      now: T0,
    });
    await runDispatch(
      db.repo,
      { send: async () => ({ ok: false, retryable: false, error: "Twilio 400: 63016" }) },
      T0,
    );
    expect([...db.msgs.values()][0]!.status).toBe("failed");
  });
});

describe("provider status", () => {
  it("allows an early callback to be retried once its message exists", async () => {
    expect(await applyProviderStatus(db.repo, { sid: "SM1", status: "delivered" })).toBe(
      "unknown_message",
    );
    await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "trip_started",
      origin: "user_action",
      now: T0,
    });
    await runDispatch(db.repo, { send: async () => ({ ok: true, sid: "SM1" }) }, T0);
    expect(await applyProviderStatus(db.repo, { sid: "SM1", status: "delivered" })).toBe("applied");
    expect([...db.msgs.values()][0]?.status).toBe("delivered");
  });
  async function accepted() {
    await enqueueEvent(db.repo, {
      actorId: "u1",
      tripId: "t1",
      event: "arrived",
      origin: "user_action",
      now: T0,
    });
    await runDispatch(db.repo, { send: async () => ({ ok: true, sid: "SM1" }) }, T0);
    return [...db.msgs.values()][0]!;
  }
  it("API acceptance is not delivery; only callbacks advance status, monotonic", async () => {
    expect((await accepted()).status).toBe("accepted");
    await applyProviderStatus(db.repo, { sid: "SM1", status: "delivered" });
    await applyProviderStatus(db.repo, { sid: "SM1", status: "sent" }); // late, out of order
    const m = [...db.msgs.values()][0]!;
    expect(m.status).toBe("delivered");
    expect(m.acknowledgedAt).toBeUndefined();
  });
  it("replays are ignored and failures recorded with error", async () => {
    await accepted();
    expect(
      await applyProviderStatus(db.repo, { sid: "SM1", status: "undelivered", errorCode: "63024" }),
    ).toBe("applied");
    expect(
      await applyProviderStatus(db.repo, { sid: "SM1", status: "undelivered", errorCode: "63024" }),
    ).toBe("replay");
    expect([...db.msgs.values()][0]!.lastError).toMatch(/63024/);
  });
});

describe("twilio adapter", () => {
  it("verifies signatures and rejects tampering", async () => {
    const url = "https://example.app/api/public/whatsapp/twilio-status";
    const params = { MessageSid: "SM1", MessageStatus: "delivered" };
    const sig = await computeTwilioSignature("tok", url, params);
    expect(await verifyTwilioSignature("tok", url, params, sig)).toBe(true);
    expect(await verifyTwilioSignature("tok", url, { ...params, MessageStatus: "read" }, sig)).toBe(
      false,
    );
    expect(await verifyTwilioSignature("tok", url, params, null)).toBe(false);
    expect(await verifyTwilioSignature("other", url, params, sig)).toBe(false);
  });
  it("sends template SID + positional variables via gateway (mocked, nothing sent)", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ sid: "SMx" }), { status: 201 }),
    );
    const p = twilioProvider({
      lovableApiKey: "k",
      twilioApiKey: "c",
      from: "+15550001111",
      statusCallbackUrl: "https://x/cb",
      templates: {
        trip_started: "HX1",
        checkin_overdue: "HX2",
        concern: "HX3",
        sos: "HX4",
        arrived: "HX5",
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const r = await p.send({
      toE164Digits: "447700900123",
      event: "sos",
      vars: { traveller: "A", destination: "Lib", eta: "12:30" },
    });
    expect(r).toEqual({ ok: true, sid: "SMx" });
    const body = new URLSearchParams(
      (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams,
    );
    expect(body.get("To")).toBe("whatsapp:+447700900123");
    expect(body.get("ContentSid")).toBe("HX4");
    expect(JSON.parse(body.get("ContentVariables")!)).toEqual({
      "1": "A",
      "2": "Lib",
      "3": "12:30",
    });
    expect(contentVariables("arrived", { traveller: "A", destination: "B" })).toBe(
      '{"1":"A","2":"B"}',
    );
  });
  it("maps 429/5xx as retryable, 4xx as permanent", async () => {
    const mk = (status: number) =>
      twilioProvider({
        lovableApiKey: "k",
        twilioApiKey: "c",
        from: "+1",
        statusCallbackUrl: "x",
        templates: {
          trip_started: "a",
          checkin_overdue: "b",
          concern: "c",
          sos: "d",
          arrived: "e",
        },
        fetchImpl: (async () => new Response("err", { status })) as unknown as typeof fetch,
      });
    expect((await mk(429).send({ toE164Digits: "1", event: "sos", vars: {} })).retryable).toBe(
      true,
    );
    expect((await mk(400).send({ toE164Digits: "1", event: "sos", vars: {} })).retryable).toBe(
      false,
    );
  });
});
