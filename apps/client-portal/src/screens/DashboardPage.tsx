import { PageHeader } from "@sandy/ui";
import { DashboardOverview } from "../features/dashboard/DashboardOverview";

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Your business readiness at a glance." />
      <DashboardOverview />
    </div>
  );
}
