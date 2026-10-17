import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HeartPulse, LocateFixed, Phone, X } from "lucide-react";
import { countryByCode, usePrefs } from "@/lib/cocoon/locale";
import { kitContacts, phoneHref, type KitContact } from "@/lib/cocoon/support-session";
import {
  emergencyNote,
  locationNote,
  emergencyPhoneHref,
  type LocationSnapshot,
} from "@/lib/cocoon/emergency-note";
export function EmergencyAccess() {
  const [open, setOpen] = useState(false),
    [contacts, setContacts] = useState<KitContact[]>([]),
    [location, setLocation] = useState<LocationSnapshot | null>(null),
    [pending, setPending] = useState(false),
    [status, setStatus] = useState(""),
    [note, setNote] = useState(""),
    [number, setNumber] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    request = useRef(0);
  const prefs = usePrefs(),
    country = countryByCode(prefs.country),
    urgent = country?.authorities.filter((a) => a.urgent) ?? [];
  useEffect(() => {
    if (open) {
      try {
        setContacts(kitContacts(localStorage.getItem("cocoon-kit-v1")));
      } catch {
        setContacts([]);
      }
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [open]);
  useEffect(
    () => () => {
      ++request.current;
    },
    [],
  );
  const close = () => {
    ++request.current;
    setPending(false);
    setOpen(false);
    setLocation(null);
    setStatus("");
    setNote("");
    setNumber("");
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setStatus("Location is unavailable here. Add a landmark to your note instead.");
      return;
    }
    const id = ++request.current;
    setLocation(null);
    setPending(true);
    setStatus("Waiting for browser location permission…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (id !== request.current) return;
        setLocation({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: p.timestamp,
        });
        setPending(false);
        setStatus(
          "Location captured locally. Review it before sharing; it is not sent automatically.",
        );
      },
      () => {
        if (id !== request.current) return;
        setPending(false);
        setStatus(
          "Location was denied, timed out or unavailable. You can still call or share a written landmark.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };
  const share = async (copy = false) => {
    try {
      const text = emergencyNote(note, location);
      if (!copy && navigator.share) {
        await navigator.share({ title: "Cocoon support request", text });
        setStatus("Share sheet closed. Recipient and delivery cannot be verified by Cocoon.");
      } else {
        await navigator.clipboard.writeText(text);
        setStatus("Copied. Choose a person in your messaging app and review before sending.");
      }
    } catch {
      setStatus("Sharing cancelled or unavailable. Your note is still here.");
    }
  };
  return (
    <>
      <button
        className="emergency-access-trigger"
        onClick={() => setOpen(true)}
        aria-label="Emergency contacts and location"
      >
        <HeartPulse size={19} />
        <span>Get help</span>
      </button>
      <dialog
        className="emergency-dialog"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClose={() => {
          if (open) close();
        }}
        aria-labelledby="emergency-title"
      >
        <button className="emergency-close" onClick={close} aria-label="Close emergency contacts">
          <X />
        </button>
        <span className="eyebrow">Your people. Within reach.</span>
        <h2 id="emergency-title">
          LET’S REACH
          <br />
          <em>SOMEONE.</em>
        </h2>
        <p>
          This panel calls or prepares a message. It does not dispatch help or send automatically.
        </p>
        <p className="text-sm">
          <Link to="/kit" hash="sos-delivery" onClick={close}>
            SOS recipient preferences & delivery status ↗
          </Link>
        </p>
        <div className="emergency-call-list">
          {urgent.length ? (
            urgent.map((a) => (
              <a key={a.number} href={`tel:${a.number}`}>
                <Phone size={18} />
                <span>
                  Call {a.number}
                  <small>
                    {a.name} · {country?.name}
                  </small>
                </span>
              </a>
            ))
          ) : (
            <p>
              <Link to="/kit" onClick={close}>
                Choose your country in the Safety Kit ↗
              </Link>{" "}
              to see its emergency directory. If in immediate danger, use your local emergency
              number.
            </p>
          )}
          {contacts.map((c, i) => (
            <a key={i} href={phoneHref(c.number) ?? undefined}>
              <Phone size={17} />
              <span>
                {c.name}
                <small>{c.number}</small>
              </span>
            </a>
          ))}
        </div>
        {!contacts.length && (
          <p>
            <Link to="/kit" onClick={close}>
              Save your trusted people in the Safety Kit ↗
            </Link>
          </p>
        )}
        <label>
          Or call a number you choose
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            maxLength={40}
            inputMode="tel"
            placeholder="Include country code for personal contacts"
          />
        </label>
        {emergencyPhoneHref(number) && (
          <a className="emergency-custom-call" href={emergencyPhoneHref(number)!}>
            Open dialler for {number}
          </a>
        )}
        <div className="emergency-location">
          <button disabled={pending} onClick={locate}>
            <LocateFixed size={17} />
            {pending ? "Locating…" : "Use my current location"}
          </button>
          {pending && (
            <button
              onClick={() => {
                ++request.current;
                setPending(false);
                setStatus("Location request cancelled; any late result will be ignored.");
              }}
            >
              Cancel request
            </button>
          )}
          {location && (
            <>
              <p>{locationNote(location)}</p>
              <button
                onClick={() => {
                  ++request.current;
                  setLocation(null);
                }}
              >
                Remove location
              </button>
            </>
          )}
          <small>
            One-time browser location, requested only when you press this button. Kept in memory
            until this panel closes; no background tracking. Sharing sends it to the app and
            recipient you select.
          </small>
        </div>
        <label>
          What should they know? / optional landmark
          <textarea
            maxLength={700}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Please call me. I’m near…"
          />
        </label>
        <div className="emergency-share">
          <button onClick={() => void share()}>Choose recipient & share</button>
          <button onClick={() => void share(true)}>Copy request</button>
        </div>
        <p role="status">{status}</p>
        <small>
          The dialler and share sheet need your action to complete a call or message. The share
          sheet does not preselect your saved person.
        </small>
      </dialog>
    </>
  );
}
