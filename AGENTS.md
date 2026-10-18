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
- Leaflet is loaded only via `MapView` (lazy + ClientOnly) because it touches `window` at import.
- Live geocoding/walking routes go through `src/lib/cocoon/geo.ts` (Photon + FOSSGIS OSRM foot), explicit-submit only with timeouts/throttle/cache; seeded paths are a labelled dashed fallback — public community endpoints, no keys. Never imply routes guarantee safety.
- Demo role and actor identities are sessionStorage per tab; shared records stay in localStorage. Persisted records are validated by `persistence.ts`.
- Circle posts/replies live in the demo store, mutate through `actions.ts`, and must remain pending until a moderator review. Standards approval is not fact verification. Personal disclosures do not require proof. The Circle is not confidential or live; see `docs/CIRCLE.md` before implementing a public backend.
- Safety Kit state lives in its own localStorage key (`cocoon-kit-v1`), separate from the demo store, so demo reset never wipes a user's personal contacts.
- Optional welcome/referral concept state is separate (`cocoon-referral-demo-v1`, `referral-demo.ts`). These are capped sample joins and non-spendable demo credits, never real user counts or rewards. `/welcome` must remain skippable and must not imply authentication.
- Root entry completion uses the session-scoped `entry.ts` external-store hook shared by Home and AppShell; this keeps hydration consistent, hides entry navigation and leaves direct page URLs ungated.
- Entry completion and custom doorway links disable native view transitions to avoid duplicate DOM-update waits; doorway navigation and dismissal have cancellable timer fallbacks so interrupted animations cannot trap navigation.
- RoomAtmosphere gates reduced-motion branching with useHydrated so SSR and initial client rendering agree before applying the user's preference.
- Emergency access requests one-time geolocation only on explicit user action. Cancel/close must ignore late results; coordinates stay in memory until the panel closes. Native dialler/share handoffs are not delivery or dispatch confirmation. See `docs/ENTRY-AND-EMERGENCY.md`.

- User prefs (user-confirmed country, units) live in `src/lib/cocoon/locale.ts` (`cocoon-prefs-v1`); country only selects the authority directory, never inferred — keeps emergency info scoped.
- External sharing (`share.ts`) is a user-initiated handoff logged separately from in-app notifications — Cocoon cannot observe external delivery.
- Automatic WhatsApp alerts live in `src/lib/notify/` (provider-agnostic outbox engine + Twilio adapter) behind a `NotifyRepo` interface; production storage is provided by `src/lib/production/notify-repo.ts`, with activation off until Twilio sender/templates and durable scheduling are verified — see `src/lib/production/PRODUCTION.md`. Never simulate sends.
- Hosted builds use the Cloudflare Nitro preset and retain the custom TanStack server entry, so deployment uses the supported runtime without replacing the source's error handling.
- Public auth build constants are explicitly defined by Vite from the public-only connection manifest; never inject private server variables. Missing/unreachable client auth must fail closed for private actions while preserving public demo usability.

- Presence primary call uses the Lovable AI Gateway Live relay (`src/lib/live/`, `/api/live` in `src/server.ts` + `live-vite-plugin.ts` for dev) with injected auth/quota deps; it needs no external provider account, and direct OpenAI voice stays policy-disabled. The scripted browser demo (`docs/PRESENCE-ROOM.md`) stays collapsed and labelled, never a fallback. See `docs/LIVE-VOICE.md`.
- Subdirectories may have their own `AGENTS.md` (e.g. `src/lib/production/`); read it before changing files there.
- Signed-out Presence calls use the same Live relay with an empty token: server-only `reserve_guest_voice` uses hashed trusted-IP and global caps; missing IP or unavailable pause controls fail closed, so shared credits stay bounded without fingerprinting.
- Components import `useReducedMotion` from `@/hooks/use-stable-reduced-motion` (false until hydrated), never directly from motion/react, so SSR and first client render match.
- Safety news merges several fixed publisher RSS feeds (`FEEDS` in `safety-news.ts`, max 6 per region for the outbound cap); partial success is success, never request-supplied URLs.
- Atlas pointer previews use cancellable dwell while keyboard selections are immediate; link hitboxes stay stationary and panorama exits serialize to prevent hover feedback loops and stacked landscapes.
