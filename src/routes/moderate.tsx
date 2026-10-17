import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/cocoon/AppShell";
import { PageHeader, Pill, ReportCard } from "@/components/cocoon/ui";
import { useDemoState } from "@/lib/cocoon/store";
import { publicReports } from "@/lib/cocoon/access";
import { moderateReport } from "@/lib/cocoon/actions";
import { CircleModeration } from "@/components/cocoon/CircleModeration";

export const Route = createFileRoute("/moderate")({
  head: () => ({
    meta: [
      { title: "Moderation · Cocoon" },
      {
        name: "description",
        content: "Review flagged community reports and hide or restore them.",
      },
      { property: "og:title", content: "Moderation · Cocoon" },
      { property: "og:description", content: "Moderator queue for community safety reports." },
    ],
  }),
  component: () => (
    <RoleGate role="moderator">
      <Moderate />
    </RoleGate>
  ),
});

function Moderate() {
  const s = useDemoState();
  const reports = [...publicReports(s, "moderator")].sort((a, b) => b.flags - a.flags);
  return (
    <div>
      <PageHeader eyebrow="Moderator · local demo" title="Community care & reports">
        Sorted by flags. Reporter identities stay private even to moderators in this demo.
      </PageHeader>
      <CircleModeration />
      <h2 className="font-poster my-6 text-4xl">Map report queue</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {reports.map((r) => (
          <ReportCard key={r.id} r={r}>
            <Pill tone={r.flags ? "coral" : "muted"}>
              {r.flags} flag{r.flags === 1 ? "" : "s"}
            </Pill>
            {r.moderation === "visible" ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => moderateReport(r.id, "hidden")}
              >
                Hide
              </Button>
            ) : (
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => moderateReport(r.id, "visible")}
              >
                Restore
              </Button>
            )}
          </ReportCard>
        ))}
      </div>
    </div>
  );
}
