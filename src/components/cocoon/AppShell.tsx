import { Link, useLocation, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Home,
  Map,
  MessageCircleHeart,
  ShieldCheck,
  Megaphone,
  HeartHandshake,
  LifeBuoy,
  Gavel,
  RotateCcw,
  Backpack,
  BookOpen,
} from "lucide-react";
import { useDemoState, resetDemo } from "@/lib/cocoon/store";
import { setRole } from "@/lib/cocoon/actions";
import { profileById } from "@/lib/cocoon/seed";
import { incidentsVisibleTo } from "@/lib/cocoon/access";
import type { Role } from "@/lib/cocoon/types";
import { cn } from "@/lib/utils";
import { countryByCode, usePrefs } from "@/lib/cocoon/locale";
import { EmergencyAccess } from "./EmergencyAccess";
import { RoomAtmosphere } from "./RoomAtmosphere";
import { WorldDoorway } from "./WorldDoorway";
import { enterWorld } from "@/lib/cocoon/world-navigation";
import { useEntryComplete } from "@/lib/cocoon/entry";
import { Button } from "@/components/ui/button";
import { useProductionAuth } from "@/lib/production/auth";
import { WorldMenu } from "./WorldMenu";

const NAV: Record<Role, { to: string; label: string; icon: typeof Home }[]> = {
  traveller: [
    { to: "/", label: "Home", icon: Home },
    { to: "/explore", label: "Routes", icon: Map },
    { to: "/trip", label: "Journey", icon: ShieldCheck },
    { to: "/presence", label: "Call", icon: MessageCircleHeart },
    { to: "/kit", label: "Kit", icon: Backpack },
    { to: "/reports", label: "Reports", icon: Megaphone },
    { to: "/learn", label: "Learn", icon: BookOpen },
    { to: "/circle", label: "Circle", icon: HeartHandshake },
  ],
  guardian: [
    { to: "/circle", label: "Circle", icon: HeartHandshake },
    { to: "/learn", label: "Learn", icon: BookOpen },
    { to: "/guardian", label: "Guardian", icon: HeartHandshake },
    { to: "/reports", label: "Reports", icon: Megaphone },
  ],
  responder: [
    { to: "/circle", label: "Circle", icon: HeartHandshake },
    { to: "/learn", label: "Learn", icon: BookOpen },
    { to: "/responder", label: "Console", icon: LifeBuoy },
    { to: "/reports", label: "Reports", icon: Megaphone },
  ],
  moderator: [
    { to: "/circle", label: "Circle", icon: HeartHandshake },
    { to: "/learn", label: "Learn", icon: BookOpen },
    { to: "/moderate", label: "Moderation", icon: Gavel },
    { to: "/reports", label: "Reports", icon: Megaphone },
  ],
};
const HOME: Record<Role, string> = {
  traveller: "/",
  guardian: "/guardian",
  responder: "/responder",
  moderator: "/moderate",
};
const ROLE_LABEL: Record<Role, string> = {
  traveller: "Traveller",
  guardian: "Guardian",
  responder: "Responder",
  moderator: "Moderator",
};

