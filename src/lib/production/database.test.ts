// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222",
  G = "33333333-3333-4333-8333-333333333333";
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
  await db.exec(
    `INSERT INTO auth.users VALUES('${A}','a@example.test',now()),('${B}','b@example.test',now()); INSERT INTO public.guardian_enrollments(id,traveller_id,name,invited_email,token_hash,expires_at) VALUES('${G}','${A}','Guardian','b@example.test','mock-invitation-hash',now()+interval '1 day');`,
  );
}, 30000);
afterAll(async () => {
  await db.close();
});
async function asUser<T>(id: string, sql: string) {
  await db.exec(
    `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    return await db.query<T>(sql);
  } finally {
    await db.exec("RESET ROLE");
  }
}
const SYNTHETIC_TRAVELLER = "66666666-6666-4666-8666-666666666666",
  SYNTHETIC_GUARDIAN = "77777777-7777-4777-8777-777777777777",
  SYNTHETIC_UNRELATED = "88888888-8888-4888-8888-888888888888",
  SYNTHETIC_ENROLLMENT = "99999999-9999-4999-8999-999999999999",
  SYNTHETIC_SESSION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

/** Real PostgreSQL RLS evaluation, with every synthetic fixture rolled back. */
async function withRollbackOutbox(assertions: () => Promise<void>) {
  await db.exec("BEGIN");
  try {
    await db.exec(`
      INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
        ('${SYNTHETIC_TRAVELLER}','rollback-traveller@example.test',now()),
        ('${SYNTHETIC_GUARDIAN}','rollback-guardian@example.test',now()),
        ('${SYNTHETIC_UNRELATED}','rollback-unrelated@example.test',now());
      INSERT INTO guardian_enrollments(id,traveller_id,recipient_id,name,invited_email,token_hash,expires_at,consent,consent_at)
        VALUES('${SYNTHETIC_ENROLLMENT}','${SYNTHETIC_TRAVELLER}','${SYNTHETIC_GUARDIAN}',
          'Synthetic guardian','rollback-guardian@example.test','rollback-only-token',now()+interval '1 day','opted_in',now());
      INSERT INTO emergency_sessions(id,traveller_id,request_key,payload)
        VALUES('${SYNTHETIC_SESSION}','${SYNTHETIC_TRAVELLER}','${SYNTHETIC_SESSION}','{}');
      INSERT INTO notify_outbox(id,idempotency_key,trip_id,traveller_id,recipient_id,payload)
        VALUES('rollback-outbox','rollback-outbox','${SYNTHETIC_SESSION}','${SYNTHETIC_TRAVELLER}','${SYNTHETIC_ENROLLMENT}','{}');
    `);
    await assertions();
  } finally {
    await db.exec("RESET ROLE; ROLLBACK");
  }
  expect(
    (await db.query("SELECT id FROM notify_outbox WHERE id='rollback-outbox'")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query(`SELECT id FROM auth.users WHERE id='${SYNTHETIC_TRAVELLER}'`)).rows,
  ).toHaveLength(0);
}

describe("reviewed recipient policy — rollback-based synthetic RLS assertions", () => {
  const readFixture = (user: string) =>
    asUser<{ id: string }>(user, "SELECT id FROM notify_outbox WHERE id='rollback-outbox'");

  it("allows the synthetic traveller to read their own outbox row", async () => {
    await withRollbackOutbox(async () => {
      expect((await readFixture(SYNTHETIC_TRAVELLER)).rows).toEqual([{ id: "rollback-outbox" }]);
    });
  });
  it("allows the intended opted-in guardian despite enrollment and user IDs differing", async () => {
    await withRollbackOutbox(async () => {
      expect((await readFixture(SYNTHETIC_GUARDIAN)).rows).toEqual([{ id: "rollback-outbox" }]);
    });
  });
  it("denies an unrelated authenticated user access", async () => {
    await withRollbackOutbox(async () => {
      expect((await readFixture(SYNTHETIC_UNRELATED)).rows).toEqual([]);
    });
  });
  it("immediately removes guardian access after recipient revocation but retains owner access", async () => {
    await withRollbackOutbox(async () => {
      expect((await readFixture(SYNTHETIC_GUARDIAN)).rows).toHaveLength(1);
      await asUser(SYNTHETIC_GUARDIAN, `SELECT revoke_guardian('${SYNTHETIC_ENROLLMENT}')`);
      expect((await readFixture(SYNTHETIC_GUARDIAN)).rows).toEqual([]);
      expect((await readFixture(SYNTHETIC_TRAVELLER)).rows).toEqual([{ id: "rollback-outbox" }]);
    });
  });
  it("denies a revoked enrollment even when consent still says opted_in", async () => {
    await withRollbackOutbox(async () => {
      await db.exec(
        `UPDATE guardian_enrollments SET revoked_at=now() WHERE id='${SYNTHETIC_ENROLLMENT}'`,
      );
      expect((await readFixture(SYNTHETIC_GUARDIAN)).rows).toEqual([]);
    });
  });
  it("denies opted-out consent even without a revocation timestamp", async () => {
    await withRollbackOutbox(async () => {
      await db.exec(
        `UPDATE guardian_enrollments SET consent='opted_out',revoked_at=null WHERE id='${SYNTHETIC_ENROLLMENT}'`,
      );
      expect((await readFixture(SYNTHETIC_GUARDIAN)).rows).toEqual([]);
    });
  });
});
describe("real PostgreSQL ownership policies (isolated; no live personal data)", () => {
  it("creates a private profile on signup", async () =>
    expect((await db.query(`SELECT id FROM profiles WHERE id='${A}'`)).rows).toHaveLength(1));
  it("reads only the signed-in user profile", async () => {
    const r = await asUser<{ id: string }>(A, "SELECT id FROM profiles");
    expect(r.rows).toEqual([{ id: A }]);
  });
  it("cannot edit another user profile", async () => {
    const r = await asUser(
      A,
      `UPDATE profiles SET display_name='Stolen' WHERE id='${B}' RETURNING id`,
    );
    expect(r.rows).toHaveLength(0);
  });
  it("cannot grant guardian consent through direct writes", async () => {
    await expect(
      asUser(A, `UPDATE guardian_enrollments SET consent='opted_in' WHERE id='${G}'`),
    ).rejects.toThrow(/permission denied/);
  });
  it("does not expose invitation hashes to authenticated browser reads", async () => {
    await expect(asUser(A, "SELECT token_hash FROM guardian_enrollments")).rejects.toThrow(
      /permission denied/,
    );
  });
  it("rejects a confirmation token belonging to another email", async () => {
    await expect(
      asUser(A, `SELECT confirm_guardian('mock-invitation-hash','+447700900123')`),
    ).rejects.toThrow(/unavailable/);
  });
  it("accepts the token only for its verified recipient account", async () => {
    const r = await asUser<{ confirm_guardian: string }>(
      B,
      `SELECT confirm_guardian('mock-invitation-hash','+447700900123')`,
    );
    expect(r.rows[0]?.confirm_guardian).toBe(G);
  });
  it("rejects replay of a consumed confirmation token", async () => {
    await expect(
      asUser(B, `SELECT confirm_guardian('mock-invitation-hash','+447700900123')`),
    ).rejects.toThrow(/unavailable/);
  });
  it("prevents preference writes for another traveller", async () => {
    await expect(
      asUser(A, `INSERT INTO alert_preferences(traveller_id) VALUES('${B}')`),
    ).rejects.toThrow(/row-level security/);
  });
  it("denies unauthenticated private profile reads", async () => {
    await db.exec("SET ROLE anon");
    try {
      await expect(db.query("SELECT * FROM profiles")).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("RESET ROLE");
    }
  });
  it("denies users privileged outbox claims", async () => {
    await expect(asUser(A, `SELECT claim_notify('mock')`)).rejects.toThrow(/permission denied/);
  });
  it("commits SOS and deduplicated outbox in a single transaction", async () => {
    const id = "44444444-4444-4444-8444-444444444444",
      request = "55555555-5555-4555-8555-555555555555";
    const snapshot = {
      id,
      travellerId: A,
      status: "active",
      destination: "Support request",
      recipientIds: [G],
    };
    const messages = [
      { id: "message-1", recipientId: G, event: "sos", origin: "user_action", attempts: 0 },
    ];
    await db.exec(
      `INSERT INTO alert_preferences(traveller_id,enabled) VALUES('${A}','{"sos":true}')`,
    );
    const sql = `SELECT commit_sos_intent('${A}','${request}','${JSON.stringify(snapshot)}','',null,'${JSON.stringify(messages)}')`;
    await db.query(sql);
    await db.query(sql);
    expect((await db.query("SELECT id FROM notify_outbox")).rows).toHaveLength(1);
    expect((await asUser(B, "SELECT id FROM notify_outbox")).rows).toHaveLength(1);
  });
  it("only one worker can claim a queued message", async () => {
    expect(
      (await db.query<{ claim_notify: boolean }>("SELECT claim_notify('message-1')")).rows[0]
        ?.claim_notify,
    ).toBe(true);
    expect(
      (await db.query<{ claim_notify: boolean }>("SELECT claim_notify('message-1')")).rows[0]
        ?.claim_notify,
    ).toBe(false);
  });
  it("retains callback before sender saves provider id", async () => {
    await db.query(`SELECT store_notify_callback('delivery-1','SM_mock','delivered','{}')`);
    await db.query(
      `SELECT patch_notify('message-1','{"providerSid":"SM_mock","status":"accepted"}')`,
    );
    expect(
      (await db.query<{ status: string }>("SELECT status FROM notify_outbox WHERE id='message-1'"))
        .rows[0]?.status,
    ).toBe("delivered");
  });
  it("older sent callback cannot regress delivered status", async () => {
    await db.query(`SELECT store_notify_callback('delivery-2','SM_mock','sent','{}')`);
    expect(
      (await db.query<{ status: string }>("SELECT status FROM notify_outbox WHERE id='message-1'"))
        .rows[0]?.status,
    ).toBe("delivered");
  });
  it("delivery does not manufacture recipient acknowledgement", async () => {
    expect(
      (
        await db.query<{ ack: string | null }>(
          "SELECT payload->>'acknowledgedAt' AS ack FROM notify_outbox WHERE id='message-1'",
        )
      ).rows[0]?.ack,
    ).toBe(null);
  });
  it("enforces ten guardian enrollments transactionally", async () => {
    for (let i = 0; i < 9; i++)
      await db.exec(
        `INSERT INTO guardian_enrollments(traveller_id,name,invited_email,token_hash,expires_at) VALUES('${A}','Mock','x${i}@example.test','limit-${i}',now()+interval '1 day')`,
      );
    await expect(
      db.exec(
        `INSERT INTO guardian_enrollments(traveller_id,name,invited_email,token_hash,expires_at) VALUES('${A}','Mock','eleven@example.test','limit-eleven',now()+interval '1 day')`,
      ),
    ).rejects.toThrow("Maximum ten");
  });
  it("enforces one concurrent voice session", async () => {
    await db.query(`SELECT reserve_voice('${A}')`);
    await expect(db.query(`SELECT reserve_voice('${A}')`)).rejects.toThrow(/already active/);
  });
  it("enforces three voice starts per hour", async () => {
    await db.exec(`UPDATE voice_sessions SET status='closed' WHERE user_id='${A}'`);
    await db.query(`SELECT reserve_voice('${A}')`);
    await db.exec(`UPDATE voice_sessions SET status='closed' WHERE user_id='${A}'`);
    await db.query(`SELECT reserve_voice('${A}')`);
    await db.exec(`UPDATE voice_sessions SET status='closed' WHERE user_id='${A}'`);
    await expect(db.query(`SELECT reserve_voice('${A}')`)).rejects.toThrow(/limit/);
  });
});

