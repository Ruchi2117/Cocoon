# Private emergency drafts and exact in-app SOS review

## Ready for review
- Account has an optional owner-private emergency draft: introduction (300 characters), help instructions (500), and up to five explicitly chosen currently consenting in-app guardians. Save/edit/delete never sends an alert. No date of birth, address or medical fields are required.
- A connected guardian cannot read the draft. Accepted contacts are never selected automatically. Revocation removes saved preferences permanently; reacceptance does not restore them.
- SOS opens with no recipients selected and no draft/GPS inclusion. Preferred contacts are labelled preferences; every send requires selecting 1–5 currently eligible guardians and reviewing the exact content separately.
- The sender can omit the saved draft entirely or edit its optional text just for this SOS. No contacts, medical fields, transcript, media or journey are scraped/included. A note is optional. One-time GPS requires an explicit click and separate sharing consent; its timestamp and accuracy are included, never live tracking.
- Review shows authenticated sender account/name, preparation timestamp, chosen recipients and optional content before final confirmation. An accepted send stores immutable per-recipient copies; later profile/contact/draft changes do not rewrite them.
- Owner history shows exact recipient account/enrollment/name, content and actual stored/retrieved/read/ack timestamps. Recipient opening displays the same approved content; RLS continues to deny unrelated and revoked recipients.

## Server and storage safeguards
Migration `0009_cocoon_emergency_drafts_snapshots.sql` was applied to Cloud and generated types refreshed. Read-only hosted policy inspection confirmed `emergency_draft_owner` scopes SELECT to the authenticated owner and `inapp_alert_recipient` requires the intended active opted-in enrollment. Direct draft/alert writes are denied; authenticated RPCs validate verified identity, limits, consent and actor ownership.

`write_emergency_draft` serializes owner preference changes and validates distinct current enrollments. `retire_emergency_preference` removes withdrawn connections. `send_inapp_sos_snapshot` validates fresh review/profile identity and location, locks recipients in stable order, and atomically creates a request and alerts. Invalid mixed recipients produce no partial send. Exact owner/request retries return the same result; changed payloads under the same key reject. Current UI fingerprints the reviewed payload: identical uncertain retries retain key/time, edits require a new key. Cancel/reopen clears state; pending submit disables edits/cancel. Identity-keyed editors ignore late results after unmount/account switch.

Older `send_inapp_sos` remains for additive compatibility with previously published clients. New UI rejects missing reviewed content. Existing historical alerts have defaults for new fields; earlier recipient-name fallback is labelled, not an invented historical snapshot.

## Verification
- Full Vitest suite: **255 tests in 39 files passed**.
- New isolated PGlite/PostgreSQL rollback tests: **11** covering owner/connected/unrelated/anonymous access, text limits, preference eligibility/revocation, immutable snapshots, draft omission/deletion, idempotency, invalid mixed recipients/atomicity, fresh consented location and verified sender identity. All migrations load into the synthetic database; no hosted users or sends are created.
- Mocked UI: ProductionSOS **7**, EmergencyDraftEditor **4**, InAppGuardians **5** tests; input schemas **9**. Includes explicit review/send, content selection, same-key/new-key retries, pending controls, cancel/reopen, account switches, stale eligibility, retry/error states and immutable recipient rendering. Existing recipient retrieve/open/ack tests stay separate.
- Changed application lint passed; automatic typecheck/build passed.
- Desktop 1280×1800 and mobile 390×844 public entry, Account, Presence SOS and Journey checks passed: no horizontal overflow, page errors, OAuth/provider requests or private signed-out controls. Screenshots inspected. No permission prompts or live location/audio/camera tests.

## Limitations and zero-payment boundary
This is private **in-app storage**, not emergency dispatch. Guardians must sign in and keep their account inbox open. Retrieval marks delivered only as authenticated retrieval; opening marks read; separate acknowledgement is not a promise of help. No closed-tab/background/push/SMS/WhatsApp/nearby/authority delivery. Information already retrieved cannot be clawed back, but revocation denies subsequent reads/open/ack.

Hosted signed-in readback and concurrent hosted sessions remain unverified because real accounts/SOS tests were forbidden. Synthetic SQL and signed-in service mocks were used instead. No providers, credentials, external accounts, billing changes or publication occurred. OpenAI/Twilio/Gemini gates remain immutable OFF. Included Cloud allowance is finite; no paid fallback was added.
