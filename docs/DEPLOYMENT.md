# Deployment record

Published 17 October 2026: https://coco-safe-routes.lovable.app

- Source repository: https://github.com/Ruchi2117/Cocoon
- Imported source snapshot: 8f3728c99f810a893b70972708fc7fe99b402da0
- Lovable project: 6ad7fc0c-f5e3-4a01-9f5c-ddd85f1fb729
- Hosted source commit: d6412c1d88be7d5c4a7a5876e0b155042bcd5f8c
- Deployment ID: 08949829-2eb7-4fd2-a9c1-0b7aef7c833f

The complete 277-file archive was imported through Lovable. Hosting changed to the supported Cloudflare Nitro preset while retaining src/server.ts. Missing page sharing metadata was completed. Application components, libraries, assets and styles were preserved. This does not establish ongoing automatic GitHub synchronization; future local updates must be synced before republishing.

Validation: Lovable reported automatic build success, 129 tests passing across 22 files, 12 browser routes working without page errors, and lint passing when original line endings were allowed (14 warnings). Standalone hosted typechecking was not run; local TypeScript validation passed before import. After publication, independent HTTPS checks returned 200 for /, /welcome, /explore, /trip, /presence, /circle, /learn, /reports and /kit. The live browser rendered the current home and Presence pages. GET /api/companion/voice returned available:false.

This publishes the labelled demo. It does not activate provider voice, automatic messages, emergency dispatch, real accounts, a database or authenticated nearby responders. No actual mic, camera, GPS or outgoing alerts were activated during verification. The SheBuild grant/balance was not verified.


## In-app guardian release - 17 October 2026

Published Lovable source: `010c0b1b9ee2c5a770b4c6b96fd0a602a21ba894`; deployment `fd0e5708-6b2c-4a15-8cdd-02e79bae1eda`.

Cloud was enabled after the user authorized connecting voice/SOS. The workspace reports the Free plan. No paid plan, provider account, payment method, provider call or outgoing message was enabled. Cloud remains subject to the workspace's usage limits; no claim of unlimited free hosting is made.

The release adds real authenticated, phone-free in-app guardian enrollment and a private SOS inbox. Guardian consent is bound to a verified account email and expiring token. SOS note/location sharing is explicit; location must be fresh. Guardians must keep their signed-in inbox open. Retrieval, explicit opening and acknowledgement are separate recorded states. No background push, SMS, WhatsApp, nearby dispatch or authority dispatch is provided. Paid providers are locked off in code. Gemini unpaid service was rejected for this sensitive-data/under-18 use case after reviewing its official terms.

A published-only hydration failure was caught after the initial backend deployment: browser Supabase configuration was absent despite successful HTTP responses. The fixed release explicitly embeds only the public URL and publishable key at build time. No service-role credential is exposed. The account screen was independently verified after hydration on the live HTTPS site, desktop and 390px mobile; it displays Google/Lovable sign-in without crashing or horizontal overflow. The live voice status reports disabled. No OAuth flow or real account was initiated during verification.

Hosted source reports 198 passing tests plus automatic build checks. These include synthetic PostgreSQL RLS/atomicity/consent tests and mocked authenticated inbox component tests. Real hosted two-user sign-in, invitation, SOS and acknowledgement verification remains pending and must be done deliberately by the account owners. No guarantees of emergency response or real-world delivery are implied. The private account entry is https://coco-safe-routes.lovable.app/account .

The local copy retains the Node build preset; Lovable uses Cloudflare. Runtime public auth constants are pinned in `src/lib/production/public-auth-config.json`. Local production server handlers still require their documented server environment; use the published site for the configured account flow. Ongoing GitHub-to-Lovable automatic sync has not been established.


## Entry-first launch

