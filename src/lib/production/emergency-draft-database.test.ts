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
  await db.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`,
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
  await db.exec(
    `SAVEPOINT assertion;SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${id}',false)`,
  );
  try {
    const r = await db.query<Record<string, unknown>>(sql);
    await db.exec("RELEASE SAVEPOINT assertion");
    return r;
  } catch (e) {
    await db.exec("ROLLBACK TO SAVEPOINT assertion;RELEASE SAVEPOINT assertion");
    throw e;
  } finally {
    await db.exec("RESET ROLE");
  }
}
async function fixture(fn: () => Promise<void>) {
  await db.exec("BEGIN");
  try {
    await db.exec(
      `INSERT INTO auth.users VALUES('${T}','traveller@example.test',now()),('${G}','guardian@example.test',now()),('${U}','unrelated@example.test',now()); INSERT INTO inapp_guardians(id,traveller_id,recipient_id,name,invited_email,token_hash,consent) VALUES('${E}','${T}','${G}','Chosen guardian','guardian@example.test','${"a".repeat(64)}','opted_in')`,
    );
    await fn();
  } finally {
    await db.exec("ROLLBACK;RESET ROLE");
  }
  expect((await db.query("SELECT * FROM emergency_drafts")).rows).toHaveLength(0);
  expect((await db.query("SELECT * FROM inapp_alerts")).rows).toHaveLength(0);
}
const q = (x: unknown) => `'${JSON.stringify(x).replaceAll("'", "''")}'::jsonb`;
const ids = (arr = [E]) => `ARRAY[${arr.map((x) => `'${x}'::uuid`).join(",")}]::uuid[]`;
const draft = (
  intro = "My optional introduction",
  help = "Please call campus support",
  recipients = [E],
  del = false,
) => `SELECT write_emergency_draft(${del},'${intro}','${help}',${ids(recipients)})`;
const content = (changes: Record<string, unknown> = {}) => ({
  introduction: "Reviewed introduction",
  helpInstructions: "Reviewed help",
  includeDraft: true,
  senderName: "Traveller",
  preparedAt: new Date().toISOString(),
  ...changes,
});
const send = (
  c = content(),
  recipients = [E],
  key = R,
  note = "Reviewed note",
  location: unknown = null,
  consent = false,
) =>
  `SELECT send_inapp_sos_snapshot('${key}',${ids(recipients)},'${note}',${location === null ? "null" : q(location)},${consent},${q(c)}) AS result`;
