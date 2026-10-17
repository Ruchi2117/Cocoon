# Automatic WhatsApp safety alerts — setup

Status: code is implemented and tested with mocks only. **Not live.** The app shows
"WhatsApp not connected — automatic messages unavailable" until every item below is done.

## Built
- `src/lib/notify/engine.ts`: outbox engine (rules, consent and E.164 checks, idempotency, bounded retries, overdue jobs, re-checks at send time, status callbacks that never move backwards, delivery kept separate from acknowledgement).
- `src/lib/notify/twilio.ts`: Twilio Content-template sender via the connector gateway, plus `X-Twilio-Signature` verification (Web Crypto, works on Workers).
- `POST /api/public/whatsapp/twilio-status`: checks the signature first; returns 503 until outbox storage exists, so Twilio retries instead of the event being lost.
- `POST /api/public/cron/notify-dispatch`: scheduler tick protected by `LOVABLE_CRON_SECRET`; refuses (503) until storage and the provider are configured.
- `getWhatsAppStatus` server function: reports missing secret NAMES only.

## Prerequisites (in order)
1. **Lovable Cloud** (database + sign-in): replace the local demo store with authenticated users, `trips`, and the tables below, with RLS.
2. **Twilio account with a WhatsApp Business sender**, Meta-approved for the business (Cocoon's number, not a personal account).
3. **Five approved Content templates** (Utility category), positional variables in this order:
   - trip_started: {{1}} traveller, {{2}} destination, {{3}} ETA
   - checkin_overdue: {{1}} traveller, {{2}} destination, {{3}} ETA, {{4}} "not proof of danger" note
   - concern: {{1}}, {{2}}, {{3}}
   - sos: {{1}}, {{2}}, {{3}}
   - arrived: {{1}} traveller, {{2}} destination
4. **Twilio connector** linked to this project (provides `TWILIO_API_KEY`).
5. **Secrets** (Project Settings → Secrets): `TWILIO_AUTH_TOKEN` (for webhook signatures), `TWILIO_WHATSAPP_FROM` (E.164),
   `TWILIO_TEMPLATE_TRIP_STARTED`, `TWILIO_TEMPLATE_CHECKIN_OVERDUE`, `TWILIO_TEMPLATE_CONCERN`, `TWILIO_TEMPLATE_SOS`, `TWILIO_TEMPLATE_ARRIVED` (HX… SIDs).
6. **Recipient opt-in flow**: each trusted contact confirms (for example by replying to an approved opt-in template, handled by an inbound webhook) before `opt_in = 'opted_in'`.
7. **Publish**, then schedule pg_cron every minute: POST `https://project--<id>.lovable.app/api/public/cron/notify-dispatch` with `Authorization: Bearer $LOVABLE_CRON_SECRET`.
   Messages keep sending after the browser tab is closed only once this step is live.
8. Wire a database-backed `NotifyRepo` into both routes (claims use `UPDATE … WHERE status='queued' RETURNING`).

## Schema sketch (apply once Cloud is enabled; add GRANTs + RLS)
```sql
create type notify_event as enum ('trip_started','checkin_overdue','concern','sos','arrived');
create table alert_rules (traveller_id uuid primary key references auth.users, enabled jsonb not null, grace_minutes int not null check (grace_minutes between 5 and 60));
create table alert_recipients (id uuid primary key default gen_random_uuid(), traveller_id uuid not null references auth.users, name text not null, phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'), opt_in text not null check (opt_in in ('invited','opted_in','opted_out')), opt_in_at timestamptz);
create table trip_alert_recipients (trip_id uuid references trips on delete cascade, recipient_id uuid references alert_recipients on delete cascade, primary key (trip_id, recipient_id));
create table notify_outbox (id uuid primary key default gen_random_uuid(), idempotency_key text unique not null, trip_id uuid not null references trips, recipient_id uuid not null references alert_recipients, event notify_event not null, origin text not null check (origin in ('user_action','scheduler')), vars jsonb not null, status text not null, attempts int not null default 0, next_attempt_at timestamptz not null, provider_sid text unique, last_error text, status_times jsonb not null default '{}', acknowledged_at timestamptz, created_at timestamptz not null default now());
create table notify_jobs (id uuid primary key default gen_random_uuid(), key text unique not null, trip_id uuid not null references trips, due_at timestamptz not null, run_at timestamptz not null, status text not null, reason text);
create table provider_events (event_id text primary key, received_at timestamptz not null default now());
```

