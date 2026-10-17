# Production voice and SOS

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

