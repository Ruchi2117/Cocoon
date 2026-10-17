# The Circle: care before reach

The Circle (`/circle`) is a women-centered, adult (18+) peer-support prototype. It follows the pre-publication review concept described by Flo's official Secret Chats help, without copying its interface, policy text or promising its safeguards. Reference: https://help.flo.health/hc/en-us/articles/360052675971-What-is-Flo-Secret-Chats (reviewed 16 October 2026).

## Implemented local experience

- Topic-based discussions, display aliases, sensitive-content disclosure and explicit requests for listening, gentle suggestions or resources. The existing illustrated girl remains part of the visual design.
- All new posts and replies are pending until the demo moderator completes four care/privacy/claims/medical-content checks and writes a review note. Edits and restorations return to review. Personal disclosures do not require proof. Standards approval is not factual verification.
- Reports return an approved contribution to review. Parent withdrawal/re-review hides its replies. Author hiding affects the reader's view and can be undone. Own contributions can be withdrawn or revised, including replies returned for changes.
- No votes, popularity rankings, direct messages, image uploads or real-time chat. News is a separate source-linked desk; public accusations and forwarded claims are out of scope for peer-support threads.
- Contact-pattern validation discourages phone/email exposure. Review hints are limited pattern matches, not automatic decisions, abuse detection, fact checking or medical review.
- All state uses the existing demo store and action boundary. The persistence schema migrates older saves with a Circle seed, preserving other app records. All seed conversations and replies are explicitly fictional.

## Honest privacy and launch boundary

This is not a live community. There are no connected members, staffed moderators, authentication or enforced membership/age verification. Demo aliases are display labels, not guaranteed anonymity; records and roles can be inspected or changed in browser storage. The page states that the demo is not confidential or end-to-end encrypted and asks people not to enter identifying or highly sensitive data. No real posts were published externally during development.

Before a public launch: implement authenticated pseudonymous accounts, server-enforced permissions/RLS and publication checks, separate restricted identity mapping, appropriate data protection/retention controls, real age and membership policy, trained human moderation with coverage and escalation procedures, safe incident reporting, rate limits and anti-brigading checks, repeat-offender handling, and an appeal/re-review process. A demo role switch and checklist are not production access control. A single-report quarantine in the prototype needs a production abuse policy. Do not describe any keyword rule or AI system as preventing all misinformation or abuse.

## Verification

84 tests pass across 13 files; TypeScript and production build pass; ESLint has no errors and 14 existing Fast Refresh warnings. New tests cover hold-before-publication, moderator-only approval, required review checks/notes, pending replies, contact privacy, personal disclosure without proof, reporting, reader-specific hiding, edits/withdrawal/restoration, revision feedback and old-save migration. Browser QA exercised a fictional post pending → reviewed → visible, a reply returned for changes, and recoverable withdrawal of both QA contributions. No external notifications or posts were sent.

The [explore and connect refresh](EXPLORE-AND-CONNECT.md) adds topic rooms, alias avatars and approved reply previews without changing publication rules.

Visual refresh: ink-blue page, lavender illustrated hero, floating decorative conversation prompts, coloured topic rooms and compact rounded conversation threads. No popularity scores or fictional live activity were added.

## Community feed refresh
Compact red cover retains the illustrated girl, followed by topic-room tabs and a social feed. Search filters visible titles and non-sensitive previews (sensitive bodies are not searched). Sort by creation date or latest approved reply. Threads expand inline with the existing reviewed reply composer and reader controls. No votes, popularity scores, fabricated live presence or member counts were introduced.

Reader bookmarks are saved per demo actor in `circle.saved`, defaulted during old-save parsing. Toggle mutations go through `toggleCircleSave` in actions.ts and accept only approved, unmuted conversations in Traveller role. Saved view filters against currently visible posts, so a saved ID never reveals a hidden contribution. Browser verification saved/unsaved an example, filtered/search/sorted the feed and opened a reply thread; no new contribution submitted. Two tests cover bookmark visibility and role/publication boundaries. Full suite: 115 tests pass.
