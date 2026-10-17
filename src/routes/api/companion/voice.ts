import { createFileRoute } from "@tanstack/react-router";
import { handleVoice } from "@/lib/production/voice-service";
export const Route = createFileRoute("/api/companion/voice")({
  server: {
    handlers: {
      GET: ({ request }) => handleVoice(request),
      POST: ({ request }) => handleVoice(request),
      DELETE: ({ request }) => handleVoice(request),
    },
  },
});

