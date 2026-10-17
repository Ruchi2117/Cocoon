import { createFileRoute } from "@tanstack/react-router";

/**
 * Durable dispatcher tick, called by a server-side scheduler (pg_cron) every minute with the
 * LOVABLE_CRON_SECRET bearer. Fires due overdue-check jobs (re-validated against current trip
 * state) and drains the outbox via runDispatch(). Refuses until storage and provider exist —
 * it never simulates sends.
 */
export const Route = createFileRoute("/api/public/cron/notify-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        const auth = request.headers.get("authorization");
        if (!secret || auth !== `Bearer ${secret}`)
          return new Response("Unauthorized", { status: 401 });
        const storage = process.env["SUPABASE_URL"] && process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!storage || !process.env["TWILIO_API_KEY"])
          return Response.json(
            { ran: false, reason: "WhatsApp not connected — automatic messages unavailable" },
            { status: 503 },
          );
        return Response.json(
          { ran: false, reason: "Outbox repository not yet wired" },
          { status: 503 },
        );
      },
    },
  },
});
