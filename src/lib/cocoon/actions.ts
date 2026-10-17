import { profileById, PROFILES } from "./seed";
import {
  DEFAULT_SOS_PREFERENCES,
  selectedSosGuardians,
  sosPreferencesSchema,
  type SosPreferences,
} from "./sos-policy";
import {
  CIRCLE_TOPICS,
  CIRCLE_NEEDS,
  circleReviewHints,
  type CirclePost,
  type CircleReportReason,
} from "./circle";
import { getState, now, setState, uid, setTabRole } from "./store";
import type {
  DemoState,
  GuardianNotification,
  Incident,
  IncidentRecipient,
  IncidentStatus,
  LatLng,
  NotificationType,
  RecipientStatus,
  ReportCategory,
  Role,
  SourceType,
  Trip,
} from "./types";
import type { RouteOption } from "./routing";
import { pointAt } from "./routing";
import { validPoint } from "./geometry";

/* ---------------- roles ---------------- */
export const setRole = (role: Role) => setTabRole(role);

/* ---------------- guardians ---------------- */
export function inviteGuardian(guardianId: string, relation: string) {
  setState((s) => {
    if (s.role !== "traveller") return s;
    if (
      s.contacts.some(
        (c) =>
          c.travellerId === s.actorIds.traveller &&
          c.guardianId === guardianId &&
          c.status !== "revoked",
      )
    )
      return s;
    return {
      ...s,
      contacts: [
        ...s.contacts,
        {
          id: uid("c"),
          travellerId: s.actorIds.traveller,
          guardianId,
          relation,
          status: "invited",
          invitedAt: now(),
        },
      ],
    };
  });
}
export function respondInvite(contactId: string, accept: boolean) {
  setState((s) => {
    if (s.role !== "guardian") return s;
    const c = s.contacts.find((x) => x.id === contactId);
    if (!c || c.guardianId !== s.actorIds.guardian || c.status !== "invited") return s;
    return {
      ...s,
      contacts: s.contacts.map((x) =>
        x.id === contactId
          ? {
              ...x,
              status: accept ? "accepted" : "revoked",
              acceptedAt: accept ? now() : undefined,
            }
          : x,
      ),
    };
  });
}

/* ---------------- notifications (simulated delivery) ---------------- */
function pushNotification(
  s: DemoState,
  trip: Trip,
  type: NotificationType,
  summary: string,
): DemoState {
  if (!trip.guardianId || trip.sharing !== "active") return s;
  const fail = s.failNextGuardianDelivery;
  const n: GuardianNotification = {
    id: uid("n"),
    tripId: trip.id,
    guardianId: trip.guardianId,
    type,
    summary,
    createdAt: now(),
    delivery: fail ? "failed" : "delivered",
    deliveredAt: fail ? undefined : now(),
    simulated: true,
  };
  return { ...s, failNextGuardianDelivery: false, notifications: [n, ...s.notifications] };
}
export function ackNotification(id: string) {
  setState((s) => {
    if (s.role !== "guardian") return s;
    const n = s.notifications.find((x) => x.id === id);
    if (
      !n ||
      n.guardianId !== s.actorIds.guardian ||
      n.delivery !== "delivered" ||
      n.acknowledgedAt
    )
      return s;
    return {
      ...s,
      notifications: s.notifications.map((x) =>
        x.id === id ? { ...x, acknowledgedAt: now() } : x,
      ),
    };
  });
}
export function retryNotification(id: string) {
  setState((s) => {
    const note = s.notifications.find((n) => n.id === id);
    const trip = note ? s.trips.find((t) => t.id === note.tripId) : null;
    if (
      !note ||
      !(
        (s.role === "guardian" && note.guardianId === s.actorIds.guardian) ||
        (s.role === "traveller" && trip?.travellerId === s.actorIds.traveller)
      )
    )
      return s;
    return {
      ...s,
      notifications: s.notifications.map((x) =>
        x.id === id && x.delivery === "failed"
          ? { ...x, delivery: "delivered", deliveredAt: now() }
          : x,
      ),
    };
  });
}
export const setFailNext = (v: boolean) => setState((s) => ({ ...s, failNextGuardianDelivery: v }));

