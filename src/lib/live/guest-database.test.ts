// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;
const A = "a".repeat(64),
  B = "b".repeat(64);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;",
  );
  await db.exec(readFileSync("drizzle/migrations/0010_cocoon_guest_voice_demo.sql", "utf8"));
}, 30000);
afterAll(async () => {
  await db.close();
});
async function rollback(test: () => Promise<void>) {
  await db.exec("BEGIN; SET LOCAL timezone = 'UTC';");
  // Keep database local time at midday, independent of when the test runs.
  const hour =
    (await db.query<{ hour: number }>("SELECT extract(hour from now())::int AS hour")).rows[0]
      ?.hour ?? 0;
  await db.exec(`SET LOCAL TIME ZONE INTERVAL '${12 - hour} hours'`);
  try {
    await test();
  } finally {
    await db.exec("ROLLBACK");
  }
  expect((await db.query("SELECT id FROM guest_voice_sessions")).rows).toHaveLength(0);
}
async function rejected(sql: string, message: RegExp) {
  await db.exec("SAVEPOINT expected_failure");
  try {
    await expect(db.query(sql)).rejects.toThrow(message);
  } finally {
    await db.exec("ROLLBACK TO SAVEPOINT expected_failure; RELEASE SAVEPOINT expected_failure");
  }
}
async function reserve(hash: string) {
  const { rows } = await db.query<{ id: string }>(`SELECT reserve_guest_voice('${hash}') AS id`);
  expect(rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  return rows[0]?.id;
}
async function close(id: string | undefined) {
  expect(id).toBeDefined();
  await db.exec(`UPDATE guest_voice_sessions SET status='closed', ended_at=now() WHERE id='${id}'`);
}
describe("guest SQL caps and isolation (synthetic PostgreSQL rollback, no hosted data)", () => {
  it("rejects missing and malformed keys", async () =>
    rollback(async () => {
      await rejected("SELECT reserve_guest_voice(NULL)", /Invalid client/);
      await rejected("SELECT reserve_guest_voice('client-controlled-short')", /Invalid client/);
    }));
  it("one open slot per IP; a different hash remains isolated", async () =>
    rollback(async () => {
      await reserve(A);
      await rejected(`SELECT reserve_guest_voice('${A}')`, /already active/);
      await reserve(B);
      expect(
        (await db.query("SELECT DISTINCT client_hash FROM guest_voice_sessions")).rows,
      ).toHaveLength(2);
    }));
  it("allows 2 starts in an hour, rejects the third even after release", async () =>
    rollback(async () => {
      for (let i = 0; i < 2; i++) await close(await reserve(A));
      await rejected(`SELECT reserve_guest_voice('${A}')`, /limit reached/);
      await reserve(B);
    }));
  it("rolling hour excludes an older start", async () =>
    rollback(async () => {
      await db.exec(
        `INSERT INTO guest_voice_sessions(client_hash,started_at,status) VALUES('${A}',now()-interval '61 minutes','closed')`,
      );
      for (let i = 0; i < 2; i++) await close(await reserve(A));
      await rejected(`SELECT reserve_guest_voice('${A}')`, /limit reached/);
    }));
  it("allows 4 starts per database day and rejects the fifth", async () =>
    rollback(async () => {
      await db.exec(
        `INSERT INTO guest_voice_sessions(client_hash,started_at,status) SELECT '${A}',now()-interval '2 hours','closed' FROM generate_series(1,3)`,
      );
      await close(await reserve(A));
      expect((await db.query("SELECT id FROM guest_voice_sessions")).rows).toHaveLength(4);
      await rejected(`SELECT reserve_guest_voice('${A}')`, /limit reached/);
    }));
  it("previous-day starts do not consume daily allowance", async () =>
    rollback(async () => {
      await db.exec(
        `INSERT INTO guest_voice_sessions(client_hash,started_at,status) SELECT '${A}',date_trunc('day',now())-interval '1 hour','closed' FROM generate_series(1,4)`,
      );
      await reserve(A);
    }));
  it("global daily cap permits 60 starts across hashes, then rejects 61", async () =>
    rollback(async () => {
      for (let i = 1; i <= 60; i++) await close(await reserve(i.toString(16).padStart(64, "0")));
      expect((await db.query("SELECT id FROM guest_voice_sessions")).rows).toHaveLength(60);
      await rejected(`SELECT reserve_guest_voice('${A}')`, /limit reached/);
    }));
  it("global concurrency permits 5 open slots; closing one permits the sixth", async () =>
    rollback(async () => {
      const ids: (string | undefined)[] = [];
      for (let i = 1; i <= 5; i++) ids.push(await reserve(i.toString(16).padStart(64, "0")));
      await rejected(`SELECT reserve_guest_voice('${A}')`, /limit reached/);
      await close(ids[0]);
      await reserve(A);
      expect(
        (await db.query("SELECT id FROM guest_voice_sessions WHERE status='starting'")).rows,
      ).toHaveLength(5);
    }));
  it("expired open slots and failed slots do not consume concurrency", async () =>
    rollback(async () => {
      await db.exec(
        `INSERT INTO guest_voice_sessions(client_hash,started_at,expires_at,status) SELECT lpad(i::text,64,'0'),now()-interval '2 hours',now()-interval '1 minute','active' FROM generate_series(1,5) i; INSERT INTO guest_voice_sessions(client_hash,status) VALUES('${A}','failed')`,
      );
      await reserve(A);
    }));
  for (const role of ["anon", "authenticated"]) {
    it(`${role} cannot reserve, read, insert or release guest slots`, async () =>
      rollback(async () => {
        await db.exec(`SET LOCAL ROLE ${role}`);
        await rejected(`SELECT reserve_guest_voice('${A}')`, /permission denied/);
        await rejected("SELECT * FROM guest_voice_sessions", /permission denied/);
        await rejected(
          `INSERT INTO guest_voice_sessions(client_hash) VALUES('${A}')`,
          /permission denied/,
        );
        await rejected("UPDATE guest_voice_sessions SET status='closed'", /permission denied/);
      }));
  }
  it("service role alone can reserve and release; table has RLS enabled", async () =>
    rollback(async () => {
      const { rows } = await db.query<{
        rls: boolean;
        anon: boolean;
        authenticated: boolean;
        service: boolean;
      }>(
        "SELECT c.relrowsecurity AS rls, has_function_privilege('anon','reserve_guest_voice(text)','EXECUTE') AS anon, has_function_privilege('authenticated','reserve_guest_voice(text)','EXECUTE') AS authenticated, has_function_privilege('service_role','reserve_guest_voice(text)','EXECUTE') AS service FROM pg_class c WHERE c.oid='guest_voice_sessions'::regclass",
      );
      expect(rows).toEqual([{ rls: true, anon: false, authenticated: false, service: true }]);
      await db.exec("SET LOCAL ROLE service_role");
      await close(await reserve(A));
      expect((await db.query("SELECT status FROM guest_voice_sessions")).rows).toEqual([
        { status: "closed" },
      ]);
    }));
});
