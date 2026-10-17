import type { Incident } from "@/lib/cocoon/types";
export function IncidentRequestDetails({ incident }: { incident: Incident }) {
  const age = incident.locationAt
    ? (Date.now() - Date.parse(incident.locationAt)) / 60000
    : Infinity;
  return (
    <div className="mt-3 rounded-xl border p-3 text-sm">
      <strong>Help request · simulated delivery</strong>
      <p className="mt-2">{incident.note || "No additional message supplied."}</p>
      <p className="mt-2 text-xs">
        Location: {incident.locationSource ?? "legacy demo"} · {incident.location[0].toFixed(4)},{" "}
        {incident.location[1].toFixed(4)}
        {incident.locationAt
          ? ` · captured ${new Date(incident.locationAt).toLocaleString()}`
          : " · no current GPS fix"}
        .{" "}
        {age > 2
          ? "Last known or sample position; do not treat as current."
          : "Position is a snapshot, not continuous tracking."}
      </p>
      <p className="mt-2 text-xs">
        Incident {incident.id} · opened {new Date(incident.createdAt).toLocaleString()}. Delivery is
        separate from acknowledgement or assistance.
      </p>
    </div>
  );
}
