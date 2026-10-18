# Production voice and SOS

## Atlas hover stability
- [x] Keep hitboxes stationary; entrance transform and hover translate act on inner content separately. Cancellable 120ms pointer dwell, immediate focus, serialized panorama exits; four-per-side design unchanged.
- [x] 16 focused tests and targeted lint pass; automatic build OK. Browser checks at 1280×1800 and 390×844 in normal/reduced motion confirm stationary edges, rapid hovering (one landscape maximum), keyboard focus, scene cancellation, close/reopen and Learn navigation; actual mobile touch taps also pass. No page errors. Separate typecheck unavailable because manual typechecks are prohibited. No publishing or unrelated feature changes.

## Submission-readiness audit (design frozen)
- [x] Final readiness patch: exact Kit/Reports disclosures and hydration-gated RoomAtmosphere; 28 relevant tests pass, targeted lint passes with preserved line endings, automatic build OK. Browser confirms RoomAtmosphere mismatch gone and reduced preference applied; unrelated reduced-motion Reports warnings remain outside requested scope. Separate typecheck evidence unavailable. No calls, publishing or submission.
- [x] Fail closed on guest pause lookup; correct IP-based and role-specific quota disclosures.
- [x] Repair root-to-Presence transition settling without changing visual design; timer fallback, duplicate-request guard, hung/stale cleanup and reduced-motion coverage.
- [x] Add synthetic rollback guest SQL and relay lifecycle regressions; 355 tests across 50 files pass; targeted lint has 0 errors (1 existing fast-refresh warning); automatic compilation reports build OK.
- [x] Add docs/JUDGE-TESTING.md; report revision, verification limits and credits. No publishing or submission; real audio and real-account flows remain deliberately untested.
- Verification boundary: fresh desktop/mobile entry → Presence and opening the labelled script pass with no navigation errors or overflow; reduced-motion navigation also settles but logs an existing RoomAtmosphere hydration warning. No voice socket or permission was requested. Automatic build reports OK; a separate typecheck result is not exposed, and manual builds/typechecks are prohibited by the environment.

- [x] Upgrade Presence browser/text lifecycle, guided scripts and immersive state-reactive night room; preserve private workflows, manual recording/share and paid locks. Text-first, explicit one-turn mic, interruption/repeat, voices/rate and ephemeral summary are implemented without private reads or automatic actions.
- [x] Verify permission/unsupported/late events/interruption/hidden lifecycle: 287 tests across 42 files pass (32 new Presence cases), changed application lint and automatic typecheck/build pass. Desktop 1280×1800/mobile 390×844/reduced-motion text → guidance → Journey → summary, SOS review and manual recorder choices pass without page errors/overflow/OAuth/provider requests. Documentation: docs/PRESENCE-ROOM.md; natural AI and real-device verification remain intentionally unavailable, no publishing.

- [x] Add owner-private emergency drafts/preferences, immutable explicitly reviewed SOS snapshots and per-recipient exact history. Migration 0009 applied; hosted read-only policies confirmed. Paid locks/public auth configuration unchanged.
- [x] Verify SOS identical/changed retry, cancellation/account switching, consent/ownership/atomicity and guardian rendering. 255 tests across 39 files pass, including 11 new rollback PostgreSQL cases; changed application lint and automatic build/type checks pass. Desktop/mobile public entry/Account/SOS/Journey hydration has zero page errors/provider/OAuth traffic. See docs/SOS-REVIEW.md.
- [ ] Hosted signed-in SOS readback — blocked by explicit no-real-accounts/no-real-SOS-testing constraint. Synthetic PostgreSQL and mocked signed-in send/retrieve/open/ack flows verified instead; no publication.

- [x] Add verified private journeys, separate guardian consent, atomic lifecycle/check-ins and private RLS/idempotency/freshness limits. Migrations 0007/0008 applied; consent withdrawal permanently retires old shares. Demo and paid gates stay separate.
- [x] Integrate Routes review, Journey owner history and visible open-inbox guardian view; correct companion/emergency claims. All 228 tests pass (37 files); changed-file lint and automatic build/type checks pass. Desktop/mobile normal/reduced-motion public hydration checks pass without provider/OAuth calls or permissions. See docs/PRIVATE-JOURNEYS.md.
- [ ] Hosted signed-in journey readback/concurrency — blocked by prohibition on real-account testing and unavailable privileged hosted rollback/multi-connection test tools. Synthetic PostgreSQL and mocked signed-in flows verified instead.