describe("private emergency drafts and immutable SOS snapshots: synthetic PostgreSQL rollback", () => {
  it("owner can save/read/edit/delete while connected guardian and unrelated users cannot read or overwrite", () =>
    fixture(async () => {
      await asUser(T, draft());
      expect(
        (await asUser(T, "SELECT introduction FROM emergency_drafts")).rows[0]?.["introduction"],
      ).toBe("My optional introduction");
      expect((await asUser(G, "SELECT * FROM emergency_drafts")).rows).toHaveLength(0);
      expect((await asUser(U, "SELECT * FROM emergency_drafts")).rows).toHaveLength(0);
      await asUser(U, draft("Unrelated own draft", "", []));
      expect(
        (await asUser(T, "SELECT introduction FROM emergency_drafts")).rows[0]?.["introduction"],
      ).toBe("My optional introduction");
      await expect(
        asUser(G, "UPDATE emergency_drafts SET introduction='Tampered'"),
      ).rejects.toThrow("permission denied");
      await asUser(T, draft("Edited", "", []));
      expect(
        (await asUser(T, "SELECT introduction FROM emergency_drafts")).rows[0]?.["introduction"],
      ).toBe("Edited");
      await asUser(T, draft("", "", [], true));
      await db.exec(
        "UPDATE inapp_guardians SET name='Changed after send'; UPDATE profiles SET display_name='Changed sender after send'",
      );
      expect((await asUser(T, "SELECT * FROM emergency_drafts")).rows).toHaveLength(0);
    }));
  it("enforces independent 300-character introduction and 500-character help bounds in SQL", () =>
    fixture(async () => {
      await expect(asUser(T, draft("x".repeat(301)))).rejects.toThrow("Invalid emergency draft");
      await expect(asUser(T, draft("", "x".repeat(501)))).rejects.toThrow(
        "Invalid emergency draft",
      );
      await asUser(T, draft("x".repeat(300), "x".repeat(500)));
      expect((await asUser(T, "SELECT * FROM emergency_drafts")).rows).toHaveLength(1);
    }));
  it("preferences accept only currently consenting owned recipients, never add newly accepted or restore revoked IDs", () =>
    fixture(async () => {
      await asUser(T, draft());
      await db.exec(
        `INSERT INTO inapp_guardians(traveller_id,recipient_id,name,invited_email,token_hash,consent) VALUES('${T}','${U}','New guardian','new@example.test','${"b".repeat(64)}','opted_in')`,
      );
      expect(
        (await asUser(T, "SELECT preferred_recipient_ids FROM emergency_drafts")).rows[0]?.[
          "preferred_recipient_ids"
        ],
      ).toEqual([E]);
      await asUser(G, `SELECT revoke_inapp_guardian('${E}')`);
      expect(
        (await asUser(T, "SELECT preferred_recipient_ids FROM emergency_drafts")).rows[0]?.[
          "preferred_recipient_ids"
        ],
      ).toEqual([]);
      await db.exec("UPDATE inapp_guardians SET revoked_at=null,consent='opted_in'");
      expect(
        (await asUser(T, "SELECT preferred_recipient_ids FROM emergency_drafts")).rows[0]?.[
          "preferred_recipient_ids"
        ],
      ).toEqual([]);
      await expect(asUser(U, draft())).rejects.toThrow("consenting");
      await expect(asUser(T, draft("", "", [E, E]))).rejects.toThrow("Invalid emergency draft");
    }));
  it("send selectively uses reviewed editable content, never pulls the stored draft, and draft deletion leaves snapshots unchanged", () =>
    fixture(async () => {
      await asUser(T, draft("Saved private secret", "Saved instructions"));
      const c = content();
      await asUser(T, send(c));
      await asUser(T, draft("Edited draft", "Changed instructions", []));
      await asUser(T, draft("", "", [], true));
      const a = (await asUser(T, "SELECT * FROM inapp_alerts")).rows[0];
      expect(a?.["introduction"]).toBe("Reviewed introduction");
      expect(a?.["help_instructions"]).toBe("Reviewed help");
      expect(a?.["note"]).toBe("Reviewed note");
      expect(a?.["recipient_name"]).toBe("Chosen guardian");
      expect(a?.["traveller_name"]).toBe("Traveller");
      expect(a?.["traveller_id"]).toBe(T);
      expect(a?.["prepared_at"]).toBeDefined();
      expect(
        (await asUser(G, "SELECT introduction FROM inapp_alerts")).rows[0]?.["introduction"],
      ).toBe("Reviewed introduction");
      expect((await asUser(U, "SELECT * FROM inapp_alerts")).rows).toHaveLength(0);
    }));
  it("omitting draft stores no private introduction/help and rejects hidden content without inclusion consent", () =>
    fixture(async () => {
      await asUser(T, draft());
      await expect(asUser(T, send(content({ includeDraft: false })))).rejects.toThrow(
        "Omitted draft",
      );
      await asUser(
        T,
        send(content({ includeDraft: false, introduction: "", helpInstructions: "" })),
      );
      const a = (await db.query<Record<string, unknown>>("SELECT * FROM inapp_alerts")).rows[0];
      expect(a?.["introduction"]).toBe("");
      expect(a?.["help_instructions"]).toBe("");
      expect(a?.["draft_included"]).toBe(false);
      expect(a?.["location"]).toBe(null);
    }));
  it("identical retries dedupe, changes with the same key reject, and a new key creates a new exact snapshot", () =>
    fixture(async () => {
      const c = content();
      await asUser(T, send(c));
      const retry = await asUser(T, send(c));
      expect(retry.rows[0]?.["result"]).toMatchObject({ duplicate: true, count: 1 });
      await expect(asUser(T, send(c, [E], R, "Changed"))).rejects.toThrow("Request key");
      await asUser(T, send(c, [E], "60606060-6060-4060-8060-606060606060", "Changed"));
      expect((await db.query("SELECT * FROM inapp_alerts")).rows).toHaveLength(2);
    }));
  it("revocation denies snapshot retrieval/open/ack and exact retries while preserving owner immutable history", () =>
    fixture(async () => {
      const c = content();
      await asUser(T, send(c));
      const id = (await db.query<{ id: string }>("SELECT id FROM inapp_alerts")).rows[0]?.["id"];
      await asUser(G, `SELECT open_inapp_alert('${id}',false)`);
      await asUser(G, `SELECT revoke_inapp_guardian('${E}')`);
      expect((await asUser(G, "SELECT * FROM inapp_alerts")).rows).toHaveLength(0);
      expect(
        (await asUser(G, "SELECT retrieve_inapp_inbox() AS result")).rows[0]?.["result"],
      ).toEqual([]);
      await expect(asUser(G, `SELECT open_inapp_alert('${id}',true)`)).rejects.toThrow(
        "unavailable",
      );
      await expect(asUser(T, send(c))).rejects.toThrow("opted-in");
      expect(
        (await asUser(T, "SELECT introduction FROM inapp_alerts")).rows[0]?.["introduction"],
      ).toBe("Reviewed introduction");
    }));
  it("invalid mixed recipients fail atomically without an SOS or alert, and duplicate selection is rejected", () =>
    fixture(async () => {
      await expect(asUser(T, send(content(), [E, U]))).rejects.toThrow("opted-in");
      await expect(asUser(T, send(content(), [E, E]))).rejects.toThrow("Invalid SOS");
      expect((await db.query("SELECT * FROM inapp_sos")).rows).toHaveLength(0);
      expect((await db.query("SELECT * FROM inapp_alerts")).rows).toHaveLength(0);
    }));
  it("enforces snapshot text/note bounds, sender identity and review freshness", () =>
    fixture(async () => {
      for (const c of [
        content({ introduction: "x".repeat(301) }),
        content({ helpInstructions: "x".repeat(501) }),
        content({ senderName: "Impersonated" }),
        content({ preparedAt: new Date(Date.now() - 11 * 60000).toISOString() }),
      ])
        await expect(asUser(T, send(c))).rejects.toThrow();
      await expect(asUser(T, send(content(), [E], R, "x".repeat(501)))).rejects.toThrow(
        "Invalid SOS",
      );
      expect((await db.query("SELECT * FROM inapp_alerts")).rows).toHaveLength(0);
    }));
  it("requires fresh explicitly consented location and excludes extra transcript/media fields", () =>
    fixture(async () => {
      const loc = { latitude: 12, longitude: 34, accuracy: 25, timestamp: Date.now() };
      await expect(asUser(T, send(content(), [E], R, "", loc, false))).rejects.toThrow("Location");
      await expect(
        asUser(T, send(content(), [E], R, "", { ...loc, timestamp: Date.now() - 121000 }, true)),
      ).rejects.toThrow("Location");
      await expect(asUser(T, send(content({ transcript: "Forbidden" })))).rejects.toThrow(
        "Invalid reviewed",
      );
      await asUser(T, send(content(), [E], R, "", loc, true));
      expect(
        (await db.query<Record<string, unknown>>("SELECT location FROM inapp_alerts")).rows[0]?.[
          "location"
        ],
      ).toEqual(loc);
    }));
  it("verified identity and anonymous/direct-write denial remain mandatory", () =>
    fixture(async () => {
      await db.exec(`UPDATE auth.users SET email_confirmed_at=null WHERE id='${T}'`);
      await expect(asUser(T, draft())).rejects.toThrow("Verified");
      await expect(asUser(T, send())).rejects.toThrow("Verified");
      await expect(asUser(T, "UPDATE inapp_alerts SET introduction='Tamper'")).rejects.toThrow(
        "permission denied",
      );
      await db.exec("SAVEPOINT anon_test;SET ROLE anon");
      await expect(db.query("SELECT * FROM emergency_drafts")).rejects.toThrow("permission denied");
      await db.exec("ROLLBACK TO SAVEPOINT anon_test;RELEASE SAVEPOINT anon_test;RESET ROLE");
    }));
});
