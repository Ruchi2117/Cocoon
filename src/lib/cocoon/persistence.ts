import { z } from "zod";
import { circleSchema, makeCircleSeed } from "./circle";
import type { DemoState } from "./types";
import { sosPreferencesSchema } from "./sos-policy";
const text = z.string();
const point = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]);
const record = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();
/** Validate saved data at the persistence boundary; malformed demo storage must not crash pages. */
const schema = record({
  version: z.literal(1),
  sosPreferences: z.record(sosPreferencesSchema).default({}),
  circle: circleSchema.default(makeCircleSeed),
  role: z.enum(["traveller", "guardian", "responder", "moderator"]),
  actorIds: z.object({ traveller: text, guardian: text, responder: text, moderator: text }),
  failNextGuardianDelivery: z.boolean(),
  contacts: z.array(
    record({
      id: text,
      travellerId: text,
      guardianId: text,
      relation: text,
      status: z.enum(["invited", "accepted", "revoked"]),
      invitedAt: text,
      acceptedAt: text.optional(),
    }),
  ),
  trips: z.array(
    record({
      id: text,
      travellerId: text,
      guardianId: text.nullable(),
      destination: text,
      routeId: text,
      routeKind: z.enum(["fastest", "balanced", "safety"]),
      routeProvider: z.enum(["seeded-demo", "osm-foot"]).optional(),
      routeDistanceKm: z.number().finite().nonnegative().optional(),
      routeSteps: z
        .array(
          z.object({ instruction: text, distanceM: z.number().finite().nonnegative(), at: point }),
        )
        .optional(),
      path: z.array(point).min(1),
      etaMinutes: z.number().nonnegative(),
      totalMinutes: z.number().finite().nonnegative().optional(),
      startedAt: text,
      endedAt: text.optional(),
      status: z.enum(["active", "completed"]),
      sharing: z.enum(["active", "stopped"]),
      locationMode: z.enum(["simulated", "gps", "manual"]),
      progress: z.number().min(0).max(1),
      lastLocation: point,
      lastLocationAt: text,
      lastCheckInAt: text.optional(),
      checkInMissed: z.boolean().optional(),
    }),
  ),
  reports: z.array(
    record({
      id: text,
      category: z.enum([
        "poor_lighting",
        "harassment",
        "deserted_stretch",
        "well_lit_busy",
        "unsafe_transport",
        "police_presence",
        "other",
      ]),
      description: text,
      location: point,
      locationLabel: text,
      submittedAt: text,
      eventDate: text.optional(),
      reporterId: text.optional(),
      sourceName: text.optional(),
      sourceUrl: z
        .string()
        .url()
        .refine((url) => /^https?:\/\//.test(url))
        .optional(),
      sourceType: z.enum(["firsthand_review", "incident_report", "external_source"]),
      verification: z.enum(["unverified", "community_confirmed", "source_attributed"]),
      moderation: z.enum(["visible", "hidden"]),
      flags: z.number().nonnegative(),
      flaggedBy: z.array(text),
      demo: z.boolean(),
    }),
  ),
  notifications: z.array(
    record({
      id: text,
      tripId: text,
      guardianId: text,
      type: z.enum([
        "trip_started",
        "check_in",
        "check_in_missed",
        "user_concern",
        "sos_confirmed",
        "responder_ack",
        "trip_completed",
      ]),
      summary: text,
      createdAt: text,
      delivery: z.enum(["pending", "delivered", "failed"]),
      simulated: z.literal(true),
      deliveredAt: text.optional(),
      acknowledgedAt: text.optional(),
    }),
  ),
  incidents: z.array(
    record({
      note: z.string().max(500).optional(),
      locationSource: z.enum(["sample", "simulated", "gps", "manual"]).optional(),
      locationAt: text.optional(),
      authorityRequested: z.boolean().optional(),
      nearbyRequested: z.boolean().optional(),
      id: text,
      tripId: text.nullable(),
      travellerId: text,
      status: z.enum([
        "requested",
        "notification_pending",
        "notified",
        "acknowledged",
        "assistance_in_progress",
        "resolved",
        "cancelled",
      ]),
      location: point,
      locationLabel: text,
      responderEscalationAuthorised: z.boolean(),
      createdAt: text,
      updatedAt: text,
      events: z.array(z.object({ at: text, actor: text, text })),
    }),
  ),
  recipients: z.array(
    record({
      id: text,
      incidentId: text,
      profileId: text,
      kind: z.enum(["guardian", "responder"]),
      status: z.enum([
        "pending",
        "delivered",
        "failed",
        "acknowledged",
        "accepted",
        "declined",
        "no_response",
      ]),
    }),
  ),
  companion: record({
    name: text,
    voiceURI: text.nullable(),
    style: z.enum(["casual", "protective", "calm", "playful"]),
    chattiness: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    speak: z.boolean(),
    memories: z.array(text),
  }),
  chat: z.array(
    record({
      id: text,
      from: z.enum(["user", "companion", "system"]),
      text,
      at: text,
      actions: z.array(z.enum(["guardian_update", "sos", "check_in", "share_eta"])).optional(),
    }),
  ),
});
export function parseSavedDemo(value: unknown): DemoState | null {
  const result = schema.safeParse(value);
  if (!result.success) return null;
  return { ...result.data, chat: result.data.chat.slice(-100) } as unknown as DemoState;
}
