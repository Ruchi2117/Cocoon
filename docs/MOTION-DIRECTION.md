# Cocoon motion direction

Latest direction: Home is now a connected scroll-driven world, not the earlier sequence of separate character/story sections. See `WORLD-DESIGN.md`. The girl/city hero and character moments remain in Learn; the homepage camera travels continuously through city, riverside, courtyard and night library, with animated doorway navigation into working features.

## Open Pinterest references reviewed in the signed-in browser

The user explicitly asked to examine both open pins and their complete animation/color direction. Reviewed playback and timeline frames in the existing tabs, without downloading or copying media:

- `https://in.pinterest.com/pin/689332286738175054/`: approximately 4.6-second illustrated “Retreat” scene, with an angular cabin, dark tree silhouettes, glowing windows, a small campfire and sunset landscape. Warm golden yellow, burnt orange, coral/red and burgundy with near-black foregrounds. Takeaway: a complete illustrated environment with depth and small living details, rather than a decorative icon hovering above cards.
- `https://in.pinterest.com/pin/359091770308647842/`: approximately 40.7-second “Unifiers of Japan” walkthrough. Reviewed the opening character scene, cream/red editorial sections, expandable historical rows and images, paired character portraits, three-panel character navigation, and the next character page. Character eyes/expressions change; the page uses oversized condensed type, fine borders, crest motifs and broad red/cream panel changes. Palette: saturated vermilion/crimson, warm parchment ivory, ink-black and subtle pink gradients. The timing and staged composition changes are more relevant than copying the historical subject matter.

User preference is actual animated artwork and scene choreography, not simply card entrance effects. Primary visual direction should borrow the warm illustrated world/depth from Retreat and the disciplined red/ivory/ink palette plus typography/character articulation from Unifiers. The previously supplied dark reaching-hands reference remains a secondary human-connection cue, not a reason to make the entire product monochrome. Treat the local silk-wing scene as a prototype, not the final approved answer. Keep the practical map, call and emergency flows accessible and immediate.

User reference update, 16 October 2026: the attached dark editorial concept with reaching hands adds human connection, soft volumetric lighting, grain and generous negative space to the earlier bold typographic references. The latest short link resolves to Pinterest's “Scroll experience from Pyramids of Meroë | Pexelflow”; its video could not be evaluated because Pinterest presented a sign-in modal. Do not claim its exact animation was inspected.

## Creative direction

Current direction follows the user's approved red editorial revision: saturated vermilion, parchment ivory, ink and sunset gold. The butterfly and monochrome sculptural concept were superseded after the user asked for the reference aesthetic directly in the product.

Implemented original SVG artwork: a woman with a phone and flowing scarf in a layered sunset city, blinking eyes, breathing, moving tram, window light, scroll parallax and a night toggle. Interactive Explore/Connect/Arrive chapters connect animated route drawing, a voice waveform and circle/check imagery to functional destinations. A one-time arrival stamp completes the journey. The companion dial reacts to actual local call phases. These visuals do not imply real guardian availability or outside-world awareness.

All new illustrations are authored directly in local SVG/React; no Pinterest media or third-party character art was copied. This is 2D vector motion, not a claimed 3D/Lottie asset. No new Lovable build prompts until the SheBuild grant is verified.

The girl remains the primary character. The Safety Library now uses the same girl/city hero with “Your body. Your rules.” rather than its former type-only cover. Home and Learn include Character Moments: heading out, checking in with a raised phone, and taking a breath with closed eyes. A shared `GirlFigure` keeps the original design consistent, with unique SVG IDs, head poses, breathing, blinking and scarf motion. Phone sound arcs and a breathing halo belong only to the illustration and do not claim a real call connection. Tabs are keyboard accessible; pause and reduced-motion controls are supported. Character animation stops offscreen.

Maps and safety flows remain practical, legible and quick. Keep SOS accessible without waiting for animation, provide pause and reduced-motion behavior, use a static visual fallback, and avoid scroll hijacking. Do not allow a cinematic introduction to block returning users from their journey.
