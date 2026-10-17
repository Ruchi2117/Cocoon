import { authenticateRequest } from "./request-auth";
import { sameOrigin, VOICE_LIMITS, boundedBody } from "./security";
import { voiceConfigured, voiceInstructions } from "@/lib/cocoon/voice-policy";
import { emergencyGuidance } from "@/lib/cocoon/companion";
import { z } from "zod";
import { PROVIDER_POLICY, VOICE_DISABLED } from "./provider-policy";
const headers = { "Cache-Control": "no-store" };
const input = z
  .object({
    sdp: z.string().min(20).max(60000),
    audioConsent: z.literal(true),
    contextConsent: z.boolean(),
    name: z.string().max(20),
    style: z.enum(["casual", "calm", "protective", "playful"]),
    destination: z.string().max(160).optional(),
    eta: z.number().min(0).max(1000).optional(),
    sharing: z.boolean().optional(),
    supportMode: z.boolean().optional(),
    intention: z.enum(["company", "grounding", "next-step"]).optional(),
    situation: z.string().max(300).optional(),
    country: z.string().length(2).nullable().optional(),
  })
  .strict();
export function productionVoiceConfigured(env: Record<string, string | undefined>) {
  return (
    PROVIDER_POLICY.naturalVoice &&
    voiceConfigured(env) &&
    env["COCOON_VOICE_ENABLED"] === "true" &&
    env["COCOON_DURABLE_SCHEDULER_READY"] === "true"
  );
}
export async function handleVoice(request: Request) {
  const auth = await authenticateRequest(request);
  const env = process.env as Record<string, string | undefined>;
  if (request.method === "GET")
    return Response.json(
      {
        available: !!auth && productionVoiceConfigured(env),
        signedIn: !!auth,
        message: VOICE_DISABLED,
      },
      { headers },
    );
  if (!sameOrigin(request))
    return Response.json({ error: "Voice origin rejected." }, { status: 403, headers });
  if (!auth)
    return Response.json({ error: "Verified sign-in required." }, { status: 401, headers });
  if (request.method === "DELETE") {
    const id = new URL(request.url).searchParams.get("session");
    if (!id || !z.string().uuid().safeParse(id).success)
      return new Response("Invalid session", { status: 400, headers });
    const { data, error } = await auth.client
      .from("voice_sessions")
      .select("id,provider_call_id,status")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (error || !data) return new Response("Session unavailable", { status: 404, headers });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.status === "closed" || data.status === "failed")
      return Response.json({ closed: true }, { headers });
    if (data.provider_call_id) {
      if (!PROVIDER_POLICY.naturalVoice)
        return new Response(VOICE_DISABLED, { status: 503, headers });
      if (!env["OPENAI_API_KEY"])
        return new Response("Voice provider unavailable", { status: 503, headers });
      const r = await fetch(
        `https://api.openai.com/v1/realtime/calls/${encodeURIComponent(data.provider_call_id)}/hangup`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${env["OPENAI_API_KEY"]}` },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!r.ok && r.status !== 404)
        return new Response("Provider cleanup pending", { status: 502, headers });
    }
    const { error: e } = await supabaseAdmin
      .from("voice_sessions")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", auth.user.id);
    if (e) return new Response("Cleanup pending", { status: 503, headers });
    return Response.json({ closed: true }, { headers });
  }
  if (!productionVoiceConfigured(env))
    return Response.json({ error: VOICE_DISABLED }, { status: 503, headers });
  let raw: string;
  try {
    raw = await boundedBody(request, 70000);
  } catch {
    return new Response("Too large", { status: 413, headers });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Invalid request", { status: 400, headers });
  }
  const parsed = input.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Review microphone and context consent." },
      { status: 400, headers },
    );
  const p = parsed.data;
  if (
    !p.contextConsent &&
    (p.destination || p.situation || p.eta !== undefined || p.sharing !== undefined)
  )
    return Response.json(
      { error: "Optional context requires explicit consent." },
      { status: 400, headers },
    );
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: paused, error: stateError } = await supabaseAdmin
    .from("production_service_state")
    .select("paused")
    .eq("service", "voice")
    .maybeSingle();
  if (stateError || paused?.paused)
    return Response.json(
      { error: "Voice provider paused; owner review required." },
      { status: 503, headers },
    );
  const { data: id, error } = await supabaseAdmin.rpc("reserve_voice", { p_user: auth.user.id });
  if (error || !id)
    return Response.json(
      { error: "A call is already active or your voice usage limit was reached." },
      { status: 429, headers },
    );
  const form = new FormData();
  form.set("sdp", p.sdp);
  form.set(
    "session",
    JSON.stringify({
      type: "realtime",
      model: env["COCOON_REALTIME_MODEL"],
      output_modalities: ["audio"],
      max_output_tokens: 512,
      tools: [],
      tool_choice: "none",
      instructions: voiceInstructions({
        name: p.name,
        style: p.style,
        emergency: emergencyGuidance(p.country),
        intention: p.intention,
        supportMode: p.supportMode,
        ...(p.contextConsent
          ? { destination: p.destination, eta: p.eta, sharing: p.sharing, situation: p.situation }
          : {}),
      }),
      audio: {
        input: {
          turn_detection: { type: "server_vad", create_response: true, interrupt_response: true },
        },
        output: { voice: env["COCOON_REALTIME_VOICE"] },
      },
    }),
  );
  let callId: string | undefined;
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${env["OPENAI_API_KEY"]}` },
      body: form,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]),
    });
    if (!response.ok) {
      if ([401, 402, 403].includes(response.status))
        await supabaseAdmin
          .from("production_service_state")
          .upsert({ service: "voice", paused: true, reason: `Provider access ${response.status}` });
      throw new Error("Provider could not create the call.");
    }
    const location = response.headers.get("location");
    callId = location?.match(/\/calls\/([A-Za-z0-9_-]+)\/?$/)?.[1];
    if (!callId) throw new Error("Provider call-control identifier missing.");
    const answer = await response.text();
    if (request.signal.aborted) throw new Error("Call cancelled.");
    const { error: e } = await supabaseAdmin
      .from("voice_sessions")
      .update({ provider_call_id: callId, status: "active" })
      .eq("id", id);
    if (e) throw new Error("Call control could not be saved.");
    return new Response(answer, {
      headers: {
        ...headers,
        "Content-Type": "application/sdp",
        "X-Cocoon-Voice-Session": id,
        "X-Cocoon-Max-Seconds": String(VOICE_LIMITS.seconds),
      },
    });
  } catch {
    if (callId) {
      try {
        await fetch(`https://api.openai.com/v1/realtime/calls/${callId}/hangup`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env["OPENAI_API_KEY"]}` },
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        /* expiry reconciler retains failed cleanup */
      }
    }
    await supabaseAdmin
      .from("voice_sessions")
      .update({
        status: callId ? "active" : "failed",
        ...(callId ? { provider_call_id: callId, expires_at: new Date().toISOString() } : {}),
      })
      .eq("id", id);
    return Response.json(
      {
        error:
          "Voice could not connect. Microphone will stop; retry only after reviewing provider setup.",
      },
      { status: 502, headers },
    );
  }
}
export async function expireVoiceSessions() {
  if (!PROVIDER_POLICY.naturalVoice) return;
  const key = process.env["OPENAI_API_KEY"];
  if (!key) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("voice_sessions")
    .select("id,provider_call_id")
    .in("status", ["starting", "active"])
    .lte("expires_at", new Date().toISOString())
    .limit(1);
  if (error) throw new Error("Voice cleanup storage unavailable.");
  for (const s of data ?? []) {
    if (s.provider_call_id) {
      const r = await fetch(
        `https://api.openai.com/v1/realtime/calls/${encodeURIComponent(s.provider_call_id)}/hangup`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!r.ok && r.status !== 404) continue;
    }
    const { error: e } = await supabaseAdmin
      .from("voice_sessions")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", s.id);
    if (e) throw new Error("Voice cleanup state could not be saved.");
  }
}

