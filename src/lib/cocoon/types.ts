import type { CircleState } from "./circle";
import type { SosPreferences } from "./sos-policy";
export type Role = "traveller" | "guardian" | "responder" | "moderator";
export type LatLng = [number, number];

export interface Profile {
  id: string;
  name: string;
  role: Role;
  /** Identity status is independent of location permission, consent and responder eligibility. */
  identity: "demo_verified" | "unverified";
  responderEligible?: boolean | undefined;
  responderOptedIn?: boolean | undefined;
  responderAvailable?: boolean | undefined;
  area?: string | undefined;
}

export interface TrustedContact {
  id: string;
  travellerId: string;
  guardianId: string;
  relation: string;
  status: "invited" | "accepted" | "revoked";
  invitedAt: string;
  acceptedAt?: string | undefined;
}

export type SourceType = "firsthand_review" | "incident_report" | "external_source";
export type ReportCategory =
  | "poor_lighting"
  | "harassment"
  | "deserted_stretch"
  | "well_lit_busy"
  | "unsafe_transport"
  | "police_presence"
  | "other";

export interface SafetyReport {
  id: string;
  category: ReportCategory;
  description: string;
  location: LatLng;
  locationLabel: string;
  eventDate?: string | undefined;
  submittedAt: string;
  sourceType: SourceType;
  verification: "unverified" | "community_confirmed" | "source_attributed";
  moderation: "visible" | "hidden";
  flags: number;
  flaggedBy: string[];
  /** Private: never rendered in public views. */
  reporterId?: string | undefined;
  sourceName?: string | undefined;
  sourceUrl?: string | undefined;
  demo: boolean;
}

export interface Trip {
  id: string;
  travellerId: string;
  guardianId: string | null;
  destination: string;
  routeId: string;
  routeKind: RouteKind;
  routeProvider?: "seeded-demo" | "osm-foot" | undefined;
  routeDistanceKm?: number | undefined;
  routeSteps?: { instruction: string; distanceM: number; at: LatLng }[] | undefined;
  path: LatLng[];
  etaMinutes: number;
  totalMinutes?: number | undefined;
  startedAt: string;
  endedAt?: string | undefined;
  status: "active" | "completed";
  sharing: "active" | "stopped";
  locationMode: "simulated" | "gps" | "manual";
  progress: number; // 0..1 simulated
  lastLocation: LatLng;
  lastLocationAt: string;
  lastCheckInAt?: string | undefined;
  checkInMissed?: boolean | undefined;
}

export type NotificationType =
  | "trip_started"
  | "check_in"
  | "check_in_missed"
  | "user_concern"
  | "sos_confirmed"
  | "responder_ack"
  | "trip_completed";

export interface GuardianNotification {
  id: string;
  tripId: string;
  guardianId: string;
  type: NotificationType;
  summary: string;
  createdAt: string;
  delivery: "pending" | "delivered" | "failed";
  deliveredAt?: string | undefined;
  acknowledgedAt?: string | undefined;
  simulated: true;
}

export type IncidentStatus =
  | "requested"
  | "notification_pending"
  | "notified"
  | "acknowledged"
  | "assistance_in_progress"
  | "resolved"
  | "cancelled";

export interface IncidentEvent {
  at: string;
  actor: string;
  text: string;
}

export interface Incident {
  note?: string | undefined;
  locationSource?: "sample" | "simulated" | "gps" | "manual" | undefined;
  locationAt?: string | undefined;
  authorityRequested?: boolean | undefined;
  nearbyRequested?: boolean | undefined;
  id: string;
  tripId: string | null;
  travellerId: string;
  status: IncidentStatus;
  location: LatLng;
  locationLabel: string;
  responderEscalationAuthorised: boolean;
  createdAt: string;
  updatedAt: string;
  events: IncidentEvent[];
}

export type RecipientStatus =
  "pending" | "delivered" | "failed" | "acknowledged" | "accepted" | "declined" | "no_response";

export interface IncidentRecipient {
  id: string;
  incidentId: string;
  profileId: string;
  kind: "guardian" | "responder";
  status: RecipientStatus;
  deliveredAt?: string | undefined;
  respondedAt?: string | undefined;
}

export type RouteKind = "fastest" | "balanced" | "safety";

export interface CompanionSettings {
  name: string;
  voiceURI: string | null;
  style: "casual" | "protective" | "calm" | "playful";
  chattiness: 1 | 2 | 3;
  speak: boolean;
  memories: string[];
}

export interface ChatMessage {
  id: string;
  from: "user" | "companion" | "system";
  text: string;
  at: string;
  actions?: ("guardian_update" | "sos" | "check_in" | "share_eta")[] | undefined;
}

export interface DemoState {
  sosPreferences: Record<string, SosPreferences>;
  circle: CircleState;
  version: number;
  role: Role;
  actorIds: Record<Role, string>;
  failNextGuardianDelivery: boolean;
  contacts: TrustedContact[];
  reports: SafetyReport[];
  trips: Trip[];
  notifications: GuardianNotification[];
  incidents: Incident[];
  recipients: IncidentRecipient[];
  companion: CompanionSettings;
  chat: ChatMessage[];
}