Lovable source `aaffc41bc70497871daeb55a8211ebba246fb88c` adds the session-scoped entry flow from GitHub `4ad6b57`. Publication requested with deployment `a3f3fe6a-21f4-40c3-bb0e-661a0f4ee03d`. The main address shows the full-screen welcome before the world; Enter and Skip remember the choice in the current tab. Direct routes remain direct and /welcome can replay the scene. Local TypeScript, lint, build and four focused tests passed; local browser verified entry, Enter, Skip and refresh. Auth public configuration and provider cost locks were preserved.

Live browser verification completed: fresh root rendered the entry after hydration without app navigation; Skip revealed the world. Preview saved at docs/previews/entry-first-live.jpg.

## Private journey functionality release

Published source `063d8e595460b434e2d433d1a965a2ff5b60543a`, deployment `f9958708-a233-49c8-b5e9-ee752ce4261a`, GitHub implementation `9c999d5`. Adds authenticated journeys, separate guardian journey consent, explicit Routes review, manual check-ins, arrival/cancellation/stop-sharing and private history. See PRIVATE-JOURNEYS.md for boundaries. Paid providers remain disabled.

Independent local validation: TypeScript and production build passed; 228 tests across 37 files passed with two workers. An overloaded concurrent run had two UI wait timeouts; the focused four guardian tests and subsequent complete suite passed. Targeted application lint passed; generated Supabase types retain generator formatting. Public live Journey hydrated successfully, its sign-in link reached Account with enabled sign-in controls, and the 390px Account view had no horizontal overflow. No OAuth, real account, location or outgoing alert was used. Hosted two-account end-to-end verification remains pending. Screenshot: previews/private-journey-live.jpg.

Lovable reported 407.40 credits remaining after this pass; its 107.60 usage figure was cumulative project usage, not this pass's cost. No billing or paid provider changes were made.

## SOS draft and content review release

Published source `258d1a4305adde375253301ec737b4f3aa68d864`, deployment `1cc3c724-6185-42b2-8d03-e2d609bf8250`, implementation GitHub `7515ff0`. Migration 0009 adds private emergency drafts and immutable reviewed alert snapshots. Details: SOS-REVIEW.md. Independent local checks passed: 255 tests/39 files with two workers, TypeScript, production build and targeted application lint. Live Account hydrated with enabled sign-in controls, no console errors and no 390px overflow; Presence showed the new reviewed-content disclosure. No OAuth, real SOS, device permissions or provider traffic was initiated. Hosted signed-in two-account verification remains pending. Screenshot: previews/sos-review-live.jpg. Lovable reports 397 credits remaining; no billing changes.

## Presence listening room release

Published source `c76a296a9b3215a3b2fec7bf948005058b67153b`, deployment `bb46ea6c-0fba-4684-8a40-7e5806df966d`, implementation GitHub `a068533`. The new native animated room and one-turn browser speech controller replace the former call loop. Guided scripted text, explicit listening/interruption/repeat, ephemeral sessions, deterministic cleanup and separate manual recording are documented in PRESENCE-ROOM.md. Natural AI voice remains disabled under the zero-payment policy.

Independent local verification: 287 tests across 42 files, TypeScript, targeted lint and production build passed. Browser verified text next-step guidance, End summary, SOS opening/closing, scene rendering and 390px layout without horizontal overflow. Published room hydrated and Begin text session produced its guided reply with no console errors. No microphone/audio/camera/GPS/OAuth or real messages were used; audible device behaviour remains unverified. Preview: previews/presence-room-live.jpg. Lovable reports this pass cost 14.5 credits, with 382.30 remaining. No billing/provider-policy changes.

## Judge-readiness release — 18 October 2026

Preserved the user's latest design and guest live-call feature. Published source `bd3b1d77926570e9579156b6583629111738167d`; deployment `f46f318a-d29e-4ae2-a0fa-e93db353b052`; implementation GitHub `a1bbed1`. Native Lovable GPT-Live uses existing workspace credits, separate from the still-disabled direct provider accounts. Guest calls have trusted-network quotas, global caps and a two-minute limit; service-control lookup fails closed. Fixed navigation timeout/cleanup and stale Kit/Reports disclosures; hydration-gated RoomAtmosphere preserves artwork.

