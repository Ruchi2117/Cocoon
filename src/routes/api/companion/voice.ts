import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { localVoiceAllowed, voiceConfigured, voiceInstructions } from "@/lib/cocoon/voice-policy";
import { emergencyGuidance } from "@/lib/cocoon/companion";

const input = z.object({
  sdp: z.string().min(20).max(60000),
  name: z.string().max(20),
  style: z.enum(["casual", "calm", "protective", "playful"]),
  destination: z.string().max(160).optional(),
  eta: z.number().min(0).max(1000).optional(),
  sharing: z.boolean().optional(),
  supportMode: z.boolean().optional(),
  intention: z.enum(["company", "grounding", "next-step"]).optional(),
  situation: z.string().max(300).optional(),
  country: z.string().length(2).nullable().optional(),
});
let lastCall = 0;
const headers = { "Cache-Control": "no-store" };
export const Route = createFileRoute("/api/companion/voice")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const env = process.env as Record<string, string | undefined>;
        const sameOrigin = new URL(request.url).origin;
        return Response.json(
          {
            available: localVoiceAllowed(request.url, sameOrigin, env) && voiceConfigured(env),
            message:
              "Natural AI voice needs a configured provider. Browser voice demo is available now.",
          },
          { headers },
        );
      },
      POST: async ({ request }) => {
        const env = process.env as Record<string, string | undefined>;
        if (!localVoiceAllowed(request.url, request.headers.get("origin"), env))
          return Response.json(
            { error: "Live voice is disabled. This demo has no production authentication." },
            { status: 403, headers },
          );
        if (!voiceConfigured(env))
          return Response.json(
            { error: "Live voice provider is not configured." },
            { status: 503, headers },
          );
        if (Date.now() - lastCall < 15000)
          return Response.json(
            { error: "Wait a moment before starting another call." },
            { status: 429, headers },
          );
        if (Number(request.headers.get("content-length") ?? 0) > 70000)
          return new Response("Request too large", { status: 413, headers });
        let body: unknown;
        try {
          const raw = await request.text();
          if (raw.length > 70000)
            return new Response("Request too large", { status: 413, headers });
          body = JSON.parse(raw);
        } catch {
          return new Response("Invalid request", { status: 400, headers });
        }
        const parsed = input.safeParse(body);
        if (!parsed.success) return new Response("Invalid call context", { status: 400, headers });
        lastCall = Date.now();
        const p = parsed.data;
        const form = new FormData();
        form.set("sdp", p.sdp);
        form.set(
          "session",
          JSON.stringify({
            type: "realtime",
            model: env["COCOON_REALTIME_MODEL"],
            instructions: voiceInstructions({
              name: p.name,
              style: p.style,
              ...(p.destination ? { destination: p.destination } : {}),
              ...(p.eta !== undefined ? { eta: p.eta } : {}),
              ...(p.sharing !== undefined ? { sharing: p.sharing } : {}),
              emergency: emergencyGuidance(p.country),
              ...(p.intention ? { intention: p.intention } : {}),
              ...(p.situation ? { situation: p.situation } : {}),
              ...(p.supportMode !== undefined ? { supportMode: p.supportMode } : {}),
            }),
            audio: { output: { voice: env["COCOON_REALTIME_VOICE"] } },
          }),
        );
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 20000);
        try {
          const response = await fetch("https://api.openai.com/v1/realtime/calls", {
            method: "POST",
            headers: { Authorization: `Bearer ${env["OPENAI_API_KEY"]}` },
            body: form,
            signal: ctrl.signal,
          });
          if (!response.ok)
            return Response.json(
              {
                error:
                  "Voice provider could not start the call. Check provider configuration and quota.",
              },
              { status: 502, headers },
            );
          const answer = await response.text();
          return new Response(answer, {
            headers: { ...headers, "Content-Type": "application/sdp" },
          });
        } catch {
          return Response.json(
            { error: "The voice connection timed out or was interrupted." },
            { status: 502, headers },
          );
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  },
});