/* ---------------- trips ---------------- */
export function startTrip(
  route: RouteOption,
  destination: string,
  guardianId: string | null,
  locationMode: Trip["locationMode"],
) {
  if (
    route.path.length < 2 ||
    !route.path.every(validPoint) ||
    !Number.isFinite(route.minutes) ||
    route.minutes < 0
  )
    throw new Error("A valid route is required to start a journey.");
  setState((s) => {
    if (s.role !== "traveller") return s;
    if (s.trips.some((t) => t.travellerId === s.actorIds.traveller && t.status === "active"))
      return s;
    const accepted =
      guardianId &&
      s.contacts.some(
        (c) =>
          c.travellerId === s.actorIds.traveller &&
          c.guardianId === guardianId &&
          c.status === "accepted",
      );
    const trip: Trip = {
      id: uid("t"),
      travellerId: s.actorIds.traveller,
      guardianId: accepted ? guardianId : null,
      destination,
      routeId: route.id,
      routeKind: route.kind,
      routeProvider: route.provider,
      routeDistanceKm: route.distanceKm,
      routeSteps: route.steps,
      path: route.path,
      etaMinutes: route.minutes,
      totalMinutes: route.minutes,
      startedAt: now(),
      status: "active",
      sharing: accepted ? "active" : "stopped",
      locationMode,
      progress: 0,
      lastLocation: route.path[0]!,
      lastLocationAt: now(),
      lastCheckInAt: now(),
    };
    let next: DemoState = { ...s, trips: [trip, ...s.trips], chat: [] };
    next = pushNotification(
      next,
      trip,
      "trip_started",
      `Trip started to ${destination}. ETA ${route.minutes} min via ${route.label} route.`,
    );
    return next;
  });
}
function patchTrip(s: DemoState, id: string, p: Partial<Trip>): DemoState {
  return { ...s, trips: s.trips.map((t) => (t.id === id ? { ...t, ...p } : t)) };
}
export function advanceTrip(step = 0.12) {
  setState((s) => {
    if (s.role !== "traveller" || !Number.isFinite(step) || step < 0) return s;
    const t = s.trips.find((x) => x.travellerId === s.actorIds.traveller && x.status === "active");
    if (!t) return s;
    const progress = Math.min(1, t.progress + step);
    const total =
      t.totalMinutes ?? Math.max(t.etaMinutes, Math.round(t.etaMinutes / (1 - t.progress || 1)));
    const remaining = Math.max(1, Math.round(total * (1 - progress)));
    return patchTrip(s, t.id, {
      progress,
      lastLocation: pointAt(t.path, progress),
      lastLocationAt: now(),
      etaMinutes: progress >= 1 ? 0 : remaining,
      totalMinutes: total,
    });
  });
}
export type UpdateResult = "delivered" | "failed" | "not-shared" | "no-trip" | "forbidden";
export function updateResultText(result: UpdateResult) {
  return result === "delivered"
    ? "Guardian update delivered (simulated)"
    : result === "failed"
      ? "Update saved, but simulated delivery failed. Retry in Guardian updates."
      : result === "not-shared"
        ? "Saved to your trip. Sharing is off, so no guardian update was sent."
        : result === "no-trip"
          ? "No active journey. Start one to log trip updates."
          : "This action is only available to the traveller.";
}
export function checkIn(): UpdateResult {
  let result: UpdateResult = "forbidden";
  setState((s) => {
    if (s.role !== "traveller") return s;
    const t = s.trips.find((x) => x.travellerId === s.actorIds.traveller && x.status === "active");
    if (!t) {
      result = "no-trip";
      return s;
    }
    const next = pushNotification(
      patchTrip(s, t.id, { lastCheckInAt: now(), checkInMissed: false }),
      t,
      "check_in",
      "Checked in: doing okay.",
    );
    result =
      next.notifications.length > s.notifications.length
        ? next.notifications[0]!.delivery === "failed"
          ? "failed"
          : "delivered"
        : "not-shared";
    return next;
  });
  return result;
}
/** Stop sharing immediately without finishing the traveller's own journey. */
export function stopTripSharing() {
  setState((s) => {
    if (s.role !== "traveller") return s;
    const t = s.trips.find((x) => x.travellerId === s.actorIds.traveller && x.status === "active");
    return t ? patchTrip(s, t.id, { sharing: "stopped" }) : s;
  });
}
export function resumeTripSharing() {
  setState((s) => {
    if (s.role !== "traveller") return s;
    const t = s.trips.find((x) => x.travellerId === s.actorIds.traveller && x.status === "active");
    if (
      !t ||
      !t.guardianId ||
      !s.contacts.some(
        (c) =>
          c.travellerId === t.travellerId &&
          c.guardianId === t.guardianId &&
          c.status === "accepted",
      )
    )
      return s;
    return patchTrip(s, t.id, { sharing: "active" });
  });
}
export function simulateMissedCheckIn() {
  setState((s) => {
    if (s.role !== "traveller") return s;
    const t = s.trips.find((x) => x.travellerId === s.actorIds.traveller && x.status === "active");
    if (!t) return s;
    return pushNotification(
      patchTrip(s, t.id, { checkInMissed: true }),
      t,
      "check_in_missed",
      "A scheduled check-in was missed. This does not by itself mean something is wrong — consider calling.",
    );
  });
}
export function sendConcern(note: string): UpdateResult {
  let result: UpdateResult = "forbidden";
  setState((s) => {
    if (s.role !== "traveller") return s;
    const t = s.trips.find((x) => x.travellerId === s.actorIds.traveller && x.status === "active");
    if (!t) {
      result = "no-trip";
      return s;
    }
    const next = pushNotification(
      s,
      t,
      "user_concern",
      `Reported feeling uncomfortable${note.trim() ? `: “${note.trim().slice(0, 140)}”` : ""}. Near ${t.destination} route, ETA ${t.etaMinutes} min.`,
    );
    result =
      next.notifications.length > s.notifications.length
        ? next.notifications[0]!.delivery === "failed"
          ? "failed"
          : "delivered"
        : "not-shared";
    return next;
  });
  return result;
}
export function endTrip() {
  setState((s) => {
    if (s.role !== "traveller") return s;
    const t = s.trips.find((x) => x.travellerId === s.actorIds.traveller && x.status === "active");
    if (!t) return s;
    let next = pushNotification(
      s,
      t,
      "trip_completed",
      `Arrived at ${t.destination}. Trip sharing has stopped.`,
    );
    next = patchTrip(next, t.id, {
      status: "completed",
      sharing: "stopped",
      endedAt: now(),
      progress: 1,
    });
    return next;
  });
}

