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
- Journeys, progress, guardian updates and SOS are a **local demo** stored in this browser. Open another tab and select Guardian or Responder to explore the shared demo flows. Roles are independent per tab. No emergency dispatcher is contacted.
- The default companion uses scripted replies and browser speech. Optional natural AI voice has a server-side integration, disabled until configured. See [live voice setup](docs/LIVE-VOICE.md).
- Automatic WhatsApp sending is **not connected**. It requires authenticated persistent storage, a business sender, approved templates and a server scheduler. See [WhatsApp setup](docs/whatsapp/SETUP.md).
- Safety Kit contacts/checklists are stored separately from demo records. The downloaded text Safety Card works offline; the whole application does not.

## Design and handoff

The optional [welcome page, referral concept and emergency panel](docs/ENTRY-AND-EMERGENCY.md) add a skippable animated entry, bounded demo invitation credits, saved/chosen contact dialler links and explicit one-time location sharing. Balanced desktop columns keep shorter panels beside long reading content. Authentication, real rewards and automatic delivery remain unconnected.

Home now uses a [connected illustrated world](docs/WORLD-DESIGN.md): native scrolling moves the camera through four places, with doorway transitions into the route planner, Circle and Library. Existing home tools remain in a disclosure below the landscape.

The [Circle](docs/CIRCLE.md) is a local peer-support community prototype with topic-based discussion, support preferences, pre-publication post/reply review, reports, author hiding and revision feedback. Real accounts, privacy controls and staffed moderation are required before it can become a live community.

The [Safety Library](docs/SAFETY-LIBRARY.md) adds consent/body-safety education, preparation and support guides, practice situations, dated LPU reporting context and opt-in current news with Global/India coverage.

The [support desk and connected rooms](docs/SUPPORT-DESK.md) add audience-based reading trails, source-linked digital/bystander/support guides, optional regional supply searches, report context filters and approximate map areas. Presence includes a support entry, saved personal contact links, deliberate note sharing and optional bounded local audio/video/photos with battery preferences. Capture lifecycle is mock-tested; real hardware and native sharing require user-driven testing. Automatic external delivery and production natural voice remain unconnected services.

Original SVG city/character artwork, motion chapters, sunset/night mode, pause controls, reduced-motion support and an arrival stamp follow the reviewed red/ivory/ink reference direction. See [motion notes](docs/MOTION-DIRECTION.md) and [development handoff](docs/DEVELOPMENT-HANDOFF.md).

Local changes have not been synced to Lovable. No Git remote is configured. The SheBuild credit grant remains unverified; no credit-consuming Lovable prompts were used for these local changes.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS


See the [explore and connect refresh](docs/EXPLORE-AND-CONNECT.md) for the visible kit gallery, guided learning, headline reader and Circle conversation design.