Local readiness suite: 355 tests/50 files passed before final copy/hydration patch; final TypeScript, production build and 16 targeted tests passed. Published fresh root → Skip → illustrated companion link → Presence completed with no error logs; current guest limits and corrected Kit copy were read back. Earlier live audit completed sample route start/check-in/arrival, Circle search, learning guide progression and report navigation. Reports fit 390px; live news returned an unavailable/retry state. No real audio, OAuth, SOS, location, recording or external messages tested. Real call quality and authenticated two-user readback remain unverified; Reports reduced-motion warnings remain known. Preview: previews/judge-ready-call.jpg.

Submission instructions are in SUBMISSION-DRAFT.md and JUDGE-TESTING.md. No submission was made and the private participant-hub token was not stored or forwarded. Stop changing the submitted project once the user confirms submission.

## Reports news and motion repair — user-requested follow-up

Published source `76435165b444d7c95867f85bbc8cf60862542062`, deployment `3165c733-c994-4af4-baf0-8f71943bc80b`, GitHub implementation `185e573`. Independent local verification: 369 tests/54 files, TypeScript, targeted lint and production build passed. Fixed source fallbacks and shared hydration-safe motion preference without redesigning the app. Production API readback returned 8 Global and 8 India headlines with unavailable=false; browser displayed publisher-linked cards and no error/warning logs. Reduced-motion SSR/client and pagination covered by hydration tests and Lovable desktop/mobile checks. Future upstream outages remain possible.

During read-only follow-up, the participant hub reported Submitted. The submission was performed separately by the user, not this agent. No submitted fields or confirmations were changed. Earlier news-unavailable/Reports-warning descriptions are superseded by this verification; actual live voice and private two-user verification remain untested.

## User-reported layout and call-start repair

Published source `0b6bf645d619b7b48f52f9c304d6842eeeb4793f`, deployment `a867c51e-ef59-4f21-839c-32695a6f29eb`, GitHub `40b6cba`. RightsDesk now assigns name/context/icon separate grid areas; all seven name/context pairs were independently checked not overlapping on local desktop/mobile and on published desktop. Mobile has no horizontal overflow. Scroll padding/focus gutters account for Presence sticky layers.

Actual call error traced to absent live-voice control row; Lovable seeded it and migration 0011 now persists initialization without overwriting an owner pause. Read-only hosted query confirmed row and service permissions. A single synthetic fake-audio call reached gateway session.created/SDP/session.started/remote track, then failed media connection because sandbox browsers produced zero ICE candidates; session.closed reported 15 billed seconds and its slot was released. No user microphone or personal context used. Added 10-second ICE gathering and pre-gateway rejection of empty-candidate offers. This prevents known futile paid starts but does not prove real-browser audio, greeting, barge-in or End work. Those remain unverified.

Lovable reports 373 passing full-suite tests. Local TypeScript/build/targeted lint and 29 call/relay/SQL regressions passed. Local full-suite attempt hit native memory exhaustion and was stopped; it is not counted as passing. No submitted-form changes made.

## Backend reliability — 19 October 2026

Published Lovable source `b88560dfe2797a9f89e5b967c08c54ccb7d3d16d`, deployment `ccb7336c-6f6f-47f0-895b-68f95acb0109`. One 40-second startup deadline now covers identity checks, guest hashing, quota reservations and gateway startup. Cancellation aborts connection setup; late slots release once, late connectors close, and late startup events cannot restart a closing call. Dependency promises that do not support abort may finish later; cleanup handles their late results.

News total-source failures now have a 60-second cooldown per region and runtime instance. Concurrent requests still share work; recovery clears the cooldown. Last-good timestamps stay unchanged and stale results expire at 24 hours, including during cooldown. This is in-memory protection, not a distributed rate limit or durable cache.

