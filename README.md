# Cocoon

An illustrated travel companion with walking routes, guardian check-ins, a voice interface and a practical Safety Kit. Originally built with [Lovable](https://lovable.dev), then exported for local development.

## Run locally

Use Node.js and npm. On Windows, use `npm.cmd` if PowerShell blocks npm scripts.

```sh
npm install --legacy-peer-deps
npm run dev -- --host 127.0.0.1 --port 8080
```

Checks: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

After building, `npm run preview` serves the Node production build at `http://127.0.0.1:8081/`. Override `NITRO_PORT` if needed. Lovable uses its own hosted build preset.

## What is connected

- Worldwide place search: Photon. Walking routes and directions: FOSSGIS OSRM foot. Map tiles: OpenStreetMap. These public services require a network connection and have no availability guarantee. Typed coordinates work without geocoding.
- Journeys, progress and the labelled demo SOS remain browser-local. A separate authenticated **in-app guardian SOS** channel uses private Cloud records and phone-free, recipient-confirmed enrollment. Guardians must sign in and keep the inbox open; retrieval, opening and acknowledgement are distinct. No background/push, authority or nearby dispatch is provided.
- The default companion uses scripted replies and browser speech. Natural AI voice is locked off by the current zero-payment policy, even if provider credentials exist. Authenticated server wiring and quotas are retained for review. Free Gemini is unsuitable for this sensitive-data use case. See [production status](src/lib/production/PRODUCTION.md).
- Automatic WhatsApp is **disabled by the zero-payment policy**. Durable queue wiring exists, but provider account/sender/templates and scheduling remain unavailable. No payments, new provider accounts or real alerts were created during development. The independent in-app inbox does not use WhatsApp.
- Safety Kit contacts/checklists are stored separately from demo records. The downloaded text Safety Card works offline; the whole application does not.

## Design and handoff

The optional [welcome page, referral concept and emergency panel](docs/ENTRY-AND-EMERGENCY.md) add a skippable animated entry, bounded demo invitation credits, saved/chosen contact dialler links and explicit one-time location sharing. Balanced desktop columns keep shorter panels beside long reading content. Authentication, real rewards and automatic delivery remain unconnected.

Home now uses a [connected illustrated world](docs/WORLD-DESIGN.md): native scrolling moves the camera through four places, with doorway transitions into the route planner, Circle and Library. Existing home tools remain in a disclosure below the landscape.

The [Circle](docs/CIRCLE.md) is a local peer-support community prototype with topic-based discussion, support preferences, pre-publication post/reply review, reports, author hiding and revision feedback. Real accounts, privacy controls and staffed moderation are required before it can become a live community.

The [Safety Library](docs/SAFETY-LIBRARY.md) adds consent/body-safety education, preparation and support guides, practice situations, dated LPU reporting context and opt-in current news with Global/India coverage.

The [support desk and connected rooms](docs/SUPPORT-DESK.md) add audience-based reading trails, source-linked digital/bystander/support guides, optional regional supply searches, report context filters and approximate map areas. Presence includes a support entry, saved personal contact links, deliberate note sharing and optional bounded local audio/video/photos with battery preferences. Capture lifecycle is mock-tested; real hardware and native sharing require user-driven testing. Automatic external delivery and production natural voice remain unconnected services.

Original SVG city/character artwork, motion chapters, sunset/night mode, pause controls, reduced-motion support and an arrival stamp follow the reviewed red/ivory/ink reference direction. See [motion notes](docs/MOTION-DIRECTION.md) and [development handoff](docs/DEVELOPMENT-HANDOFF.md).

Live demo: [coco-safe-routes.lovable.app](https://coco-safe-routes.lovable.app). Source: [Ruchi2117/Cocoon](https://github.com/Ruchi2117/Cocoon). The local snapshot was imported into Lovable and published on 17 October 2026. Local builds use Node; the hosted copy uses Cloudflare. This was a source snapshot import, not a verified ongoing GitHub-to-Lovable sync. The SheBuild credit grant remains unverified. See [deployment record](docs/DEPLOYMENT.md).

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS


See the [explore and connect refresh](docs/EXPLORE-AND-CONNECT.md) for the visible kit gallery, guided learning, headline reader and Circle conversation design.
