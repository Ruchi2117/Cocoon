// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Regression: the hosted database had no 'live-voice' control row, so every call failed closed.
// Executes the real ordered migrations 0000 (table) -> 0010 (guest quota) -> 0011 (seed).
const sql0000 = readFileSync("drizzle/migrations/0000_cocoon_private_safety.sql", "utf8");
const tableDdl = sql0000
  .split(/\r?\n/)
  .filter((l) => l.includes("production_service_state"))
  .join("\n");
const seed = readFileSync("drizzle/migrations/0011_seed_live_voice_control.sql", "utf8");
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;",
  );
  await db.exec(tableDdl);
  await db.exec(readFileSync("drizzle/migrations/0010_cocoon_guest_voice_demo.sql", "utf8"));
}, 30000);
afterAll(async () => {
  await db.close();
});
async function rollback(test: () => Promise<void>) {
  await db.exec("BEGIN");
  try {
    await test();
  } finally {
    await db.exec("ROLLBACK");
  }
}
const row = async () =>
  (
    await db.query<{ paused: boolean; reason: string | null }>(
      "SELECT paused, reason FROM production_service_state WHERE service='live-voice'",
    )
  ).rows;

describe("live-voice control seed (executed in synthetic PostgreSQL, rolled back)", () => {
  it("creates the missing row unpaused and is idempotent on rerun", () =>
    rollback(async () => {
      expect(await row()).toHaveLength(0);
      await db.exec(seed);
      await db.exec(seed);
      const rows = await row();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.paused).toBe(false);
    }));
  it("never overwrites an existing owner pause or its reason", () =>
    rollback(async () => {
      await db.exec(
        "INSERT INTO production_service_state(service,paused,reason) VALUES('live-voice',true,'owner hold')",
      );
      await db.exec(seed);
      expect(await row()).toEqual([{ paused: true, reason: "owner hold" }]);
    }));
  it("control table and guest quota stay service-role only", () =>
    rollback(async () => {
      await db.exec(seed);
      for (const role of ["anon", "authenticated"]) {
        await db.exec(`SAVEPOINT s; SET LOCAL ROLE ${role}`);
        await expect(db.query("SELECT * FROM production_service_state")).rejects.toThrow(
          /permission denied/,
        );
        await db.exec("ROLLBACK TO SAVEPOINT s");
        await db.exec(`SAVEPOINT s2; SET LOCAL ROLE ${role}`);
        await expect(db.query(`SELECT reserve_guest_voice('${"c".repeat(64)}')`)).rejects.toThrow(
          /permission denied/,
        );
        await db.exec("ROLLBACK TO SAVEPOINT s2");
      }
      await db.exec("SET LOCAL ROLE service_role");
      const id = (
        await db.query<{ id: string }>(`SELECT reserve_guest_voice('${"c".repeat(64)}') id`)
      ).rows[0]?.id;
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      await expect(db.query(`SELECT reserve_guest_voice('${"c".repeat(64)}')`)).rejects.toThrow(
        /already active/,
      );
    }));
});
