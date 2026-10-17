# Page roles and readability · 17 October 2026

| Page | Primary purpose |
| --- | --- |
| Welcome | Optional illustrated entry; no app navigation or required sign-in |
| Home | Illustrated overview linking to the different places |
| Routes | Destination search, walking-route context and relevant report pins |
| Journey | Active-trip progress, check-ins and guardian sharing |
| Call | Companion voice/text, calming support and optional support controls |
| Kit | Packing, country-scoped emergency directory and personal contacts |
| Learn | Sourced education, consent, support principles and jurisdiction-labelled rights |
| Reports | Community observations, report submission and optional publisher headlines |
| Circle | Peer conversations and review-before-publication; no news feed |

Learn’s duplicated live-news component has been removed. Cross-links now point to Reports#news. This supersedes older notes describing a shared live feed in both routes. Related cross-links remain available without embedding other pages’ full content.

Readability changes give nighttime rooms explicit light text, pale reading surfaces dark text, opaque input colours and clear placeholders. Specific corrections cover Kit shortcuts/offline card, report filters, route chips, room return links, support buttons, welcome referral captions and reference-library number badges. DOM contrast checks and visual inspection were used together; gradient artwork needs visual judgment, so this is not an accessibility certification. No personal data, permissions or calls were changed during QA.

The expanded Learn reference library was opened for the contrast pass. Source-number badges have their own opaque light background and dark ink. Home's text was inspected against its SVG/gradient scenery; helper copy is fully opaque and navigation controls receive a dark backing. Computed-colour checks can misread gradients, so these home/call results were visually checked rather than treated as an automatic conformance score.