- [x] Import six-file entry sync; four focused tests and automatic build pass. Desktop/mobile standard-motion checks verify fresh-tab root without navigation, Enter/Skip, same-tab refresh, standalone welcome and direct Presence; zero page errors/provider requests. Public auth config and Cloudflare preset unchanged. Retained existing required welcome metadata (only source-sync exception); archive CRLF preserved, lint passes with endOfLine:auto. Existing out-of-scope FlashlightThreshold reduced-motion hydration warning observed; scene still renders, no redesign or unrelated edit.

- [x] Fix public build configuration via Vite define from a public-only canonical Cloud connection manifest (no generated clients/private keys changed). Production config evaluation confirms both public constants even without sandbox VITE env. Auth absent/offline/hung fallback and voice close/error regressions pass; full suite 198 tests, automatic build/type checks OK. Signed-out hydration/hard refresh and offline checks pass with zero errors or OAuth/provider actions; read-only hosted auth settings HTTP200 confirms Google enabled. Published bundle verification awaits user republish; no accounts/media/SOS/billing changes or publishing.

- [x] Add separate phone-free, token-bound in-app guardian consent and atomic private SOS alerts with recipient-only retrieval/open/ack receipts; migration 0006 applied without accounts or personal data.
- [x] Wire real SOS confirmation and guardian inbox with open-page-only refresh/30-second visibility-aware polling; preserve demo/design and immutable disabled paid providers.
- [x] All 191 tests pass (including 14 synthetic in-app PostgreSQL rollback tests, 4 schema and 4 synthetic authenticated UI tests); changed-file lint and automatic build/type checks pass. Desktop/mobile signed-out disclosures verified with no provider requests or page errors. Hosted real-account flow remains unverified under no-real-accounts constraint.

- [x] Research official Gemini Live free-tier terms/auth/audio schemas; documented unpaid personal/sensitive-data, age and regional blockers; kept provider explicitly unavailable instead of adding an ineligible adapter. All 169 tests pass; desktop/mobile checks confirm disabled audio/call controls, visible privacy notice and zero provider requests. Automatic compilation and changed-file lint pass.

- [x] Persist exact reviewed qualified outbox recipient policy; confirm hosted expression and pass six rollback-based synthetic PostgreSQL RLS assertions, with zero-payment lock unchanged.
- [ ] Repeat synthetic rollback assertions against hosted database — blocked: available hosted query tools do not support privileged rollback transactions; no persistent test users/fixtures created.

- [x] Enforce zero-payment provider lock, preserve private wiring/demo, and remove active paid-setup requests.
- [ ] Verify authenticated account readback — blocked: no existing signed-in user; no real SOS/media tests authorized.

- [x] Create private profiles, token-bound guardian consent, preferences, emergency sessions and durable queue schema with RLS.
- [x] Add production sign-in/session controls without changing existing art or demo mode.
- [x] Wire authenticated SOS and atomic intent/outbox, worker leases and signed persistent callbacks.
- [x] Secure OpenAI WebRTC with authentication, consent, durable quotas and call-ID cleanup; activation off.
- [x] Run mocked/isolated PostgreSQL ownership tests and no-media/no-send public UI checks.
- [ ] Authenticated browser flow — blocked: no existing auth users; user must sign in with Google/Lovable.
- [ ] Live provider setup — intentionally blocked by zero-payment constraint; no external accounts or credential requests.
- [ ] Closed-tab dispatch and server voice termination — blocked by disabled providers and unavailable verified durable scheduling.
- [ ] Provider delivery and audible verification — intentionally blocked; no real sends/calls/media tests authorized.
- [x] Document exact prerequisites in src/lib/production/PRODUCTION.md; no publishing or paid provisioning.

- [x] Fix Presence call button (clickable start, laptop-fit layout)
- [ ] Future: call gathers info and sends to guardians (needs consent design)
- [x] Together: two-way timed location sharing (demo on Journey)
- [x] Circle: fix left padding on text
- [x] Circle: demo content per community room (body, boundaries, campus, feelings)
- [x] Post animation: red splash when posting (Circle + Reports)
