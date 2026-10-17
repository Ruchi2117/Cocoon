import { createFileRoute } from "@tanstack/react-router";
import { fetchSafetyNews } from "@/lib/cocoon/safety-news";
export const Route = createFileRoute("/api/public/safety-news")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const region = new URL(request.url).searchParams.get("region") ?? "global";
        if (region !== "global" && region !== "india")
          return Response.json({ error: "Unknown region" }, { status: 400 });
        return Response.json(await fetchSafetyNews(region), {
          headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
        });
      },
    },
  },
});
