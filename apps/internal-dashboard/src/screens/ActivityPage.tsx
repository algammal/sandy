import { PageHeader } from "@sandy/ui";
import { ActivityFeed } from "../features/activity/ActivityFeed";

export function ActivityPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity" description="Every submission, review and provisioning event across the platform." />
      <ActivityFeed />
    </div>
  );
}
