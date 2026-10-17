import type { DemoState, Incident, Role, SafetyReport, Trip } from "./types";

/**
 * Role-based access rules for the local demo adapter. Every view reads through these
 * selectors, which stand in for database row-level policies. (With a real backend these
 * must be enforced server-side; client checks alone are not authorisation.)
 */
export function actor(s: DemoState, role: Role = s.role) {
  return s.actorIds[role];
}

export function publicReports(s: DemoState, role: Role): Omit<SafetyReport, "reporterId">[] {
  return s.reports
    .filter((r) => role === "moderator" || r.moderation === "visible")
    .map(({ reporterId: _hidden, ...rest }) => rest);
}

export function tripsVisibleTo(s: DemoState, role: Role): Trip[] {
  const me = actor(s, role);
  if (role === "traveller") return s.trips.filter((t) => t.travellerId === me);
  if (role === "guardian") {
    const authorised = new Set(
      s.contacts
        .filter((c) => c.guardianId === me && c.status === "accepted")
        .map((c) => c.travellerId),
    );
    return s.trips.filter(
      (t) => t.guardianId === me && authorised.has(t.travellerId) && t.sharing === "active",
    );
  }
  return []; // responders & moderators never see trips
}

export function incidentsVisibleTo(s: DemoState, role: Role): Incident[] {
  const me = actor(s, role);
  if (role === "traveller") return s.incidents.filter((i) => i.travellerId === me);
  if (role === "guardian" || role === "responder") {
    const ids = new Set(s.recipients.filter((r) => r.profileId === me).map((r) => r.incidentId));
    return s.incidents.filter((i) => ids.has(i.id));
  }
  return [];
}

export function notificationsFor(s: DemoState, role: Role) {
  if (role !== "guardian") return [];
  const me = actor(s, role);
  return s.notifications.filter((n) => n.guardianId === me);
}

export function activeTrip(s: DemoState) {
  const me = s.actorIds.traveller;
  return s.trips.find((t) => t.travellerId === me && t.status === "active") ?? null;
}

export function openIncident(s: DemoState) {
  const me = s.actorIds.traveller;
  return (
    s.incidents.find(
      (i) => i.travellerId === me && !["resolved", "cancelled"].includes(i.status),
    ) ?? null
  );
}
