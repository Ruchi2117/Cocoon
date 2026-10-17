# Support desk and connected rooms · 17 October 2026

Presence now has a one-tap support entry, personal contact links from the separate Safety Kit store, a deliberately entered note/landmark, and native share-sheet handoffs. The share sheet does not preselect a saved person and receipt cannot be observed. No recording, sharing or message is performed just by opening the page.

## Local captures

Explicit start requests microphone access, plus camera access for video. The separate recorder does not capture the companion's output or let the model inspect recordings. Audio caps at 180 seconds; video at 45 seconds; oversized clips over 12 MB are discarded. Video exposes a live preview and optional photos every 30 seconds. A photo slot is reserved for finalising the recording. Up to four files stay in page memory; no upload or persistent file storage occurs. Download or a separate native file-sharing action is required to retain/share them. Reload/navigation loses unsaved files.

Power-saving defaults to audio below 20% battery when not charging and stops capture at 10% or below. Battery API availability and readings vary; unknown readings retain the short caps. Backgrounding, ending support, switching voice modes, closing capture choices, revoking tracks or leaving the page stops capture. An unresolved permission request is invalidated; any late stream is stopped. Real device/permission, background lifecycle and native sharing tests remain user-driven; development used mock streams/recorders and did not access microphone/camera or send files.

## Service boundaries

Browser voice remains scripted. The optional localhost Realtime connection has a concise support prompt, turn-taking and explicit AI identity; provider configuration and real voice-quality testing remain required. See [LIVE-VOICE.md](./LIVE-VOICE.md). It has no action tools, environmental awareness, recording access or emergency dispatch.

Automatic contact messaging is still an unconnected backend integration, not a successful-send simulation. See [WhatsApp setup](./whatsapp/SETUP.md). Connecting production storage, authenticated recipients/consent, provider templates, delivery status and scheduling is necessary before claiming automatic delivery. No alerts go to nearby strangers.

## Education, kit and maps

The library adds adult, child-with-safe-adult and supporter reading trails, with consent, child body safety, digital coercion, bystander options and first-line support principles. Source links and country-specific scope are visible; professional/legal advice is not implied. Existing live news remains opt-in, publisher-attributed and separate from route reports. Personal disclosures do not require proof to receive support.

The packing bench offers optional category search links for Amazon US/India/UK, without affiliate tags, product testing, prices or stock claims. Existing personal contacts/checklists remain in `cocoon-kit-v1`.

Map report filters combine date/type/review status, exclude hidden reports and round public coordinates. Optional 100 m rings are illustrations, not incident boundaries, risk zones or a route safety rating. Demo pins remain fictional. Linked external sources are escaped and HTTPS-only in popups. Route viewport fitting now compares full geometry, not only vertex count. Leaflet stacking is contained beneath navigation. Real walking routes and provider instructions were visible in browser QA; the public providers have no availability guarantee.

Shared room backgrounds use layered pigment, landscape contours and library architecture, with slow reduced-motion-aware movement. The home world's persistent original character and embedded route/Circle/library entrances are retained.

Presence visual refresh: a lantern-moth SVG companion appears in both browser and optional natural-voice panels. Wings, eyes, mouth and ripples derive from the actual CallPhase; motion pauses offscreen, under reduced motion, or via Rest the wings. The browser demo still uses its existing scripted/device-speech provider and natural voice still needs configuration. The primary call surface now precedes the support workspace visually. Initial transcript mounting no longer scrolls past the page entrance. No mic/camera/location access or actual calls were triggered during layout QA.
