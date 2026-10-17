<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Cocoon data lives in a localStorage demo adapter (`src/lib/cocoon/store.ts`) with role access rules in `access.ts` and all mutations/incident transitions in `actions.ts` — single source of truth; swap for Lovable Cloud + RLS when a real backend is approved.
- Presence uses an injected generation-bound browser controller: one explicit listening turn, bounded sequential speech, no auto-resume or private mutations; ephemeral transcript prevents persistence leaks. Production voice retains authenticated quotas and consent but stays policy-disabled. See `docs/PRESENCE-ROOM.md` and production documentation; label all scripted/simulated behavior.
- Leaflet is loaded only via `MapView` (lazy + ClientOnly) because it touches `window` at import.
- Live geocoding/walking routes go through `src/lib/cocoon/geo.ts` (Photon + FOSSGIS OSRM foot), explicit-submit only with timeouts/throttle/cache; seeded paths are a labelled dashed fallback — public community endpoints, no keys. Never imply routes guarantee safety.
- Demo role and actor identities are sessionStorage per tab; shared records stay in localStorage. Persisted records are validated by `persistence.ts`.
- Circle posts/replies live in the demo store, mutate through `actions.ts`, and must remain pending until a moderator review. Standards approval is not fact verification. Personal disclosures do not require proof. The Circle is not confidential or live; see `docs/CIRCLE.md` before implementing a public backend.
- Safety Kit state lives in its own localStorage key (`cocoon-kit-v1`), separate from the demo store, so demo reset never wipes a user's personal contacts.
- Optional welcome/referral concept state is separate (`cocoon-referral-demo-v1`, `referral-demo.ts`). These are capped sample joins and non-spendable demo credits, never real user counts or rewards. `/welcome` must remain skippable and must not imply authentication.
- Root entry completion uses the session-scoped `entry.ts` external-store hook shared by Home and AppShell; this keeps hydration consistent, hides entry navigation and leaves direct page URLs ungated.
- Emergency access requests one-time geolocation only on explicit user action. Cancel/close must ignore late results; coordinates stay in memory until the panel closes. Native dialler/share handoffs are not delivery or dispatch confirmation. See `docs/ENTRY-AND-EMERGENCY.md`.

- User prefs (user-confirmed country, units) live in `src/lib/cocoon/locale.ts` (`cocoon-prefs-v1`); country only selects the authority directory, never inferred — keeps emergency info scoped.
- External sharing (`share.ts`) is a user-initiated handoff logged separately from in-app notifications — Cocoon cannot observe external delivery.
- Automatic WhatsApp alerts live in `src/lib/notify/` (provider-agnostic outbox engine + Twilio adapter) behind a `NotifyRepo` interface; production storage is provided by `src/lib/production/notify-repo.ts`, with activation off until Twilio sender/templates and durable scheduling are verified — see `src/lib/production/PRODUCTION.md`. Never simulate sends.
- Hosted builds use the Cloudflare Nitro preset and retain the custom TanStack server entry, so deployment uses the supported runtime without replacing the source's error handling.
- Public auth build constants are explicitly defined by Vite from the public-only connection manifest; never inject private server variables. Missing/unreachable client auth must fail closed for private actions while preserving public demo usability.


- Private production actions live in `src/lib/production/`, never the demo adapter; verified bearer identity plus RLS keeps local role choices out of production authorization.
- SOS session and outbox intent commit through one database transaction; signed callback processing and worker claims remain durable so crashes cannot silently lose intents or blindly resend ambiguous acceptance.
- Production provider entry points enforce the shared immutable provider policy before outgoing traffic; environment credentials cannot override it, preventing accidental paid activation in this release.
- Gemini Live remains an explicit unavailable provider policy entry with no token or audio transport; the official unpaid-service data restrictions are incompatible with unrestricted safety conversations, so keys and consent cannot enable it.
- In-app SOS uses authenticated RPCs in `inapp.functions.ts`, separate from WhatsApp. Emergency drafts are owner-only; reviewed alerts copy immutable sender/recipient/content snapshots, never live draft references. Preferences never select new/revoked contacts. Retry keys follow exact payloads; account-keyed UI drops private edits/late results on identity changes. Retrieval/opening/ack are separate; polling runs only in the visible open inbox.
- Private journeys use authenticated `journey.functions.ts`/RPCs, not demo roles/storage. Separate guardian consent defaults off; withdrawal permanently retires old shares. Only active shared journeys are readable; inbox reopening requires fresh retrieval. Owner actions serialize and preserve private history.