Independent local verification: 49 targeted relay/news tests and 19 provider-policy/private-schema tests passed; TypeScript, changed-file lint and production build passed. Build retains existing TanStack inputValidator and Vite plugin deprecation warnings. Hosted public Global news returned 9 items with stale=false and unavailable=false. No microphone, real provider call, OAuth, private account or SOS used; audible voice and authenticated two-account SOS remain unverified. UI and provider/payment locks preserved. Lovable reported 3.5 credits for this patch.

## Private request reliability — 20 October 2026

Lovable source `e721978d54c35c6c752ae45098ced50032174eaa`; publication requested with deployment `ba3e18b1-331f-438d-93b2-049d2b2087b7`. Private database reads/RPCs in inapp.functions.ts and journey.functions.ts now use a 12-second deadline with a Supabase AbortSignal. The deadline settles callers even when an underlying promise ignores cancellation; late rejections are handled and timers cleared. Each operation runs once with no automatic mutation retry. This deadline covers database operations after authentication, not the generated authentication middleware.

Mutation failures now explain that confirmation is unavailable and a change may already have committed. SOS/journey request keys and exact payloads are preserved; users are guided to check status and retain the same unchanged request for a retry. Abort does not prove database rollback. Concurrent account/draft reads fail closed; database errors and invitation tokens are not returned on failure. No schema, auth/RLS, provider/payment-policy or layout changes.

Independent local validation: 59 targeted tests across six files passed, including real isolated PostgreSQL access/consent/snapshot/journey tests and mocked deadline/server-function tests. TypeScript, targeted lint and production build passed with existing deprecation warnings. Lovable separately reported 130 related tests passing and 5.1 credits spent. Published signed-out direct-provider status still returns signedIn=false/available=false. No hosted private writes, real accounts, OAuth, audio or notifications were used; authenticated two-user end-to-end verification remains pending.

## UI responsiveness and hydration — 20 October 2026

Published Lovable source `2e7121b9f69d47f7a085b6756254ffb72ec84893`, deployment `23bf2e96-049f-4d6c-a474-dcb97c96465b`. Flashlight pointer input now has one listener and at most one SVG coordinate calculation per frame; call-character pointer input is coalesced and gated by visibility, intersection and reduced-motion preference. Queued frames/listeners clean up on unmount. This reduces redundant work but is not a measured device frame-rate guarantee. The existing artwork and atlas layout remain intact.

Independently reproduced React #418 text hydration error on published Circle. Fixed demo server snapshots use a deterministic epoch while hydrated client data remains fresh/persisted. LocalDate renders a fixed initial locale/timezone, then the reader's own format. No suppressHydrationWarning workaround remains in Circle. News dates share the same component. Local hydration regression changes the clock and browser date formatting between server render and hydration.

Independent local verification: 25 focused tests across seven files, TypeScript and production build pass. Changed-file lint has no errors and one LocalDate fast-refresh export warning; existing Circle formatting errors were corrected locally. Lovable reported page-load audits of 10 routes at desktop/mobile sizes with normal/reduced motion. Its initial audit reported one pixel of mobile Routes decorative overflow; independent 390px check showed no horizontal page overflow. This does not establish every animation phase or real-device GPU performance.

Independent published interaction checks: Circle search, desktop atlas open/Escape/close, mobile atlas navigation to Reports, settled next-report pagination, mobile learning-guide progression, emergency-panel open/close with scrolling restored, and mobile Call/Learn/Circle fit. Fresh published Circle has no error/warning console logs after hydration, persisted dates appear, search still filters, atlas closes and mobile content fits. No real audio, GPS, OAuth or notifications tested. Touch swipe gestures and exhaustive interaction sequences across all pages remain unverified. Screenshot: `C:/Users/Lenovo/AppData/Local/Temp/cocoon-ui-polish.jpg`.
