import type { PrivateJourney } from "@/lib/production/journey-schema";
import { publicMapUrl } from "@/lib/cocoon/share";
export function JourneySnapshot({ journey }: { journey: PrivateJourney }) {
  return (
    <div className="space-y-2 break-words text-sm">
      <p>
        {journey.status} ·{" "}
        {journey.sharing ? "Sharing enabled for consenting selected guardians" : "Sharing stopped"}
      </p>
      <p>Expected check-in: {new Date(journey.expected_at).toLocaleString()}</p>
      {journey.overdue && (
        <p role="status" className="text-coral">
          Check-in overdue, not proof of danger.
        </p>
      )}
      <p>
        Last manual check-in:{" "}
        {journey.last_check_in_at
          ? new Date(journey.last_check_in_at).toLocaleString()
          : "Not yet checked in"}
      </p>
      <p className="whitespace-pre-wrap">{journey.note || "No note shared."}</p>
      {journey.location ? (
        <>
          <p>
            {journey.location.latitude.toFixed(5)}, {journey.location.longitude.toFixed(5)} · ±
            {Math.round(journey.location.accuracy)} m ·{" "}
            {new Date(journey.location.timestamp).toLocaleString()} · latest consented one-time
            snapshot, not live tracking
          </p>
          <a
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
            href={publicMapUrl([journey.location.latitude, journey.location.longitude])}
          >
            Open journey snapshot on map ↗
          </a>
        </>
      ) : (
        <p>No location shared.</p>
      )}
    </div>
  );
}
