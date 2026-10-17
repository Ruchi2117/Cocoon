# Presence listening room

## Available now

- Text-first, public scripted companion. Three guided intentions provide varied prompts: company, grounding, and deciding a next step. Context is limited to user-confirmed country and the explicitly labelled local demo trip; no private account reads, diagnoses, guarantees or automatic mutations.
- Optional browser speech, not natural AI. Selecting voice mode does not open the microphone. Begin uses browser playback; Listen once is the sole recognition entry point. Each final turn aborts recognition before generating/speaking a response. No restart timer, continuous recognition, microphone preview or self-echo loop.
- Explicit stop/interruption, speaker toggle, repeat last reply, browser voice selection and rate 0.7–1.3. Voice-list changes retire missing selection and stop playback. Text remains usable after unsupported/denied/network/device/synthesis errors.
- Generation-bound late event rejection on end, mode/settings changes, hidden document, pagehide and unmount. Returning from hidden never resumes capture. Speech is capped to 1,600 characters, split into sequential chunks of at most 240 characters; transcript retains 30 messages, input 1,000 characters. Old utterance callbacks cannot advance cancelled queues or disturb newer speech.
- Ephemeral end summary includes only chosen intention and preset next-step reminder. No transcript, crisis notes or summary saved to localStorage, Cloud or external providers. Clear empties the page session; navigation destroys controller/settings/transcript.
- SVG lantern moth reacts to real session phases. Light-pulse animation is decorative, not a microphone level or real audio analysis. Still, reduced-motion, hidden and offscreen states pause animation. Sticky Journey/Account/SOS controls reserve their own space. SOS interrupts companion/recording and opens the existing separate real authenticated/private review plus explicitly labelled local demo.
- Separate manual recording and user-initiated sharing remain. Opening choices never captures; capture requires its own deliberate button. No duplicate support call or automatic coupled recorder. Companion end/mode switch/hide/navigation stop local capture.

## Limits and privacy

Browser recognition may send audio to the browser vendor's online speech service; voices may be device-local or vendor-hosted. The expandable disclosure explains this before any microphone action. No promise of offline or confidential crisis care. This release does not establish browser vendor eligibility, pricing or actual device behavior; prefer text if unsuitable. Cocoon never calls OpenAI, Twilio or Gemini from this room, requests keys or changes immutable provider policy.

Natural speech-to-speech remains blocked by zero-payment/provider privacy constraints. No new external account, billing, key, paid fallback, provider endpoint, migration or publish. Real in-app SOS requires sign-in, consenting selected guardians and explicit confirmation; it is not dispatch or closed-tab notification. Journey/Account/SOS links do not share this conversation.

## Verification

Mock tests exercise one-turn recognition, denial/service/network/no-device/no-speech/start errors, unsupported synthesis/recognition, duplicate results, late replies/events, end/hide/mode/unmount, overlap and interruption/repeat, missing voices/rate bounds, payload/history caps and sequential cancellation. Component tests exercise text guidance/summary, denial-to-text, late callback after end, hidden cleanup/unsubscribe and reduced-motion controls. Existing isolated PostgreSQL/private journey/SOS tests remain in the full suite.

Playwright checks public desktop 1280×1800, mobile 390×844 and mobile reduced-motion hydration; deliberate text → guided next step → Journey suggestion → end summary, signed-out SOS review and independent manual recorder choices. No page errors, horizontal overflow or OAuth/paid-provider requests. Real microphone/audio/camera/GPS, authenticated real users, sends and audible device verification are intentionally not tested. No permissions were requested or provider calls made.
