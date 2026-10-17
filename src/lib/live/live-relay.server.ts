import process from "node:process";
import {
  CALL_LIMIT_SECONDS,
  GUEST_CALL_LIMIT_SECONDS,
  buildCallInstructions,
  buildOpening,
  callContextSchema,
  type CallContext,
} from "@/lib/cocoon/call-persona";
import { PROVIDER_POLICY } from "@/lib/production/provider-policy";

/**
 * Lovable AI Gateway GPT-Live relay. Browser ↔ this relay ↔ Gateway control sockets carry SDP,
 * lifecycle and transcript events; audio flows browser ↔ provider over WebRTC. Nothing here
 * stores or logs transcripts. Calls require a verified account or trusted network and quota slot.
 */
export type LiveConfig = { baseURL: string; key: string; liveModel: string };
const liveSettings = { baseURL: "https://ai.gateway.lovable.dev", liveModel: "openai/gpt-live-1" };

export type LiveSocket = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: unknown) => void): void;
  onClose(handler: () => void): void;
  onError(handler: () => void): void;
};
export type LiveExecutionContext = { waitUntil(task: Promise<unknown>): void };
export type LiveConnector = (
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal,
) => Promise<LiveSocket>;
/** Injected so lifecycle/privacy can be tested without real accounts or provider traffic. */
export type LiveDeps = {
  authenticate(token: string): Promise<{ userId: string } | null>;
  reserve(userId: string): Promise<{ id: string } | { error: string }>;
  release(id: string, status: "closed" | "failed"): Promise<void>;
  limitSeconds: number;
  /** Signed-out demo calls: shorter, hashed trusted-IP and global caps. Absent = guests refused. */
  reserveGuest?(clientHash: string): Promise<{ id: string } | { error: string }>;
  releaseGuest?(id: string, status: "closed" | "failed"): Promise<void>;
  guestLimitSeconds?: number;
};

type WorkerSocket = WebSocket & { accept(): void };
declare const WebSocketPair: { new (): { 0: WorkerSocket; 1: WorkerSocket } };
type ProviderEvent = {
  type: string;
  client_event_id?: string;
  error?: { client_event_id?: string; message?: string };
  session?: { id: string };
  delegation?: { id: string; target: string };
};

export function getLiveConfig(): LiveConfig {
  const config = { ...liveSettings, key: process.env["LOVABLE_API_KEY"] ?? "" };
  if (!config.key) throw new Error("Missing Live relay configuration");
  return config;
}

export const productionDeps: LiveDeps = {
  async authenticate(token) {
    const { authenticateToken } = await import("@/lib/production/request-auth");
    const auth = await authenticateToken(token);
    return auth ? { userId: auth.user.id } : null;
  },
  async reserve(userId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: state, error: stateError } = await supabaseAdmin
      .from("production_service_state")
      .select("paused")
      .eq("service", "live-voice")
      .maybeSingle();
    if (stateError || !state)
      return { error: "Live voice limits could not be checked. Try again later." };
    if (state?.paused) return { error: "Live voice is paused by the owner." };
    const { data, error } = await supabaseAdmin.rpc("reserve_voice", { p_user: userId });
    if (error || !data)
      return { error: "You already have a call open, or reached today's call limit." };
    return { id: data };
  },
  async release(id, status) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("voice_sessions")
      .update({ status, ended_at: new Date().toISOString() })
      .eq("id", id);
  },
  limitSeconds: CALL_LIMIT_SECONDS,
  async reserveGuest(clientHash) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: state, error: stateError } = await supabaseAdmin
      .from("production_service_state")
      .select("paused")
      .eq("service", "live-voice")
      .maybeSingle();
    if (stateError || !state)
      return { error: "Live voice limits could not be checked. Try again later." };
    if (state?.paused) return { error: "Live voice is paused by the owner." };
    const { data, error } = await supabaseAdmin.rpc("reserve_guest_voice", {
      p_client: clientHash,
    });
    if (error || !data)
      return { error: "Demo calls are busy or used up for now. Sign in for more calls." };
    return { id: data };
  },
  async releaseGuest(id, status) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("guest_voice_sessions")
      .update({ status, ended_at: new Date().toISOString() })
      .eq("id", id);
  },
  guestLimitSeconds: GUEST_CALL_LIMIT_SECONDS,
};

