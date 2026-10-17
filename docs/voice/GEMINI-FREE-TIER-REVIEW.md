# Gemini Live: zero-payment suitability review

Reviewed 17 October 2026 against official documentation. **Not connected; not eligible for Cocoon's current safety-conversation use.** Existing OpenAI wiring and browser-speech demo are preserved. No inference or ephemeral-token requests, audio capture, billing changes, accounts, or secret provisioning occurred.

## Pricing is free, but eligibility is not satisfied

[Pricing](https://ai.google.dev/gemini-api/docs/pricing) lists `gemini-2.5-flash-native-audio-preview-12-2025` (Gemini 2.5 Flash Native Audio, Live API) audio input/output as free of charge on Free Tier, subject to model availability and quotas. The free-tier table says content is used to improve products. A price row does not establish account eligibility, availability or privacy suitability.

[Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms), effective March 23, 2026, state:

- **Unpaid Services:** “Do not submit sensitive, confidential, or personal information to the Unpaid Services.” Unpaid API quota is included. Google uses inputs and generated responses to improve products and machine-learning technologies; “human reviewers may read, annotate, and process your API input and output.”
- **Age:** API users must be at least 18, and API clients must not be directed towards or likely to be accessed by under-18s. Cocoon's student audience is not proven adult-only. A checkbox alone does not resolve an app's likely audience.
- **Regions:** “You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom.” Regional paid data terms applying even to free quota must not be confused with permission to deploy an unpaid API client there. Cocoon is global; its country preference is not eligibility verification.
- **Medical boundary:** no clinical practice or medical advice. Do not advertise confidential crisis care, medical treatment, emergency response or guaranteed safety.
- **Billing:** Gemini API access is a Paid Service only through a project associated with an active billing account. Linking billing to obtain different data terms is outside the user's zero-payment authorization.

[Abuse monitoring](https://ai.google.dev/gemini-api/docs/usage-policies) describes retaining prompts, contextual information and outputs for 55 days for safety/security/regulatory purposes, with authorized Google employee review of flagged content. Ephemeral authentication is not ephemeral data retention.

### Why no optional adapter was added

Real safety-companion speech can contain identity, personal disclosures, location or sensitive crisis information. Audio reaches the provider before a local prompt could prevent such disclosure. Disabling context sharing, authenticating adults, obtaining separate audio consent, using quotas or issuing short-lived tokens does **not** waive the unpaid-data restriction. A prompt, warning or speculative audio filter cannot guarantee compliance. Therefore the eligibility/privacy condition for the requested adapter is not met.

The shared frozen policy explicitly sets `geminiLive: false`; there is no token issuer, microphone transport, automatic model switch, fallback or Gemini credential activation path. UI explains the blocker. Browser speech remains a labelled scripted demo, not natural conversational AI. Provider alerts remain disabled independently.

## Researched auth/audio contract — reference only, not deployed

Official sources: [ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens), [WebSocket setup](https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket), [capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [session management](https://ai.google.dev/gemini-api/docs/live-api/session-management), [model catalog](https://ai.google.dev/gemini-api/docs/models).

- Server provisioning: `POST https://generativelanguage.googleapis.com/v1beta/auth_tokens` with server-only `x-goog-api-key`. The standard key must never enter browser code, URLs, logs or repository files.
- Token fields: `uses: 1`, `expireTime`, `newSessionExpireTime`; optional `liveConnectConstraints` bind the model/configuration. Documented defaults: one minute to start a new session, thirty minutes to send messages. These are provider defaults, **not** appropriate app quotas or proof of forced server cleanup.
- Constrained client connection: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=<ephemeral-token>`. Treat tokens as secrets; never log the socket URL. Ephemeral tokens are Live-only.
- Initial message: `setup.model` = `models/gemini-2.5-flash-native-audio-preview-12-2025`, `setup.generationConfig.responseModalities` = `["AUDIO"]`.
- Input: `realtimeInput.audio` with base64 raw little-endian signed 16-bit PCM, `mimeType: "audio/pcm;rate=16000"`. Native input 16 kHz; output raw PCM 24 kHz. Output arrives as audio parts in server content; interruption and turn completion must control playback queues.
- Connections last around ten minutes; audio-only sessions without compression last fifteen minutes. Session resumption changes lifetime behavior. A one-use token can support resumption within expiry; it is not an absolute one-connection lifetime guarantee.

These reference shapes have not been live-validated. No provider call was authorized. Preview model/version behavior and pricing can change. Do not substitute a different model or endpoint without user approval and documented validation.

An eligible future integration would additionally require verified bearer identity and origin checks before token issuance; durable atomic quota reservation and rate limits; server-bound setup with no tools/notifications/recording; explicit provider/privacy disclosure and separate microphone opt-in; no context by default; bounded connection/audio buffering; cancellation, interrupt, unmount and device cleanup; and a verified hard lifetime strategy that cannot be bypassed by reconnect/resumption. Existing OpenAI reservations must not be treated as verified Gemini session control.

## Free AI Studio setup — unrelated, non-personal experimentation only

**This is not a request to create an account or supply a key for Cocoon. A key cannot clear the blocker.** If the user independently wants to evaluate synthetic, non-personal adult-only material outside this safety app:

1. Personally review the [terms](https://ai.google.dev/gemini-api/terms), [available regions](https://ai.google.dev/gemini-api/docs/available-regions), privacy and applicable quota/model limits. The user alone must create/verify their account and accept terms.
2. Use [Google AI Studio's key page](https://aistudio.google.com/apikey) and [official API-key guide](https://ai.google.dev/gemini-api/docs/api-key). Select/create only a project with **no billing account linked** and verify its tier shows **Free**. Stop if a card, billing link, upgrade, terms the user declines, or regional paid requirement is presented. Do not import a billing-enabled project.
3. Do not enable billing, paid fallback, overage or auto-top-up. Free quota is finite and availability is not guaranteed. Stop on quota exhaustion; never upgrade or route to a paid API automatically. Consumer subscriptions and trials are not proof of zero-payment API eligibility.
4. For a separately approved, eligible implementation, credentials belong only in **Project Settings → Secrets** (for example `GEMINI_API_KEY`), never chat or committed files. No Gemini secret is requested or consumed by this release. Do not upload personal, confidential, underage or sensitive crisis information to unpaid services.

No hosted account/tier/billing eligibility has been verified. The Cocoon free-voice blocker remains even if these steps are completed. Any future use needs a fresh eligibility review, explicit user authorization and meaningful no-audio tests before deployment; no publish is authorized now.