/* ---------------- reports ---------------- */
export function submitReport(input: {
  category: ReportCategory;
  description: string;
  location: LatLng;
  locationLabel: string;
  eventDate?: string | undefined;
  sourceType: Exclude<SourceType, "external_source">;
}) {
  const d = input.description.trim();
  if (d.length < 10 || d.length > 600) throw new Error("Description must be 10–600 characters.");
  if (!validPoint(input.location)) throw new Error("Choose a valid approximate map location.");
  if (!input.locationLabel.trim() || input.locationLabel.length > 120)
    throw new Error("Place description must be 1–120 characters.");
  if (
    input.eventDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) ||
      Number.isNaN(Date.parse(input.eventDate)) ||
      new Date(input.eventDate).toISOString().slice(0, 10) !== input.eventDate ||
      input.eventDate > new Date().toISOString().slice(0, 10))
  )
    throw new Error("Event date must be a valid date, today or earlier.");
  setState((s) => ({
    ...s,
    reports: [
      {
        id: uid("r"),
        ...input,
        description: d,
        submittedAt: now(),
        verification: "unverified",
        moderation: "visible",
        flags: 0,
        flaggedBy: [],
        reporterId: s.actorIds[s.role],
        demo: true,
      },
      ...s.reports,
    ],
  }));
}
export function flagReport(id: string) {
  setState((s) => {
    const me = s.actorIds[s.role];
    return {
      ...s,
      reports: s.reports.map((r) =>
        r.id === id && !r.flaggedBy.includes(me)
          ? { ...r, flags: r.flags + 1, flaggedBy: [...r.flaggedBy, me] }
          : r,
      ),
    };
  });
}
export function moderateReport(id: string, moderation: "visible" | "hidden") {
  setState((s) =>
    s.role !== "moderator"
      ? s
      : { ...s, reports: s.reports.map((r) => (r.id === id ? { ...r, moderation } : r)) },
  );
}

/* ---------------- incidents: single source of truth with validated transitions ---------------- */
export const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  requested: ["notification_pending", "resolved", "cancelled"],
  notification_pending: ["notified", "resolved", "cancelled"],
  notified: ["acknowledged", "resolved", "cancelled"],
  acknowledged: ["assistance_in_progress", "resolved", "cancelled"],
  assistance_in_progress: ["resolved", "cancelled"],
  resolved: [],
  cancelled: [],
};
export function canTransition(from: IncidentStatus, to: IncidentStatus) {
  return TRANSITIONS[from].includes(to);
}
function transition(
  s: DemoState,
  id: string,
  to: IncidentStatus,
  actorName: string,
  text: string,
): DemoState {
  return {
    ...s,
    incidents: s.incidents.map((i) => {
      if (i.id !== id) return i;
      if (i.status === to)
        return {
          ...i,
          updatedAt: now(),
          events: [...i.events, { at: now(), actor: actorName, text }],
        };
      if (!canTransition(i.status, to)) return i;
      return {
        ...i,
        status: to,
        updatedAt: now(),
        events: [...i.events, { at: now(), actor: actorName, text }],
      };
    }),
  };
}
function logEvent(s: DemoState, id: string, actorName: string, text: string): DemoState {
  return {
    ...s,
    incidents: s.incidents.map((i) =>
      i.id === id
        ? { ...i, updatedAt: now(), events: [...i.events, { at: now(), actor: actorName, text }] }
        : i,
    ),
  };
}
function deliver(s: DemoState, incidentId: string, recips: IncidentRecipient[]): DemoState {
  let next = { ...s, recipients: [...s.recipients, ...recips.map((r) => ({ ...r }))] };
  const failGuardian = next.failNextGuardianDelivery;
  let anyDelivered = false;
  const logs: string[] = [];
  const mapped = next.recipients.map((r) => {
    if (r.incidentId !== incidentId || r.status !== "pending" || !recips.some((x) => x.id === r.id))
      return r;
    const failed = r.kind === "guardian" && failGuardian;
    if (!failed) anyDelivered = true;
    logs.push(
      `${failed ? "Delivery FAILED" : "Delivered (simulated)"} to ${profileById(r.profileId)?.name} (${r.kind}).`,
    );
    return {
      ...r,
      status: failed ? "failed" : "delivered",
      deliveredAt: failed ? undefined : now(),
    } as IncidentRecipient;
  });
  next = { ...next, recipients: mapped };
  for (const l of logs) next = logEvent(next, incidentId, "Demo notifier", l);
  if (failGuardian) next.failNextGuardianDelivery = false;
  if (anyDelivered)
    next = transition(
      next,
      incidentId,
      "notified",
      "System",
      "At least one recipient received the alert.",
    );
  return next;
}

export function saveSosPreferences(input: SosPreferences) {
  const parsed = sosPreferencesSchema.parse(input);
  setState((s) => {
    if (s.role !== "traveller") throw new Error("Only the traveller can change SOS recipients.");
    return {
      ...s,
      sosPreferences: {
        ...s.sosPreferences,
        [s.actorIds.traveller]: {
          ...parsed,
          guardianIds:
            parsed.guardianIds === null ? null : selectedSosGuardians(s, parsed.guardianIds),
        },
      },
    };
  });
}

