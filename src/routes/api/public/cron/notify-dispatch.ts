import { createFileRoute } from "@tanstack/react-router";
import { dispatchProduction } from "@/lib/production/dispatch";
export const Route = createFileRoute("/api/public/cron/notify-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
          return new Response("Unauthorized", { status: 401 });
        try {
          const result = await dispatchProduction(new URL(request.url).origin);
          return Response.json(result, {
            status: result.ran ? 200 : 503,
            headers: { "Cache-Control": "no-store" },
          });
        } catch {
          return new Response("Durable worker unavailable", { status: 503 });
        }
      },
    },
  },
});

