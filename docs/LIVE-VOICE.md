# Natural AI voice

The Natural AI voice tab implements speech-to-speech WebRTC using OpenAI's unified Realtime call endpoint. This is a real connection path, **not an enabled service**. No live calls or provider spend occurred during development.

## Local development only

Set these server environment variables before starting the dev server:

```text
COCOON_ENABLE_LOCAL_VOICE=true
OPENAI_API_KEY=<server-side secret>
COCOON_REALTIME_MODEL=<Realtime model available to your account>
COCOON_REALTIME_VOICE=<supported voice for that model>
```

Do not prefix secrets with `VITE_`, commit them, or paste them into chat. Use provider billing limits before enabling. Official documentation examples currently use `gpt-realtime-2.1` and `marin`; choose an account-supported model and voice deliberately. No model is hardcoded or silently substituted.

Start `npm run dev -- --host 127.0.0.1`. In Presence select Natural AI voice, then deliberately start the call. The browser requests microphone access. Audio and the destination/ETA/sharing summary go to the configured provider; exact coordinates, conversation history and guardian identities are not sent by this panel. It does not save audio or captions. A standard provider key stays on the server. The app receives only the SDP answer.

The existing Browser demo tab remains a labelled scripted conversation with browser TTS/recognition, and does not become live AI merely because the API connection code exists.

## Production boundary

The server rejects this endpoint in production and on non-loopback hosts even if credentials exist. Before public enablement: implement real authentication, server-validated trip access/consent, per-user quotas, reliable provider lifecycle monitoring and abuse controls. A browser demo role selector is not authentication. No emergency or messaging action tools are exposed to the model.

Source: https://developers.openai.com/api/docs/guides/voice-webrtc (checked 16 October 2026).

## Verification limits

Provider configuration and origin gates have mocked tests. End-to-end natural voice, microphone permission behavior and voice quality still require a configured provider and user-driven device testing. They have not been asserted as working from an unconfigured state.


## Call controls audit - 17 October 2026

- Natural voice now offers company, optional grounding, or a practical next step. An optional 300-character situation note is sent only when starting the call; the simulated trip summary requires a separate opt-in. Exact location and guardian identities remain excluded.
- The buddy stays speaking until playback drains. Interrupt cancels active generation and clears buffered WebRTC audio, following the official client event reference: https://developers.openai.com/api/reference/resources/realtime/client-events .
- Closed channels, failed peers and an eight-second unrecovered disconnect release the microphone and reset the call controls. Duplicate connection attempts are guarded. Mute and speaker choices made during setup are applied when the handle becomes available.
- Natural support never silently falls back to scripted speech. An unavailable provider is shown explicitly.
- Mock tests cover device cleanup, late permissions, refusal, mute, playback completion, interruption, channel closure and disconnection recovery. These tests do not establish real microphone permissions, end-to-end voice quality, latency, language quality or crisis effectiveness.
- Still required: configure an account-supported provider model/voice and server key; run an explicit real-device acceptance call. Production remains gated pending authentication and usage controls. Automatic messaging, authority dispatch and authenticated nearby assistance are separate services and remain disconnected.
