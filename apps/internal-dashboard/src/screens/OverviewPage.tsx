import { PageHeader } from "@sandy/ui";
import { OverviewDashboard } from "../features/overview/OverviewDashboard";

export function OverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" description="Client submissions and agent provisioning at a glance." />
      <OverviewDashboard />
    </div>
  );
}
