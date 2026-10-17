// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

const T = "10101010-1010-4010-8010-101010101010",
  G = "20202020-2020-4020-8020-202020202020",
  U = "30303030-3030-4030-8030-303030303030",
  E = "40404040-4040-4040-8040-404040404040",
  R = "50505050-5050-4050-8050-505050505050";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`);
  for (const f of readdirSync("drizzle/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync("drizzle/migrations/" + f, "utf8"));
}, 30000);
afterAll(async () => {
  await db.close();
});
async function asUser<TValue = Record<string, unknown>>(id: string, sql: string) {
  await db.exec("SAVEPOINT assertion");
  await db.exec(
    `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    const result = await db.query<TValue>(sql);
    await db.exec("RELEASE SAVEPOINT assertion");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK TO SAVEPOINT assertion; RELEASE SAVEPOINT assertion");
    throw error;
  } finally {
    await db.exec("RESET ROLE");
  }
}
async function fixture(test: () => Promise<void>, invited = false) {
  await db.exec("BEGIN");
  try {
    await db.exec(`INSERT INTO auth.users VALUES('${T}','traveller@example.test',now()),('${G}','guardian@example.test',now()),('${U}','unrelated@example.test',now());
      INSERT INTO inapp_guardians(id,traveller_id,recipient_id,name,invited_email,token_hash,consent,consent_at)
      VALUES('${E}','${T}',${invited ? "null" : `'${G}'`},'Synthetic guardian','guardian@example.test','${"a".repeat(64)}','${invited ? "invited" : "opted_in"}',${invited ? "null" : "now()"});`);
    await test();
  } finally {
    await db.exec("ROLLBACK; RESET ROLE");
  }
  expect((await db.query(`SELECT id FROM inapp_guardians WHERE id='${E}'`)).rows).toHaveLength(0);
  expect((await db.query(`SELECT id FROM inapp_alerts`)).rows).toHaveLength(0);
}
const send = (
  recipients = [E],
  location: Record<string, number> | null = null,
  consent = false,
  note = "Synthetic chosen note",
  request = R,
) =>
  `SELECT send_inapp_sos('${request}',ARRAY[${recipients.map((id) => `'${id}'::uuid`).join(",")}],'${note}',${location ? `'${JSON.stringify(location)}'::jsonb` : "null"},${consent}) AS result`;
