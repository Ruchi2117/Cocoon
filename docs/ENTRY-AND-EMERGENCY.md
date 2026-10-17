# Entry, emergency access and reading layouts

Updated 17 October 2026.

## Optional welcome page

`/welcome` is a sign-in design foundation, not authentication. The header's Welcome link opens it; it never redirects or gates first-time visitors. Guests can skip directly to the world. The demo-profile option uses a nickname in the page's memory only, without email/password collection, account creation or changing the selected demo persona.

The entry is now a wide nighttime scene with a soft SVG flashlight mask, a crescent moon, layered streets, plants, an archway and two distinct neighbours. The light sweeps automatically, follows desktop pointer positions through SVG coordinate mapping, and widens with scrolling. “Let the light in” opens the door and expands the reveal, followed by a real entry link into Cocoon. Text and controls sit above the darkness mask. A still-scene control removes the darkness and movement; system reduced motion applies automatically. Mobile uses a separate viewBox crop and shorter caption to keep the scene and control clear of the entry text. No camera or environment sensing is involved.

The shared room backgrounds also now include library architecture, riverside routes and courtyard outlines with subtle scroll depth, moving foliage and ink texture. A light central reading layer preserves contrast. The home sky has additional colour depth and a light texture. Desktop and mobile checks covered the new reveal, pointer settling, still-scene control, real entry link, caption spacing and reading backgrounds; type checks, targeted lint and production build pass.

The invitation concept uses `cocoon-referral-demo-v1`, separate from contacts and demo journey records. Creating a demo code earns nothing. A labelled sample-join action adds 10 demo credits, with three distinct preview joins maximum. Reopening a copied invitation only displays its invitation context; it does not count a real person or award credits. Credits cannot be spent, have no cash value, and do not gate safety help. Invitations use the current demo origin; localhost links need a published destination to work on another device. Production referrals need authenticated accounts, server validation, anti-abuse rules, a real ledger and clear reward terms.

## Emergency contact panel

The Get help control stays in the shared header and works independently of the simulated trip or SOS workflow. The native modal supports Escape, focus containment and a visible close control. It reads the user's saved personal Safety Kit contacts and the explicitly chosen country's existing directory. A manually entered number can also open the dialler. There is no automatic call, message or emergency dispatch.

Use my current location makes one explicit browser geolocation request with a 10-second timeout and no cached position preference. The result includes coordinates, estimated accuracy, capture time and a map link. Location stays in memory and clears when the panel closes. Cancelling or closing invalidates late callbacks; there is no background watch. Denied/unavailable location leaves calls and a written landmark available. Sharing or copying is a separate action, with the destination chosen in the native share sheet; Cocoon cannot observe receipt or preselect the saved person. Existing automatic WhatsApp delivery is still unconnected.

Hardware location and native call/share completion were not activated during development. Tests use synthetic coordinates and cover explicit permission invocation, cancellation, note formatting and phone-link validation. Desktop/mobile browser checks verified the panel and a fictional dialler href without placing a call or sharing.

## Balanced reading layouts

`BalancedColumns` measures the two column heights, observes size/child changes and lets the shorter column follow a longer one on desktop. Tall panels scroll far enough to expose their bottom, then remain alongside the continuing text. Mobile uses ordinary document flow. Applied to route planning, journeys, the kit and companion panels; education intros also follow their guides. This avoids stretching a card or leaving half the view empty while reading the other side. Browser QA showed the 680-pixel map panel following a 1,359-pixel report column.

Validation: 104 tests pass, TypeScript and production build pass; lint has no errors (existing Fast Refresh export warnings remain). Desktop, tablet and mobile presentation checked. No real accounts, rewards, calls, messages or location readings were created.

Welcome now uses one fixed viewport-wide flashlight landscape behind both entry and referral sections. Pointer tracking listens across the page, decorative world symbols float within the illustration, and still/reduced-motion modes remain available. The scene persists on scroll; form controls remain above it. Desktop and 390px mobile layouts checked without horizontal overflow.

The optional welcome route now bypasses the application shell entirely: no desktop/mobile navigation, role switcher or app banner. It retains a skip-to-entry link, demo disclosure and direct skip/enter links. A standalone signature and full-window scene form the entrance.


## Entry launch flow (17 October 2026)

The main address now renders the full-screen welcome experience for a fresh browser tab. It has the same flashlight scene and no app navigation. Enter Cocoon and Skip this and explore both set a separate, session-scoped entry marker and reveal the world immediately. Returning home or refreshing the same tab keeps the world available. /welcome can still replay the introduction, and direct page URLs remain direct. The introduction never requires authentication or demo profile creation. Session storage failure falls back to in-memory state for the current page.
