import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  CaptureSession,
  capturePlan,
  kitContacts,
  phoneHref,
  supportMessage,
  type BatteryState,
  type CaptureMode,
  type KitContact,
} from "@/lib/cocoon/support-session";
import { countryByCode, usePrefs } from "@/lib/cocoon/locale";
type LocalCapture = { id: string; file: File; url: string };
type BatteryHandle = EventTarget & { level: number; charging: boolean };

export function SupportWorkspace({
  stopSignal,
  openSignal = 0,
}: {
  stopSignal: number;
  openSignal?: number;
}) {
  useEffect(() => {
    if (openSignal > 0) setOpen(true);
  }, [openSignal]);
  const [open, setOpen] = useState(false),
    [contacts, setContacts] = useState<KitContact[]>([]),
    [contact, setContact] = useState(0);
  const [note, setNote] = useState(""),
    [place, setPlace] = useState(""),
    [notice, setNotice] = useState("");
  const [mode, setMode] = useState<CaptureMode>("audio"),
    [battery, setBattery] = useState<BatteryState | null>(null),
    [saving, setSaving] = useState(true),
    [periodic, setPeriodic] = useState(false);
  const [pending, setPending] = useState(false),
    [recording, setRecording] = useState(false),
    [stream, setStream] = useState<MediaStream | null>(null),
    [elapsed, setElapsed] = useState(0),
    [files, setFiles] = useState<LocalCapture[]>([]);
  const preview = useRef<HTMLVideoElement>(null),
    session = useRef<CaptureSession | null>(null),
    fileRef = useRef<LocalCapture[]>([]),
    mounted = useRef(false),
    pendingRef = useRef(false),
    recordingMode = useRef<CaptureMode>("audio");
  const attempt = useRef(0);
  const prefs = usePrefs(),
    urgent = countryByCode(prefs.country)?.authorities.find((a) => a.urgent),
    plan = capturePlan(mode, battery, saving);

  useEffect(() => {
    mounted.current = true;
    const refresh = () => {
      try {
        setContacts(kitContacts(localStorage.getItem("cocoon-kit-v1")));
      } catch {
        setContacts([]);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    session.current = new CaptureSession({
      onStream: (value) => {
        if (mounted.current) setStream(value);
      },
      onFile: (file) => {
        if (!mounted.current) return;
        if (file.type.startsWith("image/") && fileRef.current.length >= 3) {
          setNotice("A space is reserved for your recording. Download or remove a photo first.");
          return;
        }
        if (fileRef.current.length >= 4) {
          setNotice(
            "Four captures are already in this page. Download or remove one before capturing more.",
          );
          return;
        }
        const entry = { id: crypto.randomUUID(), file, url: URL.createObjectURL(file) };
        fileRef.current = [...fileRef.current, entry];
        setFiles(fileRef.current);
      },
      onError: (message) => {
        if (mounted.current) setNotice(message);
      },
      onEnd: () => {
        if (mounted.current) {
          setRecording(false);
          setPending(false);
          pendingRef.current = false;
        }
      },
    });
    const hide = () => {
      if (document.hidden) {
        ++attempt.current;
        session.current?.stop();
        if (mounted.current)
          setNotice(
            "Recording stops when this page is in the background. Review any completed clip below.",
          );
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      session.current?.dispose();
      session.current = null;
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", hide);
      fileRef.current.forEach((file) => URL.revokeObjectURL(file.url));
      fileRef.current = [];
    };
  }, []);
  useEffect(() => {
    let active = true;
    let handle: BatteryHandle | null = null;
    const update = () => {
      if (active && handle) setBattery({ level: handle.level, charging: handle.charging });
    };
    const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryHandle> })
      .getBattery;
    if (getBattery)
      void getBattery
        .call(navigator)
        .then((value) => {
          if (!active) return;
          handle = value;
          update();
          value.addEventListener("levelchange", update);
          value.addEventListener("chargingchange", update);
        })
        .catch(() => {});
    return () => {
      active = false;
      handle?.removeEventListener("levelchange", update);
      handle?.removeEventListener("chargingchange", update);
    };
  }, []);
  useEffect(() => {
    if (preview.current) {
      preview.current.srcObject = stream;
      if (stream)
        void preview.current
          .play()
          .catch(() => setNotice("Tap the camera preview to start its display."));
    }
  }, [stream]);
  useEffect(() => {
    if (!recording) return;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (recording && saving && battery && !battery.charging && battery.level <= 0.1) {
      session.current?.stop();
      setNotice("Recording stopped at 10% battery or below to preserve power for contacting help.");
    }
  }, [recording, saving, battery]);
  useEffect(() => {
    if (!periodic || !recording || recordingMode.current !== "video") return;
    const timer = window.setInterval(() => {
      if (!document.hidden && preview.current && fileRef.current.length < 3)
        void session.current
          ?.photo(preview.current)
          .catch((error) =>
            setNotice(error instanceof Error ? error.message : "Photo unavailable."),
          );
    }, 30000);
    return () => window.clearInterval(timer);
  }, [periodic, recording]);
  const startCapture = async () => {
    if (pendingRef.current || recording) return;
    if (fileRef.current.length >= 4) {
      setNotice("Download or remove a capture first; this page holds up to four.");
      return;
    }
    const capture = session.current;
    if (!capture) return;
    const request = ++attempt.current;
    pendingRef.current = true;
    setPending(true);
    setNotice(plan.reason);
    recordingMode.current = plan.mode;
    try {
      await capture.start(plan.mode, plan.maxSeconds);
      if (mounted.current && request === attempt.current) setRecording(true);
    } catch (error) {
      if (mounted.current && request === attempt.current)
        setNotice(error instanceof Error ? error.message : "Capture could not start.");
    } finally {
      if (request === attempt.current) {
        pendingRef.current = false;
        if (mounted.current) setPending(false);
      }
    }
  };
  const stopCapture = () => {
    ++attempt.current;
    session.current?.stop();
    setRecording(false);
    setPending(false);
    pendingRef.current = false;
  };
  useEffect(() => {
    ++attempt.current;
    session.current?.stop();
    setRecording(false);
    setPending(false);
    pendingRef.current = false;
  }, [stopSignal]);
  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(supportMessage(note, place, contacts[contact]?.name));
      setNotice("Support note copied.");
    } catch {
      setNotice("Copy unavailable; select and copy the fields manually.");
    }
  };
  const shareNote = async () => {
    const text = supportMessage(note, place, contacts[contact]?.name);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Cocoon support request", text });
        setNotice("Share sheet closed. Cocoon cannot verify who received the note.");
      } else {
        await navigator.clipboard.writeText(text);
        setNotice("Support note copied. Choose its recipient in your messaging app.");
      }
    } catch {
      setNotice("Sharing was cancelled or unavailable. You can copy the note instead.");
    }
  };
  const shareFile = async (file: File) => {
    try {
      if (!navigator.canShare?.({ files: [file] }) || !navigator.share) {
        setNotice(
          "File sharing is not supported here. Download the file and choose a recipient in your messaging app.",
        );
        return;
      }
      await navigator.share({
        files: [file],
        title: "Cocoon capture",
        text: supportMessage(note, place, contacts[contact]?.name),
      });
      setNotice("Share sheet closed. Cocoon cannot verify receipt.");
    } catch {
      setNotice("Sharing cancelled or unavailable; your local capture is still here.");
    }
  };
  const remove = (id: string) => {
    const found = fileRef.current.find((file) => file.id === id);
    if (found) URL.revokeObjectURL(found.url);
    fileRef.current = fileRef.current.filter((file) => file.id !== id);
    setFiles(fileRef.current);
  };
  return (
    <section className="support-workspace" aria-labelledby="support-title">
      <div className="support-start">
        <div>
          <span className="eyebrow">The support desk / your choices stay yours</span>
          <h2 id="support-title">
            ONE THING
            <br />
            <em>AT A TIME.</em>
          </h2>
          <p>
            Keep a person you trust within reach. Choose a local recorder or share a note yourself.
          </p>
          <small>Manual recording & sharing · separate from the companion</small>
        </div>
        <div className="support-start-actions">
          <Button
            variant="outline"
            onClick={() => {
              if (open) stopCapture();
              setOpen(!open);
            }}
            aria-expanded={open}
            aria-controls="support-options"
          >
            {open ? "Close support choices" : "Recording & sharing choices"}
          </Button>
          {urgent ? (
            <a href={`tel:${urgent.number}`}>Immediate danger? Call {urgent.number}</a>
          ) : (
            <Link to="/kit">Choose your country for emergency contacts ↗</Link>
          )}
        </div>
      </div>
      {open && (
        <div id="support-options" className="support-options">
          <p className="support-boundary">
            The companion does not watch your surroundings, contact nearby strangers, dispatch help,
            or send files automatically. Recording is optional and may draw attention; choose what
            is feasible for you. You can ask for help without collecting a recording.
          </p>
          <div className="support-columns">
            <div>
              <h3>Reach your people</h3>
              {contacts.length ? (
                <label>
                  Saved in your Safety Kit
                  <select
                    value={contact}
                    onChange={(event) => setContact(Number(event.target.value))}
                  >
                    {contacts.map((person, index) => (
                      <option key={`${person.number}-${index}`} value={index}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p>
                  No valid personal contacts saved yet.{" "}
                  <Link to="/kit">Add a trusted person or security contact ↗</Link>
                </p>
              )}
              {contacts[contact] && (
                <a
                  className="support-contact-call"
                  href={phoneHref(contacts[contact]!.number) ?? undefined}
                >
                  Call {contacts[contact]!.name} · {contacts[contact]!.number}
                </a>
              )}
              <label>
                What I want them to know
                <textarea
                  maxLength={1000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Please call me. I would like some company."
                />
              </label>
              <label>
                Location or landmark I choose to include
                <input
                  maxLength={250}
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="Optional · entered by you, not tracked"
                />
              </label>
              <div className="support-inline-actions">
                <Button variant="outline" onClick={() => void shareNote()}>
                  Choose recipient & share note
                </Button>
                <Button variant="outline" onClick={() => void copyNote()}>
                  Copy note
                </Button>
              </div>
              <p className="source-standard">
                The share sheet does not preselect a saved contact. Review the recipient before
                sending. Automatic message/file delivery is not connected in this demo.
              </p>
            </div>
            <div>
              <h3>Capture only what you choose</h3>
              <p>
                Visible, local recording from your microphone; AI playback is not included. Camera
                preview appears for video. Captures are kept in this page’s memory and disappear on
                reload or leaving this page unless you save them.
              </p>
              <div className="support-capture-settings">
                <label>
                  Capture mode
                  <select
                    value={mode}
                    disabled={recording || pending}
                    onChange={(event) => setMode(event.target.value as CaptureMode)}
                  >
                    <option value="audio">Audio · up to 3 minutes</option>
                    <option value="video">Video with audio · up to 45 seconds</option>
                  </select>
                </label>
                <p>
                  {battery
                    ? `Battery: ${Math.round(battery.level * 100)}%${battery.charging ? " · charging" : ""}`
                    : "Battery status is not available in this browser."}{" "}
                  {plan.reason}
                </p>
                <label className="support-check">
                  <input
                    type="checkbox"
                    checked={saving}
                    onChange={(event) => setSaving(event.target.checked)}
                  />{" "}
                  Prefer audio below 20% battery; stop capture at 10%
                </label>
                {mode === "video" && (
                  <label className="support-check">
                    <input
                      type="checkbox"
                      checked={periodic}
                      onChange={(event) => setPeriodic(event.target.checked)}
                    />{" "}
                    While recording video, also take a photo every 30 seconds
                  </label>
                )}
              </div>
              <div className="support-inline-actions">
                {recording || pending ? (
                  <Button variant="outline" onClick={stopCapture}>
                    {pending ? "Cancel permission request" : "Stop & keep clip"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => void startCapture()}>
                    Start {plan.mode} recording
                  </Button>
                )}
                {recording && recordingMode.current === "video" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (fileRef.current.length >= 3) {
                        setNotice(
                          "One space is reserved for your recording. Download or remove a photo first.",
                        );
                        return;
                      }
                      if (preview.current)
                        void session.current
                          ?.photo(preview.current)
                          .catch((error) =>
                            setNotice(
                              error instanceof Error ? error.message : "Photo unavailable.",
                            ),
                          );
                    }}
                  >
                    Take a photo
                  </Button>
                )}
              </div>
              {pending && (
                <p role="status">
                  Waiting for your browser permission. No capture starts if you cancel.
                </p>
              )}
              {recording && (
                <p className="recording-status" role="status">
                  ● RECORDING {recordingMode.current.toUpperCase()} · {elapsed}s · stays in this
                  page
                </p>
              )}
              <video
                className={`support-camera ${stream && recordingMode.current === "video" ? "" : "hidden"}`}
                ref={preview}
                autoPlay
                muted
                playsInline
                onClick={() =>
                  void preview.current?.play().catch(() => setNotice("Camera preview unavailable."))
                }
              />
              <p className="source-standard">
                Maximum four local captures and 12 MB per clip. Recording stops if the page is
                backgrounded, you navigate away, permission is revoked, or the time limit is
                reached. Sharing is a separate action.{" "}
                <a
                  href="https://www.techsafety.org/documentationtips"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Documentation and privacy guidance ↗
                </a>
              </p>
            </div>
          </div>
          {files.length > 0 && (
            <div className="support-captures">
              <h3>Review before sharing</h3>
              {files.map((file) => (
                <article key={file.id}>
                  <strong>{file.file.name}</strong>
                  <small>{(file.file.size / 1024 / 1024).toFixed(1)} MB · local to this page</small>
                  {file.file.type.startsWith("image/") ? (
                    <img src={file.url} alt="Photo you chose to capture" />
                  ) : file.file.type.startsWith("video/") ? (
                    <video controls src={file.url} />
                  ) : (
                    <audio controls src={file.url} />
                  )}
                  <div className="support-inline-actions">
                    <a href={file.url} download={file.file.name}>
                      Download
                    </a>
                    <Button variant="outline" onClick={() => void shareFile(file.file)}>
                      Choose recipient & share file
                    </Button>
                    <Button variant="outline" onClick={() => remove(file.id)}>
                      Remove local capture
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="support-notice" role="status">
            {notice}
          </p>
        </div>
      )}
    </section>
  );
}
