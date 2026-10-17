# Production connection status

## Implemented

- Cloud-managed Google and Lovable sign-in. Public experience/demo remain separate; private data and mutations require verified bearer identity.
- RLS-protected profiles, channel preferences, guardian enrollment, emergency sessions, message queue, due jobs, provider callback inbox and voice quota reservations.
- Guardian invitation is user-shared, expires in 7 days, is single-use, hash-stored, and bound to the recipient's verified sign-in email. Recipient enters their own E.164 number and explicitly consents to WhatsApp. This is a recipient assertion of number ownership, **not carrier/WhatsApp number verification**; a verified-number provider flow is still a production prerequisite where verified number ownership is required.
- User-confirmed SOS chooses only the traveller's opted-in guardians. Snapshot off by default; one-time location includes timestamp/accuracy and must be no older than 2 minutes. No authorities, nearby broadcasts or AI-triggered notifications.
- Queue uses unique idempotency keys, transactional conditional message claims and a bounded worker lease. No automatic replay of ambiguous acceptance after a timeout/crash. Operator reconciliation is required; Twilio does not promise exactly-once delivery.
- Callback signature verifies the exact externally visible URL. Durable transactional inbox preserves callback-before-SID races, replay dedupe, monotonic delivery and separate recipient acknowledgement.
- OpenAI direct WebRTC (`POST /v1/realtime/calls`) preserved. API key server-only; authenticated caller, strict origin, explicit microphone/context consent, one active reservation, 3 starts/hour, 10 starts/day (UTC), ten-minute local limit. Server hangup uses recorded call IDs. No tools are exposed to the model; no audio/transcript persistence.

## Zero-payment release / exact limitations

The user has no external provider accounts. Do not create accounts, accept terms, request OpenAI/Twilio credentials, add cards, enable billing/overage/auto-top-up, upgrade plans, or spend paid API/runtime funds. Only the existing included Lovable Cloud allowance is authorized; no paid Cloud billing changes have been made. Included allowance is finite, not a promise of unlimited free operation; if exhausted, stop rather than opt into payment.

`src/lib/production/provider-policy.ts` locks both paid channels off. Credentials and activation environment flags cannot override this release policy. Status, dispatch and voice creation enforce it. Existing provider code remains reviewable, not activated.

### Ready without external provider accounts
- Private sign-in, profiles, token-bound guardian enrollment, preferences, SOS records and outbox wiring with ownership/consent protections.
- Account read/refresh exposes only records allowed by RLS; acknowledgement is explicit and separate from delivery. This is **not a new in-app notification channel**: consent/enrollment currently targets WhatsApp, and no background/push delivery is implemented. A provider-free in-app channel would require its own explicit opt-in and end-to-end verification before advertising it.
- Scripted browser-speech and text demo, separately labelled. Browser speech is not natural conversational AI. Browser/device availability varies; no paid AI call is made by this demo.
- Saving an SOS stores a private record and unsent intents only. Nobody is notified. Queued is not sent, delivered, acknowledged, dispatched to authorities or help arriving. Do not enable dormant queues later without explicit review of existing consent and stale emergency intents.

### Intentionally unavailable
1. **OpenAI natural speech-to-speech:** usage-priced external API, not a guaranteed zero-cost service. No account or credentials are requested. Disabled even if a key appears.
2. **Automatic WhatsApp through Twilio:** usage-priced external business messaging; free trials are not a guarantee of zero-payment production operation. No account/sender/template provisioning or credentials are requested. Disabled even if a connection appears.
3. **Closed-tab automation:** durable scheduling is not configured or verified; no browser timer or page refresh is represented as background delivery. No scheduler account will be created or terms accepted on the user's behalf.
4. **Live verification:** authenticated private UI readback still needs the user's first sign-in. Production delivery, audible voice, provider termination and closed-tab dispatch remain unverified. Real messages, calls and media tests are prohibited.

### Gemini Live free-tier review — unavailable
Official pricing confirms `gemini-2.5-flash-native-audio-preview-12-2025` has free-tier audio input/output, subject to quotas, with product-improvement use. However, Google's unpaid-service terms prohibit submitting sensitive, confidential or personal information; human reviewers may process inputs/outputs. A safety companion cannot reliably prevent a caller from speaking personal or crisis information before it reaches the provider. An opt-in, prompt, or omission of trip context does not remedy this restriction. The terms also exclude apps likely to be accessed by under-18s and require Paid Services for API clients offered in the EEA, UK and Switzerland.

`PROVIDER_POLICY.geminiLive` is explicitly frozen off. No Gemini transport, token endpoint, key request, account creation or silent OpenAI replacement was added. This is an eligibility/privacy blocker, not just a missing key. See [the sourced review and reference-only auth/audio schemas](../../../docs/voice/GEMINI-FREE-TIER-REVIEW.md). A free AI Studio key does not make Cocoon voice eligible. No billing-linked project, paid fallback or provider traffic is authorized.

### Future paid-option blockers (reference only, not instructions to activate)
Any future change requires explicit revised user authorization before changing the code policy or configuring services. OpenAI requires a user-owned account, server-only project key, supported realtime model/voice and verified durable session cleanup. Twilio requires a user-owned connection, verified WhatsApp Business sender and Meta business/display-name approval; five approved Content templates; server-only callback authentication; recipient consent and number-verification requirements; verified durable dispatch and bounded retries. These human approvals cannot be invented or completed on the user's behalf.

Template IDs use `HX` plus 32 hexadecimal characters. SOS variables: traveller, destination, ETA, optional note, public snapshot map URL or “No location shared”, snapshot time, accuracy/non-live label. Overdue content must say a missed check-in is not proof of danger. Provider approvals must be read back, not inferred from secrets.

Activation flags remain off. Callback path: `/api/public/whatsapp/twilio-status`; dispatcher path: `/api/public/cron/notify-dispatch`. No publishing until verification and explicit user instruction. Do not run provider calls to validate this release.

## Verification restrictions

Independent recipient-policy review is persisted verbatim in `drizzle/migrations/0005_cocoon_outbox_recipient_qualified_review.sql` and the hosted `pg_policies` expression was read back. The correlated reference is explicitly `notify_outbox.recipient_id`, never the guardian's `recipient_id`. Six actual PostgreSQL RLS tests in `database.test.ts` run under the authenticated role with synthetic traveller, guardian and unrelated identities; each fixture transaction rolls back and confirms no residue. Tests cover owner access, intended guardian access with distinct enrollment/user IDs, unrelated denial, recipient revocation, revoked-but-opted-in denial and opted-out denial. These execute in isolated PGlite PostgreSQL against all migrations, not against hosted production. Available hosted query tools do not support a privileged rollback test transaction; hosted synthetic assertions remain unverified. No real users or provider calls are involved.

Development uses mock providers and isolated PostgreSQL tests. Never invoke real outgoing sends/calls, location, microphone or camera in these checks. OAuth through a real external provider remains a human-controlled verification step. Status accepted is not delivered; delivery is not acknowledgement or help arriving.

## References

- https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/create/
- https://developers.openai.com/api/reference/resources/realtime/subresources/calls/
- https://www.twilio.com/docs/whatsapp/api
- https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates

