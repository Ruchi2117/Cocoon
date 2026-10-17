import { useDemoState } from "@/lib/cocoon/store";
import { saveSosPreferences } from "@/lib/cocoon/actions";
import { DEFAULT_SOS_PREFERENCES, selectedSosGuardians } from "@/lib/cocoon/sos-policy";
import { profileById } from "@/lib/cocoon/seed";
import { SosButton } from "./SosPanel";
export function SosDeliverySettings() {
  const s = useDemoState(),
    prefs = s.sosPreferences[s.actorIds.traveller] ?? DEFAULT_SOS_PREFERENCES;
  const accepted = s.contacts.filter(
    (c) => c.travellerId === s.actorIds.traveller && c.status === "accepted",
  );
  const ids = selectedSosGuardians(s, prefs.guardianIds);
  return (
    <section
      className="sos-delivery-settings"
      id="sos-delivery"
      aria-labelledby="sos-delivery-heading"
    >
      <span className="eyebrow">SOS / RECIPIENTS & DELIVERY</span>
      <h2 id="sos-delivery-heading">Know who gets the request.</h2>
      <p className="sos-channel-warning">
        <strong>Automatic real-world delivery is not connected.</strong> Guardian and
        participating-responder alerts below are simulated in this browser. Authorities and nearby
        authenticated users receive nothing. For immediate danger, use Get help to open your local
        emergency dialler.
      </p>
      <fieldset disabled={s.role !== "traveller"}>
        <legend>Preferred guardians · accepted connections only</legend>
        {!accepted.length && (
          <p>No accepted guardians. Invited or revoked contacts will not receive the demo SOS.</p>
        )}
        {accepted.map((c) => (
          <label key={c.id}>
            <input
              type="checkbox"
              checked={ids.includes(c.guardianId)}
              onChange={(e) =>
                saveSosPreferences({
                  ...prefs,
                  guardianIds: e.target.checked
                    ? [...ids, c.guardianId]
                    : ids.filter((id) => id !== c.guardianId),
                })
              }
            />
            {profileById(c.guardianId)?.name} · {c.relation}
          </label>
        ))}
        <button type="button" onClick={() => saveSosPreferences({ ...prefs, guardianIds: null })}>
          Use all accepted guardians
        </button>
        <label>
          <input
            type="checkbox"
            checked={prefs.responders}
            onChange={(e) => saveSosPreferences({ ...prefs, responders: e.target.checked })}
          />
          Participating demo responders · opted in & available, not authenticated nearby users
        </label>
        <label>
          <input
            type="checkbox"
            checked={prefs.authorities}
            onChange={(e) => saveSosPreferences({ ...prefs, authorities: e.target.checked })}
          />
          Prefer authority assistance · saved preference only, dispatch unavailable
        </label>
        <label>
          <input
            type="checkbox"
            checked={prefs.nearby}
            onChange={(e) => saveSosPreferences({ ...prefs, nearby: e.target.checked })}
          />
          Prefer nearby authenticated help · saved preference only, service unavailable
        </label>
      </fieldset>
      <p>
        Preferences save locally per demo traveller. Consent and eligibility are checked again when
        creating the demo alert. No public broadcast, phone-number disclosure or nearby-user
        location sharing is enabled.
      </p>
      <details>
        <summary>What must connect before real sending can work?</summary>
        <ul>
          <li>Authenticated accounts and server-enforced recipient permissions.</li>
          <li>
            Durable alert outbox, messaging/push provider, recipient opt-in, delivery receipts and
            retries.
          </li>
          <li>
            Nearby assistance: verified, opted-in and available helpers, fresh consented positions,
            distance filtering and minimal-data access.
          </li>
          <li>
            Authority alerts: an approved local agency integration. A phone dialler link is not
            automatic dispatch.
          </li>
        </ul>
      </details>
      {s.role === "traveller" && <SosButton />}
    </section>
  );
}
