import { createFileRoute } from "@tanstack/react-router";
import { PresenceRoom } from "@/components/cocoon/PresenceRoom";

export const Route = createFileRoute("/presence")({
  head: () => ({
    meta: [
      { title: "Cocoon Presence · the night listening room" },
      {
        name: "description",
        content:
          "Text-first guided company, grounding and next steps with optional browser speech. Scripted, not natural AI; private SOS and journeys remain separate.",
      },
      { property: "og:title", content: "Cocoon Presence · the night listening room" },
      {
        property: "og:description",
        content:
          "A little company, in your own time. Optional browser voice and ephemeral guided conversation, with separate private SOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PresenceRoom,
});