export function AppShell({ children }: { children: ReactNode }) {
  const entryComplete = useEntryComplete();
  const navigate = useNavigate();
  const account = useProductionAuth();
  const navigating = useRouterState({ select: (r) => r.status === "pending" });
  const prefs = usePrefs();
  const s = useDemoState();
  const loc = useLocation();
  const isWorld = loc.pathname === "/" && s.role === "traveller";
  const room = ["/circle", "/moderate"].includes(loc.pathname)
    ? { name: "The courtyard", anchor: "world-courtyard" }
    : ["/learn", "/kit"].includes(loc.pathname)
      ? { name: "The night library", anchor: "world-library" }
      : ["/explore", "/trip", "/reports"].includes(loc.pathname)
        ? { name: "The riverside", anchor: "world-riverside" }
        : { name: "The city", anchor: "world-city" };
  const me = profileById(s.actorIds[s.role]);
  const items = NAV[s.role];
  const alerts = (r: Role) =>
    incidentsVisibleTo(s, r).filter((i) => !["resolved", "cancelled"].includes(i.status)).length;

  if (loc.pathname === "/welcome" || (loc.pathname === "/" && !entryComplete)) {
    return (
      <div className="entry-only-shell">
        <a href="#main-content" className="skip-link">
          Skip to entry
        </a>
        <main id="main-content">{children}</main>
      </div>
    );
  }

  return (
    <div
      data-page={loc.pathname}
      className={
        isWorld
          ? "min-h-screen world-shell"
          : `min-h-screen pb-24 md:pb-10 cocoon-room room-${room.anchor}`
      }
    >
      {!isWorld && <RoomAtmosphere room={room.anchor} />}
      <WorldDoorway />
      <WorldMenu items={items} role={s.role} />
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {navigating && <div className="route-loading" role="progressbar" aria-label="Loading page" />}
      <div className="bg-plum-gradient px-4 py-1.5 text-center text-[11px] tracking-wide">
        Public local demo + separate signed-in journeys & in-app guardian SOS · no background alerts
        or emergency dispatch
      </div>
      <header data-app-header className="cocoon-field-header sticky top-0 z-[1000]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link
            to={HOME[s.role] as "/"}
            className="cocoon-wordmark flex items-center gap-2"
            aria-label="Cocoon home"
          >
            <svg className="cocoon-seal" viewBox="0 0 48 48" aria-hidden="true">
              <path
                d="M24 3C8 3 3 17 8 30s22 21 31 7S38 3 24 3Z"
                fill="none"
                stroke="currentColor"
              />
              <path d="M15 30Q12 12 24 12T33 30Q25 42 15 30Z" fill="none" stroke="currentColor" />
              <path d="M15 25q9-12 18 0M24 9v29" fill="none" stroke="currentColor" />
              <circle cx="24" cy="24" r="3" fill="currentColor" />
            </svg>
            <span className="font-poster text-3xl text-primary">
              Cocoon<span className="text-coral">.</span>
            </span>
          </Link>
          <nav className="field-navigation ml-4 hidden gap-1 md:flex" aria-label="Main">
            {items.map((i) => (
              <Link
                key={i.to}
                to={i.to as "/"}
                viewTransition
                aria-current={loc.pathname === i.to ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  loc.pathname === i.to && "bg-secondary font-medium text-secondary-foreground",
                )}
              >
                <i.icon aria-hidden="true" className="field-nav-icon" />
                <span>{i.label}</span>
                <svg
                  className="field-nav-trail"
                  viewBox="0 0 80 12"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 7Q20 1 39 7T77 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>
            ))}
          </nav>
          <div className="field-persona ml-auto flex items-center gap-2">
            <EmergencyAccess />
            <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/account" })}>
              {account.user ? "Account" : "Sign in"}
            </Button>
            <label className="sr-only" htmlFor="role">
              Demo role
            </label>
            <select
              id="role"
              value={s.role}
              onChange={(e) => {
                const role = e.target.value as Role;
                setRole(role);
                void navigate({ to: HOME[role] as "/" });
              }}
              className="rounded-full border bg-card px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                  {alerts(r) && r !== "traveller" ? ` • ${alerts(r)} alert` : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => confirm("Reset all demo data?") && resetDemo()}
              className="rounded-full p-2 text-muted-foreground hover:bg-accent"
              aria-label="Reset demo data"
              title="Reset demo"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="field-status mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2 text-xs text-muted-foreground">
          Demo persona <strong className="text-foreground">{me?.name}</strong>
          <span className="rounded-full bg-sage/15 px-2 py-0.5 text-sage">✓ Demo verified</span>
          <Link to="/welcome" search={{ invite: undefined }} className="field-welcome-link">
            Welcome ↗
          </Link>
          <Link to="/kit" className="ml-auto whitespace-nowrap underline">
            {countryByCode(prefs.country)?.name ?? "Set country"} ↗
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className={isWorld ? "world-main" : "mx-auto max-w-6xl px-4 py-6"}
      >
        {!isWorld && loc.pathname !== "/welcome" && s.role === "traveller" && (
          <div className="world-room-nav">
            <span>COCOON WORLD / {room.name}</span>
            <Link
              to="/"
              hash={room.anchor}
              viewTransition={false}
              onClick={(event) =>
                enterWorld(event, { to: "/", hash: room.anchor, label: room.name })
              }
            >
              ← Back to the world
            </Link>
          </div>
        )}
        {children}
      </main>
      <nav
        className="field-mobile-dock fixed inset-x-0 bottom-0 z-[1000] md:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto flex max-w-md justify-around py-2">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to as "/"}
              viewTransition
              aria-current={loc.pathname === i.to ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[11px]",
                loc.pathname === i.to ? "text-primary" : "text-muted-foreground",
              )}
            >
              <i.icon className="h-5 w-5" />
              {i.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const s = useDemoState();
  if (s.role !== role)
    return (
      <div className="card-soft mx-auto max-w-md p-6 text-center">
        <p className="font-display text-xl">
          This view is for the {ROLE_LABEL[role].toLowerCase()} role
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your current demo role can't access these records.
        </p>
        <button
          className="mt-4 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={() => setRole(role)}
        >
          Switch to {ROLE_LABEL[role]} demo account
        </button>
      </div>
    );
  return <>{children}</>;
}