export function requestSOS(opts: {
  authoriseResponders: boolean;
  locationLabel?: string;
  guardianIds?: string[] | null;
  note?: string;
}) {
  setState((s) => {
    if (s.role !== "traveller") return s;
    const me = s.actorIds.traveller;
    if (
      s.incidents.some((i) => i.travellerId === me && !["resolved", "cancelled"].includes(i.status))
    )
      return s;
    const trip = s.trips.find((t) => t.travellerId === me && t.status === "active") ?? null;
    const prefs = s.sosPreferences[me] ?? DEFAULT_SOS_PREFERENCES;
    const inc: Incident = {
      id: uid("inc"),
      tripId: trip?.id ?? null,
      travellerId: me,
      status: "requested",
      note: opts.note?.trim().slice(0, 500) || "",
      locationSource: trip?.locationMode ?? "sample",
      locationAt: trip?.lastLocationAt,
      authorityRequested: prefs.authorities,
      nearbyRequested: prefs.nearby,
      location: trip?.lastLocation ?? [28.6905, 77.2072],
      locationLabel:
        opts.locationLabel ||
        (trip ? `En route to ${trip.destination}` : "Sample location: North Campus, Delhi (demo)"),
      responderEscalationAuthorised: opts.authoriseResponders,
      createdAt: now(),
      updatedAt: now(),
      events: [{ at: now(), actor: "Ananya (traveller)", text: "SOS confirmed by traveller." }],
    };
    let next: DemoState = { ...s, incidents: [inc, ...s.incidents] };
    next = transition(
      next,
      inc.id,
      "notification_pending",
      "System",
      "Preparing demo notifications.",
    );
    const guardianIds = selectedSosGuardians(
      s,
      opts.guardianIds === undefined ? prefs.guardianIds : opts.guardianIds,
    );
    const recips: IncidentRecipient[] = [];
    for (const guardianId of guardianIds)
      recips.push({
        id: uid("rc"),
        incidentId: inc.id,
        profileId: guardianId,
        kind: "guardian",
        status: "pending",
      });
    if (opts.authoriseResponders)
      recips.push(
        ...eligibleResponders().map((p) => ({
          id: uid("rc"),
          incidentId: inc.id,
          profileId: p.id,
          kind: "responder" as const,
          status: "pending" as const,
        })),
      );
    if (trip && trip.guardianId && guardianIds.includes(trip.guardianId))
      next = pushNotification(
        { ...next, failNextGuardianDelivery: false },
        trip,
        "sos_confirmed",
        `SOS confirmed by traveller at ${inc.locationLabel}.`,
      );
    next.failNextGuardianDelivery = s.failNextGuardianDelivery;
    next = deliver(next, inc.id, recips);
    if (prefs.authorities)
      next = logEvent(
        next,
        inc.id,
        "Delivery unavailable",
        "Authority dispatch is not connected. No authority was contacted. Use the emergency dialler.",
      );
    if (prefs.nearby)
      next = logEvent(
        next,
        inc.id,
        "Delivery unavailable",
        "Nearby authenticated-user alerts are not connected. No nearby user was contacted.",
      );
    if (!recips.length)
      next = logEvent(
        next,
        inc.id,
        "System",
        "No accepted guardian or authorised responders — incident remains unresolved.",
      );
    return next;
  });
}
export const eligibleResponders = () =>
  PROFILES.filter(
    (p) =>
      p.role === "responder" &&
      p.identity === "demo_verified" &&
      p.responderEligible &&
      p.responderOptedIn &&
      p.responderAvailable,
  );

export function escalateToResponders() {
  setState((s) => {
    if (s.role !== "traveller") return s;
    const inc = s.incidents.find(
      (i) =>
        i.travellerId === s.actorIds.traveller && !["resolved", "cancelled"].includes(i.status),
    );
    if (!inc) return s;
    const existing = new Set(
      s.recipients.filter((r) => r.incidentId === inc.id).map((r) => r.profileId),
    );
    const recips = eligibleResponders()
      .filter((p) => !existing.has(p.id))
      .map((p) => ({
        id: uid("rc"),
        incidentId: inc.id,
        profileId: p.id,
        kind: "responder" as const,
        status: "pending" as const,
      }));
    let next: DemoState = {
      ...s,
      incidents: s.incidents.map((i) =>
        i.id === inc.id ? { ...i, responderEscalationAuthorised: true } : i,
      ),
    };
    next = logEvent(
      next,
      inc.id,
      "Ananya (traveller)",
      "Authorised escalation to participating responders.",
    );
    return deliver(next, inc.id, recips);
  });
}

