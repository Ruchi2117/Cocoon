# SOS routing audit and delivery boundary

## Current status
This checkout is a localStorage demo. No real outbound message, authority dispatch, authenticated nearby-user broadcast or background delivery is enabled. Existing WhatsApp outbox code is mock-tested but has no durable repository/provider wiring; see whatsapp/SETUP.md. The global Get help panel remains a user-confirmed dialler/share handoff.

## Changes
- Per-demo-traveller SOS preferences in Safety Kit: select accepted guardians, opt into participating demo responders, and record authority/nearby assistance preferences with explicit unavailable status.
- All selected accepted guardians are used, instead of silently choosing one. Null selection means all currently accepted guardians; empty selection means none. Invited/revoked connections are excluded at dispatch time.
- Responders must have demo-verified identity, eligibility, opt-in and availability flags. These are local demo flags, not real authentication or proximity evidence. No nearby recipients are invented from area names.
- Incident stores optional help request (500 characters), location source and capture timestamp, plus unavailable-channel intent. Guardian/responder pages show the request and snapshot provenance. Sample or last-known locations are never labelled live GPS.
- Duplicate SOS activation does not create a second open incident. Existing failed/delivered/acknowledged/assistance/closed transitions remain separate.
- Retries recheck guardian acceptance/responder eligibility. Blocked retries stay failed and add an explanatory event.
- Excluded trip guardians do not receive SOS or responder-ack notifications indirectly.
- Authority/nearby preferences produce explicit not-sent events rather than fabricated recipients or delivery success.

## Verification
123 full-suite tests passed before the final two privacy tests; the final 21 SOS/trip/recipient tests also passed, including multiple guardians and excluded-guardian acknowledgement leakage. TypeScript, targeted lint and production build passed. Browser opened and cancelled confirmation without creating an incident or sending anything. No live GPS, microphone, camera, dialler, share or outbound messaging was activated.

## Production requirements
Authenticated server-side accounts/RLS and enforced recipient relationships; durable outbox/idempotency/receipt callbacks/retries; verified and consented delivery channels; nearby helper vetting, opt-in, availability, fresh consented positions and radius checks on the server; approved agency/country integration for dispatch. Exact location must be protected, access restricted and retention limited. Live end-to-end tests require an explicitly designated test recipient and connected provider; emergency authorities must not receive test alarms.

Final verification: full suite 125 tests passed after the multiple-guardian and excluded-guardian privacy cases. Browser confirmation was cancelled without creating an alert; no real recipients were contacted.
