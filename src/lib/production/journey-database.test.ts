// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
const T = "10101010-1010-4010-8010-101010101010",
  G = "20202020-2020-4020-8020-202020202020",
  U = "30303030-3030-4030-8030-303030303030",
  E = "40404040-4040-4040-8040-404040404040";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`,
  );
  for (const f of readdirSync("drizzle/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync("drizzle/migrations/" + f, "utf8"));
}, 30000);
afterAll(async () => {
  await db.close();
});
async function asUser(id: string, sql: string) {
  await db.exec("SAVEPOINT assertion");
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false)`);
  try {
    const r = await db.query<Record<string, unknown>>(sql);
    await db.exec("RELEASE SAVEPOINT assertion");
    return r;
  } catch (e) {
    await db.exec("ROLLBACK TO SAVEPOINT assertion; RELEASE SAVEPOINT assertion");
    throw e;
  } finally {
    await db.exec("RESET ROLE");
  }
}
async function fixture(fn: () => Promise<void>) {
  await db.exec("BEGIN");
  try {
    await db.exec(
      `INSERT INTO auth.users VALUES('${T}','t@example.test',now()),('${G}','g@example.test',now()),('${U}','u@example.test',now()); INSERT INTO public.inapp_guardians(id,traveller_id,recipient_id,name,invited_email,token_hash,consent,journey_opt_in) VALUES('${E}','${T}','${G}','Synthetic guardian','g@example.test','${"a".repeat(64)}','opted_in',true)`,
    );
    await fn();
  } finally {
    await db.exec("ROLLBACK; RESET ROLE");
  }
  expect((await db.query("SELECT * FROM private_journeys")).rows).toHaveLength(0);
  expect((await db.query("SELECT * FROM journey_requests")).rows).toHaveLength(0);
}
let seq = 0;
const key = () => `50505050-5050-4050-8050-${String(++seq).padStart(12, "0")}`;
const future = () => new Date(Date.now() + 3600000).toISOString();
const payload = (extra: Record<string, unknown> = {}) => ({
  action: "start",
  destination: "Synthetic library",
  recipientIds: [E],
  expectedAt: future(),
  note: "Synthetic note",
  location: null,
  locationConsent: false,
  ...extra,
});
function write(p: Record<string, unknown>, k = key()) {
  return `SELECT write_private_journey('${k}','${JSON.stringify(p).replaceAll("'", "''")}'::jsonb) AS result`;
}
async function start() {
  const r = await asUser(T, write(payload()));
  return (r.rows[0]?.["result"] as { id: string }).id;
}
async function read(id: string, guardian = false) {
  const r = await asUser(id, `SELECT read_private_journeys(${guardian}) AS result`);
  return r.rows[0]?.["result"] as {
    serverNow: string;
    journeys: {
      id: string;
      status: string;
      overdue: boolean;
      note: string;
      location: unknown;
      sharing: boolean;
    }[];
  };
}
describe("private journeys: synthetic authenticated PostgreSQL rollback assertions", () => {
  it("isolates owner, selected guardian and unrelated direct reads and RPCs", async () =>
    fixture(async () => {
      const id = await start();
      expect((await read(T)).journeys[0]?.id).toBe(id);
      expect((await read(G, true)).journeys[0]?.note).toBe("Synthetic note");
      expect((await read(G)).journeys).toEqual([]);
      expect((await read(U, true)).journeys).toEqual([]);
      expect((await asUser(U, "SELECT * FROM private_journeys")).rows).toHaveLength(0);
      expect((await asUser(G, "SELECT * FROM private_journeys")).rows).toHaveLength(1);
      expect((await asUser(G, "SELECT * FROM journey_events")).rows).toHaveLength(0);
      await expect(
        asUser(U, write(payload({ action: "cancelled", journeyId: id }))),
      ).rejects.toThrow("unavailable");
      await expect(
        asUser(G, write(payload({ action: "check_in", journeyId: id }))),
      ).rejects.toThrow("unavailable");
    }));
  it("requires separate recipient-controlled journey consent, even with existing SOS opt-in", async () =>
    fixture(async () => {
      await db.exec("UPDATE inapp_guardians SET journey_opt_in=false");
      await expect(asUser(T, write(payload()))).rejects.toThrow("consenting");
      await expect(asUser(T, `SELECT set_journey_consent('${E}',true)`)).rejects.toThrow(
        "unavailable",
      );
      await expect(asUser(U, `SELECT set_journey_consent('${E}',true)`)).rejects.toThrow(
        "unavailable",
      );
      await asUser(G, `SELECT set_journey_consent('${E}',true)`);
      await start();
      await asUser(G, `SELECT set_journey_consent('${E}',false)`);
      expect((await read(G, true)).journeys).toEqual([]);
      expect((await read(T)).journeys).toHaveLength(1);
      await asUser(G, `SELECT set_journey_consent('${E}',true)`);
      expect((await read(G, true)).journeys).toEqual([]);
      const old = (await read(T)).journeys[0]?.id;
      await asUser(T, write(payload({ action: "cancelled", journeyId: old })));
      await start();
      expect((await read(G, true)).journeys).toHaveLength(1);
    }));
  it("revocation immediately denies subsequent guardian access and owner keeps history", async () =>
    fixture(async () => {
      await start();
      await asUser(G, `SELECT revoke_inapp_guardian('${E}')`);
      expect((await read(G, true)).journeys).toEqual([]);
      expect((await asUser(G, "SELECT * FROM private_journeys")).rows).toHaveLength(0);
      expect((await read(T)).journeys).toHaveLength(1);
    }));
  it("stop sharing denies recipients while allowing private owner check-ins", async () =>
    fixture(async () => {
      const id = await start();
      const k = key(),
        p = payload({ action: "stop_sharing", journeyId: id });
      await asUser(T, write(p, k));
      await asUser(T, write(p, k));
      expect((await read(G, true)).journeys).toEqual([]);
      expect((await asUser(G, "SELECT * FROM private_journeys")).rows).toHaveLength(0);
      await asUser(
        T,
        write(payload({ action: "check_in", journeyId: id, note: "Private after stop" })),
      );
      expect((await read(T)).journeys[0]?.note).toBe("Private after stop");
      expect(
        (await db.query("SELECT * FROM journey_events WHERE action='stop_sharing'")).rows,
      ).toHaveLength(1);
    }));
  it("deduplicates lifecycle actions and rejects changed-key reuse and ended check-ins", async () =>
    fixture(async () => {
      const k = key(),
        p = payload();
      const a = await asUser(T, write(p, k)),
        b = await asUser(T, write(p, k));
      const id = (a.rows[0]?.["result"] as { id: string }).id;
      expect((b.rows[0]?.["result"] as { duplicate: boolean }).duplicate).toBe(true);
      await expect(asUser(T, write({ ...p, note: "changed" }, k))).rejects.toThrow(
        "different input",
      );
      const ck = key(),
        cp = payload({ action: "check_in", journeyId: id, note: "Checked in" });
      await asUser(T, write(cp, ck));
      await asUser(T, write(cp, ck));
      const ak = key(),
        ap = payload({ action: "arrived", journeyId: id });
      await asUser(T, write(ap, ak));
      await asUser(T, write(ap, ak));
      expect((await read(T)).journeys[0]?.status).toBe("arrived");
      expect((await read(G, true)).journeys).toEqual([]);
      await expect(asUser(T, write(cp))).rejects.toThrow("ended");
      expect((await db.query("SELECT * FROM journey_events")).rows).toHaveLength(3);
      expect((await db.query("SELECT * FROM notify_outbox")).rows).toHaveLength(0);
      expect((await db.query("SELECT * FROM inapp_alerts")).rows).toHaveLength(0);
    }));
  it("cancel ends sharing, preserves owner history and permits a new journey", async () =>
    fixture(async () => {
      const id = await start();
      await asUser(T, write(payload({ action: "cancelled", journeyId: id })));
      expect((await read(G, true)).journeys).toEqual([]);
      expect((await read(T)).journeys[0]?.status).toBe("cancelled");
      await start();
      expect((await read(T)).journeys).toHaveLength(2);
    }));
  it("fails the entire start for invalid, unchosen, foreign or revoked recipients", async () =>
    fixture(async () => {
      for (const recipients of [[E, U], [], [E, E, E, E, E, E]])
        await expect(asUser(T, write(payload({ recipientIds: recipients })))).rejects.toThrow();
      await expect(asUser(U, write(payload()))).rejects.toThrow("consenting");
      await db.exec(`UPDATE inapp_guardians SET revoked_at=now()`);
      await expect(asUser(T, write(payload()))).rejects.toThrow("consenting");
      expect((await db.query("SELECT * FROM private_journeys")).rows).toHaveLength(0);
      expect((await db.query("SELECT * FROM journey_shares")).rows).toHaveLength(0);
    }));
  it("validates timestamp, accuracy and explicit location consent atomically", async () =>
    fixture(async () => {
      const loc = { latitude: 12.34, longitude: 56.78, accuracy: 25, timestamp: Date.now() };
      for (const [location, locationConsent] of [
        [loc, false],
        [{ ...loc, timestamp: Date.now() - 121000 }, true],
        [{ ...loc, timestamp: Date.now() + 20000 }, true],
        [{ ...loc, accuracy: -1 }, true],
        [{ ...loc, extra: 1 }, true],
      ] as const)
        await expect(asUser(T, write(payload({ location, locationConsent })))).rejects.toThrow(
          "fresh one-time fix",
        );
      expect((await db.query("SELECT * FROM private_journeys")).rows).toHaveLength(0);
      const p = payload({ location: loc, locationConsent: true });
      await asUser(T, write(p));
      expect((await read(G, true)).journeys[0]?.location).toEqual(loc);
    }));
  it("check-in without a new snapshot clears latest shared location but preserves owner event history", async () =>
    fixture(async () => {
      const loc = { latitude: 1, longitude: 2, accuracy: 3, timestamp: Date.now() };
      await asUser(T, write(payload({ location: loc, locationConsent: true })));
      const id = (await read(T)).journeys[0]?.id;
      await asUser(T, write(payload({ action: "check_in", journeyId: id })));
      expect((await read(G, true)).journeys[0]?.location).toBe(null);
      expect(
        (await asUser(T, "SELECT location FROM journey_events WHERE action='start'")).rows[0]?.[
          "location"
        ],
      ).toEqual(loc);
    }));
  it("computes overdue from database server time, not client time or proof of danger", async () =>
    fixture(async () => {
      await start();
      await db.exec(
        "UPDATE private_journeys SET expected_at=clock_timestamp()-interval '1 minute'",
      );
      const result = await read(G, true);
      expect(result.journeys[0]?.overdue).toBe(true);
      expect(Number.isFinite(Date.parse(result.serverNow))).toBe(true);
      await db.exec("UPDATE private_journeys SET expected_at=clock_timestamp()+interval '1 hour'");
      expect((await read(G, true)).journeys[0]?.overdue).toBe(false);
    }));
  it("enforces future 24-hour deadline, one active journey and verified account", async () =>
    fixture(async () => {
      for (const expectedAt of [
        new Date(Date.now() - 1000).toISOString(),
        new Date(Date.now() + 25 * 3600000).toISOString(),
      ])
        await expect(asUser(T, write(payload({ expectedAt })))).rejects.toThrow("within 24 hours");
      await db.exec(`UPDATE auth.users SET email_confirmed_at=null WHERE id='${T}'`);
      await expect(asUser(T, write(payload()))).rejects.toThrow("Verified");
      await db.exec(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${T}'`);
      await start();
      await expect(asUser(T, write(payload()))).rejects.toThrow("active journey");
    }));
  it("enforces concrete daily 20-start and 200-action limits", async () =>
    fixture(async () => {
      for (let i = 0; i < 20; i++)
        await db.exec(
          `INSERT INTO private_journeys(traveller_id,destination,expected_at,status,sharing) VALUES('${T}','Synthetic history',now(),'cancelled',false)`,
        );
      await expect(asUser(T, write(payload()))).rejects.toThrow("20 journey starts");
      for (let i = 0; i < 200; i++)
        await db.exec(
          `INSERT INTO journey_requests(traveller_id,request_key,payload,result) VALUES('${U}','${key()}','{}','{}')`,
        );
      await expect(asUser(U, write(payload()))).rejects.toThrow("200 journey actions");
    }));
  it("denies direct writes and anonymous RPC/read access", async () =>
    fixture(async () => {
      await expect(asUser(T, "UPDATE private_journeys SET sharing=true")).rejects.toThrow(
        "permission denied",
      );
      await expect(asUser(G, "UPDATE inapp_guardians SET journey_opt_in=true")).rejects.toThrow(
        "permission denied",
      );
      await db.exec("SAVEPOINT anon_test; SET ROLE anon");
      await expect(db.query("SELECT read_private_journeys(true)")).rejects.toThrow(
        "permission denied",
      );
      await db.exec("ROLLBACK TO SAVEPOINT anon_test; SET ROLE anon");
      await expect(db.query("SELECT * FROM private_journeys")).rejects.toThrow("permission denied");
      await db.exec("ROLLBACK TO SAVEPOINT anon_test; RELEASE SAVEPOINT anon_test; RESET ROLE");
    }));
});
