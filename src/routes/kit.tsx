import { BalancedColumns } from "@/components/cocoon/BalancedColumns";
import { KitSupplyShelf } from "@/components/cocoon/KitSupplyShelf";
import { SosDeliverySettings } from "@/components/cocoon/SosDeliverySettings";
import { COUNTRIES, countryByCode, setPrefs, usePrefs } from "@/lib/cocoon/locale";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Check, Copy, Download, ExternalLink, Phone, Printer, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BreathingGuide } from "@/components/cocoon/art";
import { cn } from "@/lib/utils";
import { buildSafetyCard } from "@/lib/cocoon/safety-card";

export const Route = createFileRoute("/kit")({
  head: () => ({
    meta: [
      { title: "Safety Kit · Cocoon" },
      {
        name: "description",
        content:
          "Pack checklist, before-you-leave steps, ride checks, what to do if you feel unsafe, and country-scoped emergency numbers from official sources.",
      },
      { property: "og:title", content: "Cocoon Safety Kit" },
      {
        property: "og:description",
        content: "A practical travel toolkit with country-scoped, source-linked emergency numbers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Kit,
});

const KEY = "cocoon-kit-v1";
const PACK = [
  "Phone charged",
  "Power bank and cable",
  "Water",
  "Any medication I need",
  "Emergency contacts written on paper",
  "Small torch or whistle (if I want one)",
  "Backup fare / payment (cash or second card)",
];
const LEAVE = [
  "Told someone where I'm going and roughly when I'll arrive",
  "Checked the route and where it's busy or staffed",
  "Shared my trip with a guardian in Cocoon (optional)",
  "Know where the nearest staffed place is near my destination",
];
const RIDE = [
  "Vehicle number matches the app before getting in",
  "Driver name / photo matches",
  "Share the ride's live trip link with a trusted person",
  "Sit where you can exit easily; follow the route on your own map",
];

interface KitState {
  checked: Record<string, boolean>;
  security: string;
  securityNumber: string;
  trustedName: string;
  trustedNumber: string;
  savedAt?: string | undefined;
}
const empty: KitState = {
  checked: {},
  security: "",
  securityNumber: "",
  trustedName: "",
  trustedNumber: "",
};

function useKit() {
  const [k, setK] = useState<KitState>(empty);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<KitState>;
        const field = (value: unknown) => (typeof value === "string" ? value.slice(0, 40) : "");
        const checked =
          saved.checked && typeof saved.checked === "object" && !Array.isArray(saved.checked)
            ? Object.fromEntries(
                Object.entries(saved.checked).filter(
                  ([key, value]) => /^(pack|leave|ride):/.test(key) && typeof value === "boolean",
                ),
              )
            : {};
        setK({
          checked,
          security: field(saved.security),
          securityNumber: field(saved.securityNumber),
          trustedName: field(saved.trustedName),
          trustedNumber: field(saved.trustedNumber),
          ...(typeof saved.savedAt === "string" ? { savedAt: saved.savedAt } : {}),
        });
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);
  const update = (fn: (k: KitState) => KitState) =>
    setK((prev) => {
      const next = { ...fn(prev), savedAt: new Date().toISOString() };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        toast.error("Couldn't save in this browser (storage blocked).");
      }
      return next;
    });
  return { k, update, loaded };
}

function copy(n: string) {
  navigator.clipboard
    ?.writeText(n)
    .then(() => toast.success(`Copied ${n}`))
    .catch(() => toast(`Number: ${n}`));
}

function Kit() {
  const calmTrigger = useRef<HTMLButtonElement>(null);
  const { k, update, loaded } = useKit();
  const [calm, setCalm] = useState(false);
  const toggle = (id: string) =>
    update((p) => ({ ...p, checked: { ...p.checked, [id]: !p.checked[id] } }));
  const prefs = usePrefs();
  const urgent = countryByCode(prefs.country)?.authorities.find((a) => a.urgent) ?? null;
  const packDone = PACK.filter((i) => k.checked[`pack:${i}`]).length;
  const downloadCard = () => {
    const text = buildSafetyCard({
      country: prefs.country,
      securityName: k.security,
      securityNumber: k.securityNumber,
      trustedName: k.trustedName,
      trustedNumber: k.trustedNumber,
    });
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cocoon-safety-card.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Safety Card download started. Open the file before you travel.");
  };

  return (
    <div className="space-y-8">
      <header className="kit-market-header grid items-end gap-4 md:grid-cols-[1fr_auto]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="eyebrow">Safety Kit · travel toolkit</p>
          <h1 className="font-poster mt-2 text-6xl text-foreground sm:text-8xl">
            Pack it.
            <br />
            <span className="text-coral">Plan it.</span> Go.
          </h1>
        </motion.div>
      </header>

      <nav className="kit-jump-links" aria-label="Kit shortcuts">
        <a href="#packing-bench">Shop optional essentials ↗</a>
        <a href="#kit-checklists">My packing checklist ↓</a>
        <a href="#kit-help">Contacts & country ↗</a>
        <a href="#sos-delivery">SOS delivery preferences ↗</a>
      </nav>
      <KitSupplyShelf />
      <SosDeliverySettings />
      <div id="kit-help">
        <CountryDirectory />
      </div>
      <Link
        to="/learn"
        className="flex flex-wrap items-center justify-between gap-3 border-y py-4 text-sm"
      >
        <span>Learn about consent, boundaries and recognising harm</span>
        <strong>Explore the Safety Library ↗</strong>
      </Link>
      <div className="safety-card-download">
        <div>
          <p className="eyebrow">Keep the essentials close</p>
          <h2 className="font-poster mt-2 text-3xl">A little preparation goes a long way.</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Save your selected emergency directory, personal contacts and practical tips as an
            offline text file. The file stays a snapshot, so refresh it when travelling.
          </p>
        </div>
        <Button onClick={downloadCard} variant="outline">
          <Download size={16} /> Save offline Safety Card
        </Button>
      </div>

      <section id="kit-checklists" className="grid gap-4 md:grid-cols-3">
        <Checklist
          title="Pack checklist"
          prefix="pack"
          items={PACK}
          k={k}
          toggle={toggle}
          badge={`${packDone}/${PACK.length}`}
        />
        <Checklist title="Before you leave" prefix="leave" items={LEAVE} k={k} toggle={toggle} />
        <Checklist
          title="Taking a taxi or ride-hail"
          prefix="ride"
          items={RIDE}
          k={k}
          toggle={toggle}
        />
      </section>
      <div className="no-print flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          {loaded && k.savedAt
            ? `Saved in this browser · ${new Date(k.savedAt).toLocaleString()}`
            : "Your ticks and contacts save in this browser only."}{" "}
          To keep the essentials without a connection, download the Safety Card above or print this
          guide. The whole app is not available offline.
        </span>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" /> Print / save as PDF
        </Button>
        <button className="underline" onClick={() => update((p) => ({ ...p, checked: {} }))}>
          Clear ticks
        </button>
      </div>

      <BalancedColumns className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel-ink bg-foreground p-5 text-background">
          <p className="eyebrow !text-background/70">If you feel unsafe</p>
          <h2 className="font-poster mt-1 text-4xl">Four steps</h2>
          <ol className="mt-3 space-y-3">
            {[
              [
                "Move toward people",
                "Head for a staffed, busy place when you can — a shop, station, security desk or café.",
              ],
              [
                "Reach someone you trust",
                "Call or message a trusted person. In Cocoon you can share your trip or send a guardian update.",
              ],
              [
                urgent
                  ? `Immediate danger? Call ${urgent.number}`
                  : "Immediate danger? Call local emergency services",
                urgent
                  ? `Don't wait to be sure. ${urgent.number} connects to emergency services in ${countryByCode(prefs.country)?.name}.`
                  : "Don't wait to be sure. Use your country's emergency number — confirm it from an official source and save it below.",
              ],
              [
                "Avoid confrontation",
                "You don't owe anyone a reply. Skip unfamiliar shortcuts or detours, and keep your distance.",
              ],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="font-poster grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-xl text-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm opacity-80">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {urgent && (
              <a
                href={`tel:${urgent.number}`}
                className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-destructive-foreground"
              >
                Call {urgent.number}
              </a>
            )}
            <Link
              to="/presence"
              className="rounded-full border border-background/40 px-4 py-2 text-sm"
            >
              Call my companion (demo)
            </Link>
            <button
              ref={calmTrigger}
              onClick={() => setCalm(true)}
              className="flex items-center gap-1 rounded-full border border-background/40 px-4 py-2 text-sm"
            >
              <Wind className="h-4 w-4" /> Calm mode
            </button>
          </div>
        </div>
        <div className="card-soft p-5">
          <h2 className="text-xl font-semibold">My contacts</h2>
          <p className="text-xs text-muted-foreground">
            Add your own — Cocoon never fills these in for you.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              label="Home / campus / work security (name)"
              value={k.security}
              onChange={(v) => update((p) => ({ ...p, security: v }))}
            />
            <Field
              label="Security number (+country code)"
              tel
              value={k.securityNumber}
              onChange={(v) => update((p) => ({ ...p, securityNumber: v }))}
            />
            <Field
              label="Trusted person"
              value={k.trustedName}
              onChange={(v) => update((p) => ({ ...p, trustedName: v }))}
            />
            <Field
              label="Their number (+country code, e.g. +44…)"
              tel
              value={k.trustedNumber}
              onChange={(v) => update((p) => ({ ...p, trustedNumber: v }))}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              [k.security || "Security", k.securityNumber],
              [k.trustedName || "Trusted person", k.trustedNumber],
            ]
              .filter(([, n]) => n && /\d{3,}/.test(n))
              .map(([l, n]) => (
                <a
                  key={n}
                  href={`tel:${n!.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm"
                >
                  <Phone className="h-3.5 w-3.5" /> Call {l}
                </a>
              ))}
          </div>
        </div>
      </BalancedColumns>

      <Dialog.Root open={calm} onOpenChange={setCalm} modal={false}>
        <Dialog.Portal>
          <Dialog.Content
            className="fixed inset-x-0 bottom-20 z-[1100] mx-auto w-[min(92vw,420px)] md:bottom-6"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              calmTrigger.current?.focus();
            }}
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Calm mode</Dialog.Title>
            <div className="panel-ink bg-card p-5">
              <BreathingGuide onClose={() => setCalm(false)} />
              {urgent ? (
                <a
                  href={`tel:${urgent.number}`}
                  className="mt-3 block rounded-full bg-coral py-2 text-center text-sm font-semibold text-destructive-foreground"
                >
                  In danger? Call {urgent.number}
                </a>
              ) : (
                <p className="mt-3 text-center text-xs font-semibold text-coral">
                  In danger? Call your local emergency number.
                </p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Checklist({
  title,
  prefix,
  items,
  k,
  toggle,
  badge,
}: {
  title: string;
  prefix: string;
  items: string[];
  k: KitState;
  toggle: (id: string) => void;
  badge?: string;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {badge && (
          <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-semibold text-foreground">
            {badge}
          </span>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((i) => {
          const id = `${prefix}:${i}`;
          const on = !!k.checked[id];
          return (
            <li key={id}>
              <button
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(id)}
                className="flex w-full items-start gap-2 rounded-lg px-1 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-foreground transition",
                    on && "bg-plum text-primary-foreground",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className={cn(on && "text-muted-foreground line-through")}>{i}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  tel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tel?: boolean;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        value={value}
        type={tel ? "tel" : "text"}
        inputMode={tel ? "tel" : undefined}
        maxLength={40}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
      />
    </label>
  );
}

function CountryDirectory() {
  const prefs = usePrefs();
  const c = countryByCode(prefs.country);
  return (
    <section aria-labelledby="authorities" className="space-y-3">
      <div className="card-soft flex flex-wrap items-end gap-3 p-4">
        <label className="grid gap-1 text-sm">
          <span id="authorities" className="font-semibold">
            Country you're in now
          </span>
          <select
            value={prefs.country ?? ""}
            onChange={(e) => setPrefs({ country: e.target.value || null })}
            className="rounded-xl border bg-background px-3 py-2"
          >
            <option value="">Choose a country…</option>
            {COUNTRIES.map((x) => (
              <option key={x.code} value={x.code}>
                {x.name}
                {x.authorities.length ? " · verified directory" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Distance units</span>
          <select
            value={prefs.units}
            onChange={(e) => setPrefs({ units: e.target.value as "km" | "mi" })}
            className="rounded-xl border bg-background px-3 py-2"
          >
            <option value="km">Kilometres</option>
            <option value="mi">Miles</option>
          </select>
        </label>
        <p className="basis-full text-xs text-muted-foreground">
          You choose this — Cocoon never guesses your country from language or time zone. Country
          only picks the emergency directory; dates and times follow your device's language.
        </p>
      </div>
      {!c && (
        <div className="panel-ink bg-card p-4 text-sm">
          Choose your country to see verified emergency numbers, if Cocoon has them. Until then, use
          your local emergency number and add your own contacts below.
        </div>
      )}
      {c && !c.authorities.length && (
        <div className="panel-ink bg-card p-4 text-sm" data-testid="unconfigured-directory">
          <p className="font-semibold">{c.name}: directory not configured yet</p>
          <p className="mt-1 text-muted-foreground">
            Cocoon hasn't verified official emergency numbers for {c.name}, so none are shown — it
            never substitutes another country's number. Check your government's official emergency
            page and save the number in “My contacts” below.
          </p>
        </div>
      )}
      {c && c.authorities.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {c.authorities.map((a) => (
            <div
              key={a.number}
              className={cn(
                "panel-ink p-4",
                a.urgent ? "bg-coral text-destructive-foreground" : "bg-card",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">
                    {c.name} only · real number
                  </p>
                  <p className="font-poster text-6xl">{a.number}</p>
                  <p className="mt-1 font-medium">{a.name}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <a
                    href={`tel:${a.number}`}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                      a.urgent
                        ? "bg-background text-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                    aria-label={`Call ${a.number} — opens your phone dialler`}
                  >
                    <Phone className="h-4 w-4" /> Call
                  </a>
                  <button
                    onClick={() => copy(a.number)}
                    className="flex items-center gap-1 text-xs underline"
                    aria-label={`Copy ${a.number}`}
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm opacity-90">{a.what}</p>
              <p className="mt-2 flex flex-wrap gap-x-3 text-xs opacity-80">
                Source:
                {a.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 underline"
                  >
                    {s.label} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
                <span>· last verified {a.verifiedOn}</span>
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        “Call” opens your phone's dialler — it only dials if you confirm there. Cocoon's in-app SOS
        is a demo and contacts no one outside the app. Coverage is not universal.
      </p>
    </section>
  );
}