async function sendAlert() {
  await asUser(T, send());
  return (await db.query<{ id: string }>("SELECT id FROM inapp_alerts")).rows[0]?.id ?? "";
}
describe("in-app SOS: isolated PostgreSQL transactions and RLS, synthetic identities only", () => {
  it("binds phone-free consent to the intended verified email and consumes the token", async () => {
    await fixture(async () => {
      await expect(
        asUser(U, `SELECT confirm_inapp_guardian('${"a".repeat(64)}',true)`),
      ).rejects.toThrow("unavailable");
      await expect(
        asUser(G, `SELECT confirm_inapp_guardian('${"a".repeat(64)}',false)`),
      ).rejects.toThrow("unavailable");
      const r = await asUser<{ id: string }>(
        G,
        `SELECT confirm_inapp_guardian('${"a".repeat(64)}',true) AS id`,
      );
      expect(r.rows[0]?.id).toBe(E);
      await expect(
        asUser(G, `SELECT confirm_inapp_guardian('${"a".repeat(64)}',true)`),
      ).rejects.toThrow("unavailable");
      expect(
        (await db.query<{ recipient_id: string }>("SELECT recipient_id FROM inapp_guardians"))
          .rows[0]?.recipient_id,
      ).toBe(G);
    }, true);
  });
  it("rejects expired invitations and unverified guardian accounts", async () => {
    await fixture(async () => {
      await db.exec(`UPDATE auth.users SET email_confirmed_at=null WHERE id='${G}'`);
      await expect(
        asUser(G, `SELECT confirm_inapp_guardian('${"a".repeat(64)}',true)`),
      ).rejects.toThrow("unavailable");
      await db.exec(
        `UPDATE auth.users SET email_confirmed_at=now() WHERE id='${G}'; UPDATE inapp_guardians SET expires_at=now()-interval '1 second'`,
      );
      await expect(
        asUser(G, `SELECT confirm_inapp_guardian('${"a".repeat(64)}',true)`),
      ).rejects.toThrow("unavailable");
    }, true);
  });
  it("hides hashes and denies direct consent/status writes", async () => {
    await fixture(async () => {
      await expect(asUser(G, "SELECT token_hash FROM inapp_guardians")).rejects.toThrow(
        "permission denied",
      );
      await expect(asUser(G, "UPDATE inapp_guardians SET consent='opted_in'")).rejects.toThrow(
        "permission denied",
      );
      await expect(asUser(G, "UPDATE inapp_alerts SET read_at=now()")).rejects.toThrow(
        "permission denied",
      );
    });
  });
  it("stores only selected recipients with note/location, without touching WhatsApp", async () => {
    await fixture(async () => {
      const location = { latitude: 12.34, longitude: 56.78, accuracy: 25, timestamp: Date.now() };
      await asUser(T, send([E], location, true));
      const row = (
        await asUser<{
          note: string;
          location: typeof location;
          delivered_at: null;
          read_at: null;
          acknowledged_at: null;
        }>(G, "SELECT note,location,delivered_at,read_at,acknowledged_at FROM inapp_alerts")
      ).rows[0];
      expect(row).toEqual({
        note: "Synthetic chosen note",
        location,
        delivered_at: null,
        read_at: null,
        acknowledged_at: null,
      });
      expect((await db.query("SELECT id FROM notify_outbox")).rows).toHaveLength(0);
      expect((await db.query("SELECT id FROM emergency_sessions")).rows).toHaveLength(0);
    });
  });
  it("denies unrelated reads, inbox retrieval, opening, acknowledgement and send impersonation", async () => {
    await fixture(async () => {
      const id = await sendAlert();
      expect((await asUser(U, "SELECT id FROM inapp_alerts")).rows).toHaveLength(0);
      expect(
        (await asUser<{ result: unknown[] }>(U, "SELECT retrieve_inapp_inbox() AS result")).rows[0]
          ?.result,
      ).toEqual([]);
      await expect(asUser(U, `SELECT open_inapp_alert('${id}',false)`)).rejects.toThrow(
        "unavailable",
      );
      await expect(asUser(U, `SELECT open_inapp_alert('${id}',true)`)).rejects.toThrow(
        "unavailable",
      );
      await expect(asUser(U, send())).rejects.toThrow("opted-in");
      expect((await asUser(T, "SELECT id FROM inapp_alerts")).rows).toHaveLength(1);
    });
  });
  it("records delivered only on guardian retrieval, read on opening, ack separately and idempotently", async () => {
    await fixture(async () => {
      const id = await sendAlert();
      await asUser(T, "SELECT retrieve_inapp_inbox()");
      expect(
        (await db.query<{ delivered_at: null }>("SELECT delivered_at FROM inapp_alerts")).rows[0]
          ?.delivered_at,
      ).toBe(null);
      await asUser(G, "SELECT retrieve_inapp_inbox()");
      let row = (
        await db.query<{
          delivered_at: string | null;
          read_at: string | null;
          acknowledged_at: string | null;
        }>("SELECT delivered_at,read_at,acknowledged_at FROM inapp_alerts")
      ).rows[0];
      expect(row?.delivered_at).not.toBeNull();
      expect(row?.read_at).toBeNull();
      expect(row?.acknowledged_at).toBeNull();
      await expect(asUser(G, `SELECT open_inapp_alert('${id}',true)`)).rejects.toThrow(
        "Open the alert",
      );
      await asUser(G, `SELECT open_inapp_alert('${id}',false)`);
      row = (
        await db.query<typeof row>("SELECT delivered_at,read_at,acknowledged_at FROM inapp_alerts")
      ).rows[0];
      expect(row?.read_at).not.toBeNull();
      expect(row?.acknowledged_at).toBeNull();
      await asUser(G, `SELECT open_inapp_alert('${id}',true)`);
      const before = (
        await db.query<{ delivered_at: string; read_at: string; acknowledged_at: string }>(
          "SELECT delivered_at,read_at,acknowledged_at FROM inapp_alerts",
        )
      ).rows;
      expect(before[0]?.acknowledged_at).not.toBeNull();
      await asUser(G, "SELECT retrieve_inapp_inbox()");
      await asUser(G, `SELECT open_inapp_alert('${id}',true)`);
      expect(
        (await db.query("SELECT delivered_at,read_at,acknowledged_at FROM inapp_alerts")).rows,
      ).toEqual(before);
    });
  });
  it("revocation immediately denies recipient reads/receipts/sends but retains traveller record", async () => {
    await fixture(async () => {
      const id = await sendAlert();
      await asUser(G, `SELECT revoke_inapp_guardian('${E}')`);
      expect((await asUser(G, "SELECT id FROM inapp_alerts")).rows).toHaveLength(0);
      expect(
        (await asUser<{ result: unknown[] }>(G, "SELECT retrieve_inapp_inbox() AS result")).rows[0]
          ?.result,
      ).toEqual([]);
      await expect(asUser(G, `SELECT open_inapp_alert('${id}',false)`)).rejects.toThrow(
        "unavailable",
      );
      await expect(asUser(G, `SELECT open_inapp_alert('${id}',true)`)).rejects.toThrow(
        "unavailable",
      );
      await expect(asUser(T, send())).rejects.toThrow("opted-in");
      expect((await asUser(T, "SELECT id FROM inapp_alerts")).rows).toHaveLength(1);
    });
  });
  it("owner can revoke; unrelated user cannot revoke", async () => {
    await fixture(async () => {
      await expect(asUser(U, `SELECT revoke_inapp_guardian('${E}')`)).rejects.toThrow(
        "unavailable",
      );
      await asUser(T, `SELECT revoke_inapp_guardian('${E}')`);
      await expect(asUser(T, send())).rejects.toThrow("opted-in");
    });
  });
  it("rejects stale, future, malformed or unconsented locations atomically", async () => {
    await fixture(async () => {
      const loc = { latitude: 1, longitude: 2, accuracy: 3, timestamp: Date.now() };
      for (const [value, consent] of [
        [loc, false],
        [{ ...loc, timestamp: Date.now() - 121000 }, true],
        [{ ...loc, timestamp: Date.now() + 20000 }, true],
        [{ ...loc, latitude: 91 }, true],
      ] as const)
        await expect(asUser(T, send([E], value, consent))).rejects.toThrow("fresh one-time fix");
      expect((await db.query("SELECT id FROM inapp_sos")).rows).toHaveLength(0);
      expect((await db.query("SELECT id FROM inapp_alerts")).rows).toHaveLength(0);
    });
  });
  it("deduplicates repeat sends and rejects a changed payload under the same request key", async () => {
    await fixture(async () => {
      const a = await asUser<{ result: { id: string; duplicate: boolean; count: number } }>(
        T,
        send([E, E]),
      );
      const b = await asUser<{ result: { id: string; duplicate: boolean; count: number } }>(
        T,
        send(),
      );
      expect(a.rows[0]?.result.count).toBe(1);
      expect(a.rows[0]?.result.duplicate).toBe(false);
      expect(b.rows[0]?.result.id).toBe(a.rows[0]?.result.id);
      expect(b.rows[0]?.result.duplicate).toBe(true);
      await expect(asUser(T, send([E], null, false, "Changed note"))).rejects.toThrow(
        "Request key already used",
      );
      expect((await db.query("SELECT id FROM inapp_alerts")).rows).toHaveLength(1);
      expect((await db.query("SELECT id FROM inapp_sos")).rows).toHaveLength(1);
    });
  });
  it("rolls back all recipients if one is missing or not opted in", async () => {
    await fixture(async () => {
      await expect(asUser(T, send([E, U]))).rejects.toThrow("opted-in");
      await db.exec(`UPDATE inapp_guardians SET consent='invited' WHERE id='${E}'`);
      await expect(asUser(T, send())).rejects.toThrow("opted-in");
      expect((await db.query("SELECT id FROM inapp_alerts")).rows).toHaveLength(0);
      expect((await db.query("SELECT id FROM inapp_sos")).rows).toHaveLength(0);
    });
  });
  it("denies anonymous reads and execution", async () => {
    await fixture(async () => {
      await db.exec("SET ROLE anon");
      try {
        await db.exec("SAVEPOINT anonymous_read");
        await expect(db.query("SELECT id FROM inapp_alerts")).rejects.toThrow("permission denied");
        await db.exec("ROLLBACK TO SAVEPOINT anonymous_read");
        await expect(db.query("SELECT retrieve_inapp_inbox()")).rejects.toThrow(
          "permission denied",
        );
        await db.exec("ROLLBACK TO SAVEPOINT anonymous_read; RELEASE SAVEPOINT anonymous_read");
      } finally {
        await db.exec("RESET ROLE");
      }
    });
  });
  it("never exposes a selected alert to another opted-in but unchosen guardian", async () => {
    await fixture(async () => {
      await db.exec(
        `INSERT INTO inapp_guardians(traveller_id,recipient_id,name,invited_email,token_hash,consent) VALUES('${T}','${U}','Unchosen','unrelated@example.test','${"b".repeat(64)}','opted_in')`,
      );
      await sendAlert();
      expect((await asUser(U, "SELECT note,location FROM inapp_alerts")).rows).toHaveLength(0);
      expect(
        (await asUser<{ result: unknown[] }>(U, "SELECT retrieve_inapp_inbox() AS result")).rows[0]
          ?.result,
      ).toEqual([]);
    });
  });
  it("blocks access even if revoked consent still says opted_in", async () => {
    await fixture(async () => {
      await sendAlert();
      await db.exec(`UPDATE inapp_guardians SET revoked_at=now() WHERE id='${E}'`);
      expect((await asUser(G, "SELECT id FROM inapp_alerts")).rows).toHaveLength(0);
      await expect(asUser(T, send())).rejects.toThrow("opted-in");
    });
  });
});