async function hashClient(key: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`cocoon-guest:${key}`),
  );
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function gatewayAPIBase(baseURL: string) {
  return `${baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`;
}

async function gatewayRejection(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.slice(0, 300) : "";
  return new Error(message || `Voice service rejected the connection (${response.status})`);
}

export function validateLiveUpgrade(
  request: Request,
  options: { allowMissingOrigin?: boolean } = {},
): Response | null {
  const origin = request.headers.get("origin");
  if (origin === null ? !options.allowMissingOrigin : origin !== new URL(request.url).origin) {
    return new Response("Voice connection origin rejected", { status: 403 });
  }
  if (request.method !== "GET" || request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("WebSocket required", { status: 426 });
  }
  return null;
}

function workerSocket(socket: WorkerSocket): LiveSocket {
  return {
    get readyState() {
      return socket.readyState;
    },
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (handler) => socket.addEventListener("message", (event) => handler(event.data)),
    onClose: (handler) => socket.addEventListener("close", handler),
    onError: (handler) => socket.addEventListener("error", handler),
  };
}

export function handleLiveRequest(request: Request, ctx?: unknown): Response {
  if (!PROVIDER_POLICY.lovableLive) return new Response("Live voice disabled", { status: 503 });
  const bound = (request as Request & Partial<LiveExecutionContext>).waitUntil;
  const context = ctx as Partial<LiveExecutionContext> | undefined;
  const waitUntil = bound ?? (context?.waitUntil ? context.waitUntil.bind(context) : undefined);
  if (!waitUntil) return new Response("Live runtime unavailable", { status: 503 });
  let config: LiveConfig;
  try {
    config = getLiveConfig();
  } catch {
    return new Response("Live voice not configured", { status: 503 });
  }
  const rejected = validateLiveUpgrade(request);
  if (rejected) return rejected;
  const pair = new WebSocketPair();
  pair[1].accept();
  const clientKey = request.headers.get("cf-connecting-ip") ?? undefined;
  bindLiveConnection(
    workerSocket(pair[1]),
    config,
    { waitUntil },
    async (url, headers, signal) => {
      const response = await fetch(url, { headers: { ...headers, Upgrade: "websocket" }, signal });
      const socket = (response as Response & { webSocket?: WorkerSocket | null }).webSocket;
      if (!socket) throw await gatewayRejection(response);
      socket.accept();
      return workerSocket(socket);
    },
    productionDeps,
    clientKey,
  );
  const response: ResponseInit & { webSocket: WebSocket } = { status: 101, webSocket: pair[0] };
  return new Response(null, response);
}

