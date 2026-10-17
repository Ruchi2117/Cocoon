/** Zero-payment release: credentials and environment flags cannot authorize paid traffic. */
export const PROVIDER_POLICY = Object.freeze({
  whatsapp: false,
  naturalVoice: false,
  // Unpaid Gemini terms prohibit personal/sensitive data; audio consent cannot waive them.
  geminiLive: false,
  // Lovable AI Gateway GPT-Live: no external account, card or key; billed only from the
  // workspace's existing Lovable credits, zero data retention on the live surface.
  lovableLive: true,
});
export const WHATSAPP_DISABLED =
  "WhatsApp disabled under the zero-payment policy — no automatic messages will be sent.";
export const VOICE_DISABLED =
  "Direct OpenAI voice stays disabled under the zero-payment policy (no external account). Live calls use the included Lovable AI voice instead.";
export const GEMINI_LIVE_UNAVAILABLE =
  "Gemini Live free tier is unavailable for Cocoon safety conversations: Google prohibits personal or sensitive information on unpaid services and may use content for product improvement and human review. Consent or an API key does not remove this restriction.";
