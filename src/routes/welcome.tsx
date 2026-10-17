import { WaveText } from "@/components/cocoon/WaveText";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FlashlightThreshold } from "@/components/cocoon/FlashlightThreshold";
import { completeEntry } from "@/lib/cocoon/entry";
import { ArrowUpRight, Sparkles, Users, Compass } from "lucide-react";
import {
  REFERRAL_KEY,
  readReferral,
  previewReferral,
  referralCredits,
  type ReferralDemo,
} from "@/lib/cocoon/referral-demo";
export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Step inside · Cocoon" },
      {
        name: "description",
        content:
          "Step inside Cocoon, a demo journey companion with routes, trusted contacts and a practical safety toolkit.",
      },
      { property: "og:title", content: "Step inside · Cocoon" },
      {
        property: "og:description",
        content:
          "Step inside Cocoon, a demo journey companion with routes, trusted contacts and a practical safety toolkit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    invite:
      typeof search["invite"] === "string" && /^COCOON-[A-Z0-9]{8}$/.test(search["invite"])
        ? search["invite"]
        : undefined,
  }),
  component: Welcome,
});
function Welcome() {
  const { invite } = Route.useSearch();
  return <WelcomeExperience invite={invite} />;
}
export function WelcomeExperience({ invite }: { invite?: string | undefined }) {
  const [profile, setProfile] = useState(false),
    [name, setName] = useState(""),
    [entered, setEntered] = useState(false),
    [referral, setReferral] = useState<ReferralDemo>({ code: "", joins: [] }),
    [status, setStatus] = useState("");
  useEffect(() => {
    try {
      setReferral(readReferral(localStorage.getItem(REFERRAL_KEY)));
    } catch {
      /* available without storage */
    }
  }, []);
  const save = (value: ReferralDemo) => {
    setReferral(value);
    try {
      localStorage.setItem(REFERRAL_KEY, JSON.stringify(value));
    } catch {
      setStatus("Storage is unavailable; this preview lasts until you leave.");
    }
  };
  const createInvite = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    save({
      ...referral,
      code: `COCOON-${Array.from(bytes, (b) => (b % 36).toString(36))
        .join("")
        .toUpperCase()}`,
    });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/welcome?invite=${referral.code}`,
      );
      setStatus(
        "Demo invitation copied. It opens this welcome page; it does not create an account or earn real credits.",
      );
    } catch {
      setStatus("Copy unavailable. Select the invitation code above to copy it manually.");
    }
  };
  return (
    <div className="welcome-world">
      <FlashlightThreshold opened={entered} />
      <div className="entry-signature" aria-label="Cocoon">
        <span>✳</span> COCOON.<small>A WORLD WITH YOU IN IT.</small>
      </div>
      <section className="welcome-entry" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="eyebrow">Move a little light. Discover a little company.</span>
          <h1 id="welcome-title">
            A LITTLE LIGHT.
            <br />
            <em>
              <WaveText text="A WAY TOGETHER." step={0.06} />
            </em>
          </h1>
          <p>A place to find your way, learn what matters, and make room for each other.</p>
          {invite && (
            <p className="welcome-invited">
              You arrived through a demo invitation. No reward or account has been created.
            </p>
          )}
          <div className="welcome-modes" role="group" aria-label="Choose how to explore">
            <button aria-pressed={!profile} onClick={() => setProfile(false)}>
              <Compass size={19} />
              Just explore
            </button>
            <button aria-pressed={profile} onClick={() => setProfile(true)}>
              <Users size={19} />
              Try a demo profile
            </button>
          </div>
          {profile && (
            <label className="welcome-name">
              What can we call you? / optional
              <input
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                placeholder="A name or nickname"
              />
              <small>Used only for this welcome preview. No email, password or real account.</small>
            </label>
          )}
          {!entered ? (
            <button className="welcome-enter" onClick={() => setEntered(true)}>
              Let the light in <ArrowUpRight size={23} />
            </button>
          ) : (
            <div className="welcome-arrival" role="status">
              <p>Make yourself at home{name.trim() ? `, ${name.trim()}` : ""}.</p>
              <Link to="/" viewTransition={false} onClick={completeEntry}>
                Enter Cocoon <ArrowUpRight size={22} />
              </Link>
            </div>
          )}
          <Link className="welcome-skip" to="/" viewTransition={false} onClick={completeEntry}>
            Skip this and explore ↗
          </Link>
          <p className="welcome-demo-note">
            Explore without signing in. The optional profile here is a demo; private guardian alerts
            use a separate account.
          </p>
        </div>
      </section>
      <section className="welcome-referrals" aria-labelledby="referral-title">
        <div>
          <span className="eyebrow">Bring your people / concept preview</span>
          <h2 id="referral-title">
            GOOD COMPANY.
            <br />
            <em>SHARED POSSIBILITIES.</em>
          </h2>
          <p>
            A future invitation programme could thank members with in-app credits. Try the concept
            here: one simulated friend joining adds 10 demo credits.
          </p>
          <p>
            No real referrals are tracked. These credits have no cash value, cannot be spent and do
            not unlock safety or emergency help.
          </p>
        </div>
        <div className="referral-ledger">
          <Sparkles aria-hidden="true" />
          <strong>
            {referralCredits(referral)}
            <small>DEMO CREDITS</small>
          </strong>
          {referral.code ? (
            <>
              <code>{referral.code}</code>
              <button onClick={() => void copy()}>Copy demo invitation</button>
              <button
                disabled={referral.joins.length >= 3}
                onClick={() => save(previewReferral(referral))}
              >
                {referral.joins.length >= 3
                  ? "Three preview joins completed"
                  : "Simulate one friend joining · +10"}
              </button>
              <small>{referral.joins.length}/3 sample joins · stored in this browser only</small>
            </>
          ) : (
            <button onClick={createInvite}>Create a demo invitation</button>
          )}
          <p role="status">{status}</p>
        </div>
      </section>
    </div>
  );
}
