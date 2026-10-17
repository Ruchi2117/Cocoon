import type { LatLng } from "./types";
import { formatClock } from "./locale";

/**
 * User-initiated external sharing (WhatsApp click-to-chat, Web Share, copy, SMS).
 * Opening a share sheet is a HANDOFF to another app — Cocoon cannot know whether the
 * message was sent, delivered or read, so handoffs are recorded separately from in-app
 * guardian notifications and never imply acknowledgement.
 * Click-to-chat reference: https://faq.whatsapp.com/5913398998672934
 */
export type ShareKind = "trip" | "check_in" | "arrived" | "concern";

export interface LocationSnapshot {
  at: LatLng;
  takenAt: Date;
  /** Human description, e.g. "GPS, about ±25 m" or "simulated demo position". */
  accuracy: string;
}

export interface MessageInput {
  kind: ShareKind;
  destination: string;
  etaMinutes: number;
  now?: Date | undefined;
  locale?: string | undefined;
  /** Excluded unless the user explicitly opts in. */
  location?: LocationSnapshot | null | undefined;
}

export function publicMapUrl([lat, lng]: LatLng) {
  const la = lat.toFixed(5);
  const ln = lng.toFixed(5);
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${ln}#map=17/${la}/${ln}`;
}

export function buildMessage({
  kind,
  destination,
  etaMinutes,
  now = new Date(),
  locale,
  location,
}: MessageInput) {
  const eta = formatClock(new Date(now.getTime() + etaMinutes * 60000), locale);
  const lines: string[] = [];
  if (kind === "trip")
    lines.push(`I'm on my way to ${destination}. Expected arrival around ${eta}.`);
  if (kind === "check_in")
    lines.push(`Quick check-in: I'm okay and heading to ${destination}. Expected around ${eta}.`);
  if (kind === "arrived")
    lines.push(`I've arrived at ${destination}. Thanks for looking out for me.`);
  if (kind === "concern")
    lines.push(
      `I'm feeling uncomfortable on my way to ${destination} (expected around ${eta}). Could you call or message me?`,
    );
  if (location) {
    lines.push(
      `Location snapshot (not live tracking), taken ${formatClock(location.takenAt, locale)} — ${location.accuracy}: ${publicMapUrl(location.at)}`,
    );
  }
  lines.push("— sent by me from Cocoon");
  return lines.join("\n");
}

/** Validates a full international number (E.164: +, country code, up to 15 digits). Returns digits or null. */
export function intlDigits(raw: string): string | null {
  const t = raw.trim().replace(/[\s().-]/g, "");
  const m = /^(?:\+|00)([1-9]\d{6,14})$/.exec(t);
  return m ? m[1]! : null;
}

export function whatsappUrl(text: string, phone?: string | null) {
  const digits = phone ? intlDigits(phone) : null;
  return `https://wa.me/${digits ?? ""}?text=${encodeURIComponent(text)}`;
}

export function smsUrl(text: string, phone?: string | null) {
  const digits = phone ? intlDigits(phone) : null;
  return `sms:${digits ? `+${digits}` : ""}?&body=${encodeURIComponent(text)}`;
}

/* ---- handoff log (separate from in-app notification delivery) ---- */
export interface ShareHandoff {
  id: string;
  kind: ShareKind;
  channel: "whatsapp" | "web_share" | "copy" | "sms";
  at: string;
  includedLocation: boolean;
  /** Only what Cocoon actually knows: the user opened an external app or copied text. */
  status: "handed_off";
}
const KEY = "cocoon-share-log-v1";
export function logHandoff(h: Omit<ShareHandoff, "id" | "at" | "status">) {
  if (typeof window === "undefined") return;
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as ShareHandoff[];
    list.unshift({
      ...h,
      id: `h-${Date.now()}`,
      at: new Date().toISOString(),
      status: "handed_off",
    });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* ignore */
  }
}
export function readHandoffs(): ShareHandoff[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ShareHandoff[];
  } catch {
    return [];
  }
}
