import { useSyncExternalStore } from "react";

/**
 * User preferences, kept separate from demo state. Country is ONLY set by explicit user
 * confirmation — never inferred from language or time zone. Country drives the authority
 * directory; language/units are independent.
 */
export type Units = "km" | "mi";
export interface Prefs {
  country: string | null; // ISO 3166-1 alpha-2, user-confirmed
  units: Units;
}
export interface Authority {
  name: string;
  number: string;
  what: string;
  urgent: boolean;
  sources: { label: string; url: string }[];
  verifiedOn: string;
}
export interface CountryEntry {
  code: string;
  name: string;
  /** Verified official entries only. Empty = unconfigured; never fall back to another country. */
  authorities: Authority[];
}

const emergencyEntry = (name: string, number: string, url: string): Authority => ({
  name,
  number,
  what: "Police, fire or ambulance for an immediate emergency. Tell the operator your location and follow their instructions.",
  urgent: true,
  sources: [{ label: "Official emergency guidance", url }],
  verifiedOn: "16 Oct 2026",
});
const INTERNATIONAL: Record<string, Authority[]> = {
  US: [
    emergencyEntry(
      "United States emergency services",
      "911",
      "https://www.911.gov/calling-911/frequently-asked-questions/",
    ),
  ],
  GB: [
    emergencyEntry(
      "United Kingdom emergency services",
      "999",
      "https://www.gov.uk/guidance/999-and-112-the-uks-national-emergency-numbers",
    ),
  ],
  AU: [emergencyEntry("Australia — Triple Zero", "000", "https://www.triplezero.gov.au/")],
  CA: [
    emergencyEntry(
      "Canada emergency services (where 911 is available)",
      "911",
      "https://www.getprepared.gc.ca/cnt/hzd/drng-en.aspx",
    ),
  ],
};
export const COUNTRIES: CountryEntry[] = [
  { code: "ZZ", name: "Other / not listed", authorities: [] },
  {
    code: "IN",
    name: "India",
    authorities: [
      {
        name: "Emergency Response Support System",
        number: "112",
        what: "National emergency number — police, fire and health. For immediate danger.",
        urgent: true,
        sources: [
          { label: "112.gov.in", url: "https://112.gov.in/" },
          { label: "112 FAQ", url: "https://112.gov.in/faq" },
        ],
        verifiedOn: "16 Oct 2026",
      },
      {
        name: "National Commission for Women — 24×7 helpline",
        number: "14490",
        what: "Support and guidance for women. A helpline, not emergency dispatch — call 112 in immediate danger.",
        urgent: false,
        sources: [{ label: "NCW contact page", url: "https://ncwapps.nic.in/frmContactUS.aspx" }],
        verifiedOn: "16 Oct 2026",
      },
    ],
  },
  ...(
    [
      ["AU", "Australia"],
      ["BD", "Bangladesh"],
      ["BR", "Brazil"],
      ["CA", "Canada"],
      ["DE", "Germany"],
      ["FR", "France"],
      ["ID", "Indonesia"],
      ["JP", "Japan"],
      ["KE", "Kenya"],
      ["MX", "Mexico"],
      ["NG", "Nigeria"],
      ["NP", "Nepal"],
      ["PH", "Philippines"],
      ["PK", "Pakistan"],
      ["SG", "Singapore"],
      ["AE", "United Arab Emirates"],
      ["GB", "United Kingdom"],
      ["US", "United States"],
      ["ZA", "South Africa"],
      ["LK", "Sri Lanka"],
    ] as const
  ).map(([code, name]) => ({ code, name, authorities: INTERNATIONAL[code] ?? [] })),
].sort((a, b) => a.name.localeCompare(b.name));

export const countryByCode = (c: string | null) => COUNTRIES.find((x) => x.code === c) ?? null;

const KEY = "cocoon-prefs-v1";
const DEFAULT: Prefs = { country: null, units: "km" };
let prefs: Prefs | null = null;
const subs = new Set<() => void>();

function read(): Prefs {
  if (typeof window === "undefined") return DEFAULT;
  if (prefs) return prefs;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>;
    prefs = {
      country: COUNTRIES.some((c) => c.code === saved.country) ? (saved.country ?? null) : null,
      units: saved.units === "mi" ? "mi" : "km",
    };
  } catch {
    prefs = DEFAULT;
  }
  return prefs;
}
export function setPrefs(p: Partial<Prefs>) {
  prefs = { ...read(), ...p };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage blocked */
  }
  subs.forEach((f) => f());
}
export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    read,
    () => DEFAULT,
  );
}

export function formatDistance(km: number, units: Units) {
  if (units === "mi") {
    const mi = km * 0.621371;
    return mi < 0.2 ? `${Math.round(mi * 5280)} ft` : `${mi.toFixed(mi < 10 ? 2 : 1)} mi`;
  }
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 2 : 1)} km`;
}

/** Locale-formatted clock time including the device time zone name, e.g. "9:42 PM GMT+5:30". */
export function formatClock(d: Date, locale?: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}
export function formatDateTime(d: Date, locale?: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