export function bindLiveConnection(
  browser: LiveSocket,
  configuration: LiveConfig,
  execution: LiveExecutionContext,
  connect: LiveConnector,
  deps: LiveDeps = productionDeps,
  clientKey?: string,
): void {
  const config = { ...configuration };
  const runID = crypto.randomUUID();
  const setupAbort = new AbortController();
  let gateway: LiveSocket | undefined;
  let sessionID: string | undefined;
  let reservation: string | undefined;
  let guest = false;
  let limitSeconds = deps.limitSeconds;
  let reachedProvider = false;
  let call: CallContext | undefined;
  let starting = false;
  let closing = false;
  let finished = false;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let limitTimer: ReturnType<typeof setTimeout> | undefined;
  let finishDrain: (() => void) | undefined;
  let browserReady = false;
  let greetingRequested = false;
  let greetingCommand: { id: string; type: "instructions" | "commentary" } | undefined;
  let greetingTimer: ReturnType<typeof setTimeout> | undefined;
  const delegations = new Set<string>();
  const startTimer = setTimeout(() => {
    emit({ type: "app.error", error: { message: "Voice startup message timed out" } });
    stop();
  }, 15_000);

  function emit(event: object) {
    if (browser.readyState !== 1) return;
    try {
      browser.send(JSON.stringify(event));
    } catch {
      stop();
    }
  }
  function close(socket?: LiveSocket) {
    if (!socket || socket.readyState === 3) return;
    try {
      socket.close(1000, "Call ended");
    } catch {
      return;
    }
  }
  function clearGreeting() {
    clearTimeout(greetingTimer);
    greetingCommand = undefined;
  }
  function releaseReservation() {
    const id = reservation;
    reservation = undefined;
    if (id)
      execution.waitUntil(
        (guest && deps.releaseGuest
          ? deps.releaseGuest(id, reachedProvider ? "closed" : "failed")
          : deps.release(id, reachedProvider ? "closed" : "failed")
        ).catch(() => undefined),
      );
  }
  function requestGreeting() {
    if (!call || !browserReady || !sessionID || greetingRequested || closing) return;
    greetingRequested = true;
    greetingCommand = { id: crypto.randomUUID(), type: "instructions" };
    greetingTimer = setTimeout(() => {
      clearGreeting();
      emit({ type: "app.greeting.error", error: { message: "The pickup could not be confirmed" } });
    }, 10_000);
    gateway?.send(
      JSON.stringify({
        type: "session.instructions.append",
        event_id: greetingCommand.id,
        delegation_id: null,
        content: buildOpening(call),
      }),
    );
  }
  function finish() {
    if (finished) return;
    finished = closing = true;
    for (const t of [startTimer, startupTimer, closeTimer, limitTimer]) clearTimeout(t);
    clearGreeting();
    setupAbort.abort();
    releaseReservation();
    close(gateway);
    close(browser);
    finishDrain?.();
  }
  function stop() {
    if (closing) return;
    closing = true;
    for (const t of [startupTimer, startTimer, limitTimer]) clearTimeout(t);
    clearGreeting();
    if (gateway?.readyState === 1) {
      execution.waitUntil(
        new Promise<void>((resolve) => {
          finishDrain = resolve;
        }),
      );
      closeTimer = setTimeout(finish, 15_000);
      try {
        gateway.send(JSON.stringify({ type: "session.close" }));
      } catch {
        finish();
      }
    } else finish();
  }

  function receiveGateway(data: unknown) {
    try {
      if (typeof data !== "string" || data.length > 1024 * 1024)
        throw new Error("Invalid voice event");
      const event: ProviderEvent = JSON.parse(data);
      if (browser.readyState === 1) browser.send(data);
      if (event.type === "session.closed") return finish();
      if (
        event.type === "gateway.session.closing" ||
        event.type === "gateway.error" ||
        event.type === "app.error"
      )
        return stop();
      if (closing) return;
      if (event.type === "gateway.session.created" && !reachedProvider) {
        sessionID = event.session?.id;
        reachedProvider = true;
        clearTimeout(startupTimer);
        // Server-side hard stop: the browser cannot extend a paid call past the limit.
        limitTimer = setTimeout(() => {
          emit({ type: "app.limit", seconds: limitSeconds });
          stop();
        }, limitSeconds * 1000);
        requestGreeting();
      }
      if (
        greetingCommand &&
        event.type === `session.${greetingCommand.type}.appended` &&
        event.client_event_id === greetingCommand.id
      ) {
        if (greetingCommand.type === "instructions") {
          greetingCommand = { id: crypto.randomUUID(), type: "commentary" };
          gateway?.send(
            JSON.stringify({
              type: "session.commentary.append",
              event_id: greetingCommand.id,
              delegation_id: null,
              content: "Pick up the call now, following the instructions provided.",
            }),
          );
        } else {
          clearGreeting();
          emit({ type: "app.greeting.accepted" });
        }
      } else if (
        greetingCommand &&
        event.type === "error" &&
        event.error?.client_event_id === greetingCommand.id
      ) {
        clearGreeting();
        emit({ type: "app.greeting.error", error: { message: "The pickup was rejected" } });
      }
      if (event.type === "session.delegation.created") {
        // No backend tools exist; answer any handoff without extra model calls or data.
        const id = event.delegation?.id;
        if (id && event.delegation?.target === "client" && !delegations.has(id)) {
          delegations.add(id);
          gateway?.send(
            JSON.stringify({
              type: "session.commentary.append",
              event_id: crypto.randomUUID(),
              delegation_id: id,
              content:
                "No lookup is available. Continue the call naturally from what was already said.",
            }),
          );
        }
      }
    } catch {
      emit({ type: "app.error", error: { message: "Invalid voice event or lost connection" } });
      stop();
    }
  }

  async function startSession(token: string, rawContext: unknown, sdp: string) {
    const parsed = callContextSchema.safeParse(rawContext);
    if (!parsed.success) throw new Error("Review the call setup and confirm consent.");
    call = parsed.data;
    let slot: { id: string } | { error: string };
    if (token === "" && deps.reserveGuest && deps.releaseGuest) {
      if (!clientKey?.trim())
        throw new Error("Demo network limits could not be checked. Try again later.");
      // Only the server's trusted IP is hashed; no browser-supplied identity or fingerprint.
      guest = true;
      limitSeconds = Math.min(deps.guestLimitSeconds ?? 120, deps.limitSeconds);
      slot = await deps.reserveGuest(await hashClient(clientKey));
    } else {
      const user = token ? await deps.authenticate(token) : null;
      if (!user) throw new Error("Sign in with a verified account to start a live call.");
      if (closing || browser.readyState !== 1) return;
      slot = await deps.reserve(user.userId);
    }
    if ("error" in slot) throw new Error(slot.error);
    reservation = slot.id;
    if (closing || browser.readyState !== 1) return releaseReservation();
    startupTimer = setTimeout(() => {
      emit({ type: "app.error", error: { message: "Voice startup timed out" } });
      stop();
    }, 40_000);
    const accepted = await connect(
      new URL(`${gatewayAPIBase(config.baseURL)}/live/sessions`).href,
      {
        "Lovable-API-Key": config.key,
        "X-Lovable-AIG-SDK": "fetch",
        "X-Lovable-AIG-Run-ID": runID,
      },
      setupAbort.signal,
    );
    if (closing || browser.readyState !== 1) {
      close(accepted);
      return;
    }
    gateway = accepted;
    gateway.onMessage(receiveGateway);
    gateway.onClose(finish);
    gateway.onError(() => {
      emit({ type: "app.error", error: { message: "Voice service connection failed" } });
      stop();
    });
    gateway.send(
      JSON.stringify({
        type: "session.start",
        session: {
          model: config.liveModel,
          instructions: buildCallInstructions(call),
          audio: { output: { voice: call.voice } },
          delegation: { type: "client" },
        },
        transport: { type: "webrtc", sdp },
      }),
    );
  }

  browser.onMessage((data) => {
    try {
      if (typeof data !== "string" || data.length > 64 * 1024)
        throw new Error("Invalid client message");
      const event = JSON.parse(data) as Record<string, unknown>;
      if (event["type"] === "session.close") return stop();
      if (closing) return;
      if (!gateway) {
        if (
          starting ||
          event["type"] !== "app.start" ||
          typeof event["sdp"] !== "string" ||
          !event["sdp"].trim() ||
          typeof event["token"] !== "string"
        )
          throw new Error("Voice startup message required");
        starting = true;
        clearTimeout(startTimer);
        execution.waitUntil(
          startSession(event["token"], event["context"], event["sdp"]).catch((error) => {
            if (!closing)
              emit({
                type: "app.error",
                error: { message: error instanceof Error ? error.message : "Voice startup failed" },
              });
            stop();
          }),
        );
        return;
      }
      if (event["type"] === "app.ready") {
        browserReady = true;
        requestGreeting();
        return;
      }
      if (event["type"] !== "gateway.heartbeat") throw new Error("Unsupported client event");
      if (gateway.readyState !== 1) return stop();
      gateway.send(data);
    } catch {
      emit({
        type: "app.error",
        error: { message: "Voice connection could not be started or continued" },
      });
      stop();
    }
  });
  browser.onClose(stop);
  browser.onError(stop);
}
