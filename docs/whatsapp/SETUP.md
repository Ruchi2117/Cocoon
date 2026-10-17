# Automatic WhatsApp alerts — disabled, zero-payment release

Automatic WhatsApp is not available under the user's zero-payment constraint. No provider accounts exist; no credentials, cards, billing, paid plans or trials are requested. Do not create external accounts or accept terms on the user's behalf.

The tested provider-agnostic outbox, Twilio adapter, signed callback processing, database-backed repository and authenticated consent/SOS wiring remain preserved. The shared immutable provider policy disables outgoing dispatch even if credentials or activation flags appear. Saving records is not delivery; no real sends have been tested.

The previous setup sketch is superseded by the applied private-safety migrations and `src/lib/production/PRODUCTION.md`. That document lists the exact release limitations and future provider approvals for reference only. Do not apply a second schema, manually configure managed cron SQL or publish to activate services.

Twilio WhatsApp production messaging is usage-priced, not guaranteed zero-cost. Durable closed-tab sending is not configured or verified. In-app account records require opening and refreshing the page; no push/background delivery is claimed. Manual share remains a separately user-initiated handoff, never a substitute presented as working automatic sending.

