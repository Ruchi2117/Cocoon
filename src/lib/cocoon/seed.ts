import type { DemoState, Profile, SafetyReport } from "./types";
import { makeCircleSeed } from "./circle";

/** Seeded demo accounts. Identity "demo_verified" — no real ID documents are collected. */
export const PROFILES: Profile[] = [
  {
    id: "u-ananya",
    name: "Ananya Rao",
    role: "traveller",
    identity: "demo_verified",
    area: "Kamla Nehru Hostel",
  },
  { id: "u-meera", name: "Meera Rao", role: "guardian", identity: "demo_verified" },
  { id: "u-kabir", name: "Kabir Sethi", role: "guardian", identity: "demo_verified" },
  {
    id: "u-priya",
    name: "Priya Nair",
    role: "responder",
    identity: "demo_verified",
    responderEligible: true,
    responderOptedIn: true,
    responderAvailable: true,
    area: "North Campus volunteer",
  },
  {
    id: "u-farah",
    name: "Farah Khan",
    role: "responder",
    identity: "demo_verified",
    responderEligible: true,
    responderOptedIn: true,
    responderAvailable: false,
    area: "Off duty",
  },
  { id: "u-dev", name: "Dev Malhotra", role: "moderator", identity: "demo_verified" },
];

export const profileById = (id: string | null | undefined) => PROFILES.find((p) => p.id === id);

export const ORIGIN = {
  label: "Kamla Nehru Hostel, North Campus",
  at: [28.6905, 77.2072] as [number, number],
};

export const DESTINATIONS = [
  {
    id: "d-metro",
    label: "Vishwavidyalaya Metro Gate 2",
    at: [28.6953, 77.2149] as [number, number],
  },
  {
    id: "d-library",
    label: "Central Reference Library",
    at: [28.6867, 77.2108] as [number, number],
  },
  { id: "d-kamla", label: "Kamla Nagar Market", at: [28.6812, 77.2045] as [number, number] },
  { id: "d-gtb", label: "GTB Nagar Metro", at: [28.6976, 77.2069] as [number, number] },
];

const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();

function seedReports(): SafetyReport[] {
  return [
    {
      id: "r1",
      category: "poor_lighting",
      sourceType: "firsthand_review",
      verification: "community_confirmed",
      description:
        "Streetlights out on the lane behind the sports complex after 8pm. Usually empty.",
      location: [28.6928, 77.2112],
      locationLabel: "Lane behind sports complex",
      eventDate: iso(60 * 20).slice(0, 10),
      submittedAt: iso(60 * 19),
      moderation: "visible",
      flags: 0,
      flaggedBy: [],
      reporterId: "u-ananya",
      demo: true,
    },
    {
      id: "r2",
      category: "harassment",
      sourceType: "incident_report",
      verification: "unverified",
      description: "Group of men passing comments near the tea stall around 9:30pm.",
      location: [28.6941, 77.2128],
      locationLabel: "Near Chhatra Marg tea stall",
      eventDate: iso(60 * 30).slice(0, 10),
      submittedAt: iso(60 * 28),
      moderation: "visible",
      flags: 1,
      flaggedBy: ["u-x"],
      reporterId: "u-anon-2",
      demo: true,
    },
    {
      id: "r3",
      category: "well_lit_busy",
      sourceType: "firsthand_review",
      verification: "community_confirmed",
      description: "Main Chhatra Marg stretch is well lit with shops open till 11pm.",
      location: [28.6918, 77.209],
      locationLabel: "Chhatra Marg main road",
      submittedAt: iso(60 * 5),
      moderation: "visible",
      flags: 0,
      flaggedBy: [],
      reporterId: "u-anon-3",
      demo: true,
    },
    {
      id: "r4",
      category: "unsafe_transport",
      sourceType: "external_source",
      verification: "unverified",
      description:
        "Synthetic sample: an illustrative external-style record about e-rickshaw overcharging near the metro at night. Not a real news item.",
      location: [28.6958, 77.214],
      locationLabel: "Vishwavidyalaya Metro surroundings",
      eventDate: iso(60 * 24 * 9).slice(0, 10),
      submittedAt: iso(60 * 24 * 8),
      moderation: "visible",
      flags: 0,
      flaggedBy: [],
      sourceName: "Synthetic demo record — no real source",
      demo: true,
    },
    {
      id: "r5",
      category: "deserted_stretch",
      sourceType: "firsthand_review",
      verification: "unverified",
      description: "Ridge-side shortcut is quick but very quiet after dark.",
      location: [28.688, 77.214],
      locationLabel: "Ridge-side shortcut",
      submittedAt: iso(60 * 50),
      moderation: "visible",
      flags: 0,
      flaggedBy: [],
      reporterId: "u-anon-4",
      demo: true,
    },
    {
      id: "r6",
      category: "police_presence",
      sourceType: "external_source",
      verification: "unverified",
      description:
        "Synthetic sample: illustrative record of a police van seen at the roundabout in the evening. Not an official advisory.",
      location: [28.6826, 77.2052],
      locationLabel: "Kamla Nagar roundabout",
      submittedAt: iso(60 * 24 * 3),
      moderation: "visible",
      flags: 0,
      flaggedBy: [],
      sourceName: "Synthetic demo record — no real source",
      demo: true,
    },
    {
      id: "r7",
      category: "other",
      sourceType: "incident_report",
      verification: "unverified",
      description: "Spam-like post with no details — hidden by moderator in demo.",
      location: [28.6899, 77.2101],
      locationLabel: "Unclear",
      submittedAt: iso(60 * 3),
      moderation: "hidden",
      flags: 3,
      flaggedBy: ["a", "b", "c"],
      reporterId: "u-anon-5",
      demo: true,
    },
  ];
}

export function makeSeed(): DemoState {
  return {
    version: 1,
    sosPreferences: {},
    circle: makeCircleSeed(),
    role: "traveller",
    actorIds: {
      traveller: "u-ananya",
      guardian: "u-meera",
      responder: "u-priya",
      moderator: "u-dev",
    },
    failNextGuardianDelivery: false,
    contacts: [
      {
        id: "c1",
        travellerId: "u-ananya",
        guardianId: "u-meera",
        relation: "Elder sister",
        status: "accepted",
        invitedAt: iso(60 * 24 * 10),
        acceptedAt: iso(60 * 24 * 10 - 30),
      },
      {
        id: "c2",
        travellerId: "u-ananya",
        guardianId: "u-kabir",
        relation: "Hostel friend",
        status: "invited",
        invitedAt: iso(60 * 4),
      },
    ],
    reports: seedReports(),
    trips: [],
    notifications: [],
    incidents: [],
    recipients: [],
    companion: {
      name: "Arjun",
      voiceURI: null,
      style: "calm",
      chattiness: 2,
      speak: true,
      memories: [],
    },
    chat: [],
  };
}