export function recipientRespond(
  incidentId: string,
  role: "guardian" | "responder",
  response: Extract<RecipientStatus, "acknowledged" | "accepted" | "declined">,
) {
  setState((s) => {
    if (s.role !== role) return s;
    const me = s.actorIds[role];
    const rc = s.recipients.find((r) => r.incidentId === incidentId && r.profileId === me);
    const inc = s.incidents.find((i) => i.id === incidentId);
    if (!rc || rc.kind !== role || !inc || ["resolved", "cancelled"].includes(inc.status)) return s;
    if (!["delivered", "acknowledged", "no_response"].includes(rc.status)) return s; // must have been delivered
    const name = `${profileById(me)?.name} (${role})`;
    let next: DemoState = {
      ...s,
      recipients: s.recipients.map((r) =>
        r.id === rc.id ? { ...r, status: response, respondedAt: now() } : r,
      ),
    };
    if (response === "declined") return logEvent(next, incidentId, name, "Declined the request.");
    next = transition(
      next,
      incidentId,
      "acknowledged",
      name,
      response === "accepted" ? "Accepted and is responding." : "Acknowledged the alert.",
    );
    if (role === "responder") {
      const trip = next.trips.find((t) => t.id === inc.tripId);
      if (
        trip &&
        next.recipients.some(
          (r) =>
            r.incidentId === inc.id && r.kind === "guardian" && r.profileId === trip.guardianId,
        )
      )
        next = pushNotification(
          next,
          trip,
          "responder_ack",
          `${profileById(me)?.name} (participating responder) ${response} the SOS.`,
        );
    }
    return next;
  });
}
export function responderAssist(incidentId: string) {
  setState((s) => {
    if (s.role !== "responder") return s;
    const me = s.actorIds.responder;
    const rc = s.recipients.find(
      (r) => r.incidentId === incidentId && r.profileId === me && r.status === "accepted",
    );
    if (!rc) return s;
    return transition(
      s,
      incidentId,
      "assistance_in_progress",
      `${profileById(me)?.name} (responder)`,
      "Assistance in progress (demo).",
    );
  });
}
export function markNoResponse(incidentId: string) {
  setState((s) => {
    if (
      s.role !== "traveller" ||
      !s.incidents.some(
        (i) =>
          i.id === incidentId &&
          i.travellerId === s.actorIds.traveller &&
          !["resolved", "cancelled"].includes(i.status),
      )
    )
      return s;
    let changed = false;
    const recipients = s.recipients.map((r) => {
      if (r.incidentId === incidentId && r.status === "delivered") {
        changed = true;
        return { ...r, status: "no_response" as const };
      }
      return r;
    });
    if (!changed) return s;
    return logEvent(
      { ...s, recipients },
      incidentId,
      "System",
      "Simulated timeout: delivered recipients have not responded. Incident remains open.",
    );
  });
}
export function retryFailed(incidentId: string) {
  setState((s) => {
    if (
      s.role !== "traveller" ||
      !s.incidents.some(
        (i) =>
          i.id === incidentId &&
          i.travellerId === s.actorIds.traveller &&
          !["resolved", "cancelled"].includes(i.status),
      )
    )
      return s;
    const failed = s.recipients.filter(
      (r) =>
        r.incidentId === incidentId &&
        r.status === "failed" &&
        (r.kind === "guardian"
          ? s.contacts.some(
              (c) =>
                c.travellerId === s.actorIds.traveller &&
                c.guardianId === r.profileId &&
                c.status === "accepted",
            )
          : eligibleResponders().some((p) => p.id === r.profileId)),
    );
    if (!failed.length)
      return logEvent(
        s,
        incidentId,
        "System",
        "Retry blocked: no failed recipients currently have accepted consent and eligibility. No notification sent.",
      );
    const rest = {
      ...s,
      recipients: s.recipients.filter((r) => !failed.some((f) => f.id === r.id)),
    };
    return deliver(
      logEvent(rest, incidentId, "System", "Retrying failed deliveries."),
      incidentId,
      failed.map((f) => ({ ...f, status: "pending" })),
    );
  });
}
export function closeIncident(incidentId: string, to: "resolved" | "cancelled", note: string) {
  setState((s) => {
    const inc = s.incidents.find((i) => i.id === incidentId);
    if (s.role !== "traveller" || !inc || inc.travellerId !== s.actorIds.traveller) return s;
    return transition(s, incidentId, to, "Ananya (traveller)", note);
  });
}

export const getSnapshot = getState;

export function joinCircle(confirmedAdultAndGuidelines: boolean) {
  const s = getState();
  if (s.role !== "traveller" || !confirmedAdultAndGuidelines) return false;
  setState((state) => ({
    ...state,
    circle: {
      ...state.circle,
      joined: [...new Set([...state.circle.joined, state.actorIds.traveller])],
    },
  }));
  return true;
}

