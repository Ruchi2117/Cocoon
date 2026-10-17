import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useProductionAuth } from "@/lib/production/auth";
import {
  readEmergencyDraft,
  saveEmergencyDraft,
  deleteEmergencyDraft,
  inappAccountData,
} from "@/lib/production/inapp.functions";
export function EmergencyDraftEditor() {
  const { user } = useProductionAuth();
  return user ? <OwnerEmergencyDraft key={user.id} userId={user.id} /> : null;
}
function OwnerEmergencyDraft({ userId }: { userId: string }) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const read = useServerFn(readEmergencyDraft),
    save = useServerFn(saveEmergencyDraft),
    remove = useServerFn(deleteEmergencyDraft),
    contactsRead = useServerFn(inappAccountData),
    cache = useQueryClient();
  const query = useQuery({
    queryKey: ["emergency-draft", userId],
    queryFn: () => read(),
    retry: false,
  });
  const contacts = useQuery({
    queryKey: ["inapp-account", userId],
    queryFn: () => contactsRead(),
    retry: false,
  });
  const [editing, setEditing] = useState(false),
    [introduction, setIntroduction] = useState(""),
    [help, setHelp] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const eligible =
    contacts.data?.contacts.filter(
      (g) => g.traveller_id === userId && g.consent === "opted_in" && !g.revoked_at,
    ) ?? [];
  const run = async (deleting: boolean) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (deleting) await remove();
      else
        await save({
          data: { introduction, helpInstructions: help, preferredRecipientIds: selected },
        });
      if (!mounted.current) return;
      setEditing(false);
      setIntroduction("");
      setHelp("");
      setSelected([]);
      await cache.invalidateQueries({ queryKey: ["emergency-draft", userId] });
      setMessage(
        deleting
          ? "Emergency draft deleted. Existing sent alerts are unchanged."
          : "Emergency draft saved privately. Every SOS still requires a separate review.",
      );
    } catch (e) {
      if (mounted.current) setMessage(e instanceof Error ? e.message : "Draft unavailable. Retry.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <section aria-label="Private emergency draft" className="space-y-3 border-t py-4">
      <h2 className="font-display text-2xl">Your optional emergency introduction</h2>
      <p className="text-sm">
        Private to your account. A short introduction and help needed are optional; no date of
        birth, address or medical details required. Nothing is sent when you save. Editing or
        deleting this draft never changes sent alerts.
      </p>
      <Button
        variant="outline"
        disabled={busy || query.isFetching || contacts.isFetching}
        onClick={() => {
          void query.refetch();
          void contacts.refetch();
        }}
      >
        Refresh emergency preferences
      </Button>
      {query.isPending && <p role="status">Loading emergency draft…</p>}
      {(query.error || contacts.error) && (
        <p role="alert">Emergency preferences or guardians unavailable. Refresh to retry.</p>
      )}
      {!query.isPending && !query.error && !contacts.error && (
        <>
          {!editing ? (
            <>
              <p className="whitespace-pre-wrap break-words">
                {query.data?.draft?.introduction || "No emergency introduction saved."}
              </p>
              <p className="whitespace-pre-wrap break-words">
                {query.data?.draft?.helpInstructions || "No help instructions saved."}
              </p>
              <p>
                Preferred guardians:{" "}
                {eligible
                  .filter((g) => query.data?.draft?.preferredRecipientIds.includes(g.id))
                  .map((g) => g.name)
                  .join(", ") || "None"}
                . These are preferences, not permission to send.
              </p>
              <Button
                onClick={() => {
                  setIntroduction(query.data?.draft?.introduction ?? "");
                  setHelp(query.data?.draft?.helpInstructions ?? "");
                  setSelected(
                    (query.data?.draft?.preferredRecipientIds ?? []).filter((id) =>
                      eligible.some((g) => g.id === id),
                    ),
                  );
                  setEditing(true);
                  setMessage("");
                }}
              >
                Edit emergency draft
              </Button>
            </>
          ) : (
            <fieldset disabled={busy} className="space-y-3">
              <label className="block">
                Short self-introduction (optional)
                <textarea
                  className="mt-1 w-full border bg-card p-2"
                  maxLength={300}
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                />
              </label>
              <label className="block">
                Instructions / help needed (optional)
                <textarea
                  className="mt-1 w-full border bg-card p-2"
                  maxLength={500}
                  value={help}
                  onChange={(e) => setHelp(e.target.value)}
                />
              </label>
              <p>
                Optional preferred in-app guardians · up to five. Newly accepted contacts are never
                automatically added.
              </p>
              {eligible.map((g) => (
                <label key={g.id} className="block">
                  <input
                    type="checkbox"
                    checked={selected.includes(g.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, g.id]
                          : selected.filter((id) => id !== g.id),
                      )
                    }
                  />{" "}
                  {g.name} · preferred guardian
                </label>
              ))}
              {!eligible.length && <p>No currently consenting guardians.</p>}
              {selected.some((id) => !eligible.some((g) => g.id === id)) && (
                <p role="alert">
                  A selected guardian is no longer eligible. Remove stale preferences or cancel and
                  edit again.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={
                    selected.length > 5 || selected.some((id) => !eligible.some((g) => g.id === id))
                  }
                  onClick={() => void run(false)}
                >
                  Save private emergency draft
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setIntroduction("");
                    setHelp("");
                    setSelected([]);
                  }}
                >
                  Cancel draft edit
                </Button>
              </div>
            </fieldset>
          )}
          {query.data?.draft && (
            <Button variant="outline" disabled={busy} onClick={() => void run(true)}>
              Delete private emergency draft
            </Button>
          )}
        </>
      )}
      {message && (
        <p role="status" className="break-words">
          {message}
        </p>
      )}
    </section>
  );
}
