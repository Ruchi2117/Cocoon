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
- Routing, companion conversation and speech use provider abstractions. The default companion remains scripted/browser speech. Optional Realtime voice is a localhost-only opt-in (`docs/LIVE-VOICE.md`); production requires authentication and usage controls. Every simulated behaviour must stay labelled.
- Leaflet is loaded only via `MapView` (lazy + ClientOnly) because it touches `window` at import.
- Live geocoding/walking routes go through `src/lib/cocoon/geo.ts` (Photon + FOSSGIS OSRM foot), explicit-submit only with timeouts/throttle/cache; seeded paths are a labelled dashed fallback — public community endpoints, no keys. Never imply routes guarantee safety.
- Demo role and actor identities are sessionStorage per tab; shared records stay in localStorage. Persisted records are validated by `persistence.ts`.
- Circle posts/replies live in the demo store, mutate through `actions.ts`, and must remain pending until a moderator review. Standards approval is not fact verification. Personal disclosures do not require proof. The Circle is not confidential or live; see `docs/CIRCLE.md` before implementing a public backend.
- Safety Kit state lives in its own localStorage key (`cocoon-kit-v1`), separate from the demo store, so demo reset never wipes a user's personal contacts.
- Optional welcome/referral concept state is separate (`cocoon-referral-demo-v1`, `referral-demo.ts`). These are capped sample joins and non-spendable demo credits, never real user counts or rewards. `/welcome` must remain skippable and must not imply authentication.
- Emergency access requests one-time geolocation only on explicit user action. Cancel/close must ignore late results; coordinates stay in memory until the panel closes. Native dialler/share handoffs are not delivery or dispatch confirmation. See `docs/ENTRY-AND-EMERGENCY.md`.

- User prefs (user-confirmed country, units) live in `src/lib/cocoon/locale.ts` (`cocoon-prefs-v1`); country only selects the authority directory, never inferred — keeps emergency info scoped.
- External sharing (`share.ts`) is a user-initiated handoff logged separately from in-app notifications — Cocoon cannot observe external delivery.
- Automatic WhatsApp alerts live in `src/lib/notify/` (provider-agnostic outbox engine + Twilio adapter) behind a `NotifyRepo` interface; not live until Cloud storage, Twilio sender/templates and cron exist — see docs/whatsapp/SETUP.md. Never simulate sends.