/** Reader bookmarks only; never changes publication or visibility. */
export function toggleCircleSave(postId: string) {
  const s = getState();
  if (s.role !== "traveller") throw new Error("Use the Traveller role to save conversations.");
  const viewer = s.actorIds.traveller;
  const post = s.circle.posts.find((p) => p.id === postId && p.status === "approved");
  if (!post || s.circle.muted[viewer]?.includes(post.authorId))
    throw new Error("This conversation is no longer available.");
  setState((state) => {
    const saved = state.circle.saved[viewer] ?? [];
    return {
      ...state,
      circle: {
        ...state.circle,
        saved: {
          ...state.circle.saved,
          [viewer]: saved.includes(postId)
            ? saved.filter((id) => id !== postId)
            : [...saved, postId],
        },
      },
    };
  });
}
function circleWriter() {
  const s = getState();
  if (s.role !== "traveller" || !s.circle.joined.includes(s.actorIds.traveller))
    throw new Error("Join the local adult community demo before contributing.");
  return s.actorIds.traveller;
}
function circleText(body: string) {
  const value = body.trim();
  if (value.length < 8 || value.length > 1500)
    throw new Error("Write between 8 and 1,500 characters.");
  if (circleReviewHints(value).some((hint) => hint.startsWith("Possible contact")))
    throw new Error(
      "Please remove phone numbers and email addresses. Keep identifying details out of the Circle.",
    );
  return value;
}
export function submitCirclePost(
  input: Pick<CirclePost, "title" | "body" | "topic" | "need" | "sensitive">,
  editId?: string,
) {
  const authorId = circleWriter();
  const body = circleText(input.body);
  const title = input.title.trim();
  if (
    title.length < 8 ||
    title.length > 100 ||
    !Object.hasOwn(CIRCLE_TOPICS, input.topic) ||
    !Object.hasOwn(CIRCLE_NEEDS, input.need)
  )
    throw new Error("Choose a topic and support preference, and a title of 8–100 characters.");
  circleText(title);
  const existing = editId ? getState().circle.posts.find((p) => p.id === editId) : null;
  if (editId && (!existing || existing.authorId !== authorId))
    throw new Error("You can only edit your own post.");
  if (!editId && getState().circle.posts.filter((p) => p.authorId === authorId).length >= 50)
    throw new Error("This local demo has reached its post limit.");
  const post: CirclePost = {
    id: existing?.id ?? uid("circle"),
    authorId,
    title,
    body,
    topic: input.topic,
    need: input.need,
    sensitive: Boolean(input.sensitive),
    status: "pending",
    reviewNote: "Awaiting a human standards review in the demo moderator queue.",
    demo: false,
    createdAt: now(),
  };
  setState((s) => ({
    ...s,
    circle: {
      ...s.circle,
      posts: existing
        ? s.circle.posts.map((p) => (p.id === post.id ? post : p))
        : [post, ...s.circle.posts],
    },
  }));
  return post.id;
}
export function submitCircleReply(postId: string, text: string, editId?: string) {
  const authorId = circleWriter();
  const body = circleText(text);
  const s = getState();
  const existing = editId
    ? s.circle.replies.find(
        (r) => r.id === editId && r.authorId === authorId && r.postId === postId,
      )
    : null;
  if (editId && !existing) throw new Error("You can only edit your own reply.");
  const post = s.circle.posts.find((p) => p.id === postId && p.status === "approved");
  if (!post || s.circle.muted[authorId]?.includes(post.authorId))
    throw new Error("This conversation is not available for replies.");
  if (
    !editId &&
    s.circle.replies.filter((r) => r.authorId === authorId && r.status === "pending").length >= 20
  )
    throw new Error("Please wait for your pending replies to be reviewed.");
  const reply = {
    id: existing?.id ?? uid("circle-reply"),
    postId,
    authorId,
    body,
    status: "pending" as const,
    reviewNote: "Awaiting a human standards review.",
    demo: false,
    createdAt: now(),
  };
  setState((state) => ({
    ...state,
    circle: {
      ...state.circle,
      replies: existing
        ? state.circle.replies.map((r) => (r.id === reply.id ? reply : r))
        : [...state.circle.replies, reply],
    },
  }));
  return reply.id;
}
export function withdrawCircleMessage(id: string, restore = false) {
  const authorId = circleWriter();
  setState((s) => ({
    ...s,
    circle: {
      ...s.circle,
      posts: s.circle.posts.map((p) =>
        p.id === id && p.authorId === authorId
          ? {
              ...p,
              status: restore ? "pending" : "withdrawn",
              reviewNote: restore ? "Restored to the review queue." : "Withdrawn by you.",
            }
          : p,
      ),
      replies: s.circle.replies.map((r) =>
        r.id === id && r.authorId === authorId
          ? {
              ...r,
              status: restore ? "pending" : "withdrawn",
              reviewNote: restore ? "Restored to the review queue." : "Withdrawn by you.",
            }
          : r,
      ),
    },
  }));
}
export function reportCircleMessage(id: string, reason: CircleReportReason) {
  const reporterId = circleWriter();
  const s = getState();
  if (!["unkind", "rumor", "privacy", "medical", "other"].includes(reason)) return false;
  const target = [...s.circle.posts, ...s.circle.replies].find(
    (p) => p.id === id && p.status === "approved",
  );
  if (
    !target ||
    target.authorId === reporterId ||
    s.circle.reports.some((r) => r.targetId === id && r.reporterId === reporterId && !r.resolved)
  )
    return false;
  setState((state) => ({
    ...state,
    circle: {
      ...state.circle,
      reports: [
        ...state.circle.reports,
        {
          id: uid("circle-report"),
          targetId: id,
          reporterId,
          reason,
          createdAt: now(),
          resolved: false,
        },
      ],
      posts: state.circle.posts.map((p) =>
        p.id === id
          ? { ...p, status: "pending", reviewNote: "Returned to review after a community report." }
          : p,
      ),
      replies: state.circle.replies.map((r) =>
        r.id === id
          ? { ...r, status: "pending", reviewNote: "Returned to review after a community report." }
          : r,
      ),
    },
  }));
  return true;
}
export function muteCircleAuthor(authorId: string, undo = false) {
  const viewer = circleWriter();
  if (viewer === authorId) return;
  setState((s) => ({
    ...s,
    circle: {
      ...s.circle,
      muted: {
        ...s.circle.muted,
        [viewer]: undo
          ? (s.circle.muted[viewer] ?? []).filter((id) => id !== authorId)
          : [...new Set([...(s.circle.muted[viewer] ?? []), authorId])],
      },
    },
  }));
}
export function reviewCircleMessage(
  id: string,
  decision: "approved" | "changes",
  note: string,
  checks: { kindness: boolean; privacy: boolean; claims: boolean; care: boolean },
) {
  const s = getState();
  if (s.role !== "moderator") throw new Error("Only the demo moderator can review contributions.");
  const target = [...s.circle.posts, ...s.circle.replies].find((p) => p.id === id);
  if (!target || target.status === "withdrawn")
    throw new Error("This contribution is no longer available.");
  if (note.trim().length < 10 || note.length > 500)
    throw new Error("Add a specific review note of 10–500 characters.");
  if (
    decision === "approved" &&
    ![checks.kindness, checks.privacy, checks.claims, checks.care].every(Boolean)
  )
    throw new Error("Complete all four review checks before approval.");
  if (
    decision === "approved" &&
    circleReviewHints(target.body + " " + ("title" in target ? target.title : "")).some((hint) =>
      hint.startsWith("Possible contact"),
    )
  )
    throw new Error("Remove identifying contact information before approval.");
  if (
    decision === "approved" &&
    "postId" in target &&
    !s.circle.posts.some((p) => p.id === target.postId && p.status === "approved")
  )
    throw new Error("Review the parent conversation first.");
  setState((state) => ({
    ...state,
    circle: {
      ...state.circle,
      posts: state.circle.posts.map((p) =>
        p.id === id ? { ...p, status: decision, reviewNote: note.trim() } : p,
      ),
      replies: state.circle.replies.map((r) =>
        r.id === id ? { ...r, status: decision, reviewNote: note.trim() } : r,
      ),
      reports: state.circle.reports.map((r) => (r.targetId === id ? { ...r, resolved: true } : r)),
    },
  }));
}
