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
