# Cocoon development handoff

Source snapshot: Lovable project `6ad7fc0c-f5e3-4a01-9f5c-ddd85f1fb729`, commit `8628e28383f47e31921635b913dbd435ea462b37`.
Exported text source files via the read-only connector on 16 October 2026; the binary placeholder favicon was omitted.

Local design revision: `JourneyScene.tsx` and `JourneyStory.tsx` introduce an original illustrated city, animated scarf, blinking, moving tram, sunset/night toggle, scroll parallax, and interactive Explore/Connect/Arrive chapters. Vermilion, parchment, ink and gold follow the reviewed Pinterest references. Animation pause controls and reduced-motion support are included. This revision has not been pushed or synced to Lovable. No Git remote is configured here; do not invent a remote or overwrite the hosted project.

## Credit preference

Use the user's SheBuild grant in Lovable first, then continue development directly in this repository without buying more Lovable credits. The grant has NOT been verified. The user answered “Not sure / not redeemed yet” when asked about redemption. The connector reports “Ruchi's Lovable” as Free and exposes neither credit balance nor grant identity. No new Lovable build prompts should be sent until this is clarified; read-only exports and local development can continue. Check workspace Settings → Plans & credit usage and the participant instructions. Never claim a particular grant is being charged without evidence.

## Current operational limits

Automatic WhatsApp notifications are NOT live. See `docs/whatsapp/SETUP.md`. Real auth, persistent storage, provider configuration, approved templates and server scheduling remain required. Optional natural voice is implemented but disabled until explicitly configured on localhost; see `LIVE-VOICE.md`. The default browser voice remains a labelled scripted demo. Preserve honest status labels.

Maps now support Photon worldwide search, coordinate input, endpoint swap, cached walking routes, alternatives, walking instructions, step focus, fit/expand/report toggles, tile retry and clear provider failures. Route geometry and instructions are retained for new trips. Journey progress remains simulated, not GPS. Public providers can be unavailable and need a production service strategy.

Safety improvements include per-tab roles, validated storage, role-checked mutations, sharing revocation, accurate simulated delivery outcomes, proportional ETA, deliberate SOS handling, global authority selection and a downloadable offline text safety card. Personal kit contacts remain separate from resettable demo records. No real notifications, emergency calls or paid voice sessions were sent during QA.

## Development

Local verification: 69 tests passed across 11 files; production build and TypeScript check passed. ESLint has 14 component-export Fast Refresh warnings and no errors. Browser QA covers map search/routes/directions, expanded map, mobile layout, story tabs, night/pause controls, companion typed replies and disabled live-voice setup, sharing revocation across tabs, guardian acknowledgment, responder acceptance/assistance, SOS resolution, arrival and Safety Card download. Calm mode supports Escape and restores focus. Dev preview: `http://127.0.0.1:8080/`. Production preview: `npm run build` then `npm run preview` on `http://127.0.0.1:8081/`; the broken upstream Vite preview was replaced with Nitro's actual Node entry. Production homepage returned 200 and voice status correctly returned unavailable. Screenshots live in `docs/previews/`.

`npm install --legacy-peer-deps` installs the exported app without auto-installing all optional peer integrations. Run `npm run dev`, `npm run build`, `npm run lint` and `npm test`. Never test WhatsApp or emergency calls by actually contacting someone.
