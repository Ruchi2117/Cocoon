/** Zero-payment release: credentials and environment flags cannot authorize paid traffic. */
export const PROVIDER_POLICY = Object.freeze({
  whatsapp: false,
  naturalVoice: false,
  // Unpaid Gemini terms prohibit personal/sensitive data; audio consent cannot waive them.
  geminiLive: false,
});
export const WHATSAPP_DISABLED =
  "WhatsApp disabled under the zero-payment policy — no automatic messages will be sent.";
export const VOICE_DISABLED =
  "Natural AI voice disabled under the zero-payment policy. Browser speech is a scripted demo, not conversational AI.";
export const GEMINI_LIVE_UNAVAILABLE =
  "Gemini Live free tier is unavailable for Cocoon safety conversations: Google prohibits personal or sensitive information on unpaid services and may use content for product improvement and human review. Consent or an API key does not remove this restriction.";

