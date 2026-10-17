import { createFileRoute } from "@tanstack/react-router";
import { PresenceRoom } from "@/components/cocoon/PresenceRoom";

export const Route = createFileRoute("/presence")({
  head: () => ({
    meta: [
      { title: "Cocoon Presence · the night listening room" },
      {
        name: "description",
        content:
          "An explicitly consented AI companion call with a capped no-account demo and a separate scripted browser demo. Private SOS and journeys remain separate.",
      },
      { property: "og:title", content: "Cocoon Presence · the night listening room" },
      {
        property: "og:description",
        content:
          "A little company, in your own time: consent-based AI voice, network-limited guest calls and a separate labelled script. No tracking or automatic alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PresenceRoom,
});
