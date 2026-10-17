import type { InAppAlert } from "@/lib/production/inapp-schema";
import { publicMapUrl } from "@/lib/cocoon/share";
export function SOSSnapshot({ alert: a }: { alert: InAppAlert }) {
  return (
    <div className="space-y-2 break-words">
      <p>
        Sender: {a.traveller_name} · account {a.traveller_id}
      </p>
      <p>
        Prepared:{" "}
        {a.prepared_at
          ? new Date(a.prepared_at).toLocaleString()
          : "Not recorded on this earlier alert"}{" "}
        · stored: {new Date(a.created_at).toLocaleString()}
      </p>
      {a.draft_included ? (
        <>
          <p className="whitespace-pre-wrap">Introduction: {a.introduction || "Not included."}</p>
          <p className="whitespace-pre-wrap">
            Help / instructions: {a.help_instructions || "Not included."}
          </p>
        </>
      ) : (
        <p>Emergency draft omitted.</p>
      )}
      <p className="whitespace-pre-wrap">{a.note || "No note shared."}</p>
      {a.location ? (
        <>
          <p>
            {a.location.latitude.toFixed(5)}, {a.location.longitude.toFixed(5)} · ±
            {Math.round(a.location.accuracy)} m · {new Date(a.location.timestamp).toLocaleString()}{" "}
            · one-time snapshot, not live tracking
          </p>
          <a
            className="underline"
            href={publicMapUrl([a.location.latitude, a.location.longitude])}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open shared snapshot on map ↗
          </a>
        </>
      ) : (
        <p>No location shared.</p>
      )}
    </div>
  );
}
