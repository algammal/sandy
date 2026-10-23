import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { AgentRequestsManager } from "../features/agent-requests/AgentRequestsManager";

export function AgentRequestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Requested Agents"
        description="Configure the AI voice agents you'd like us to prepare — add one for each role you need."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Requested Agents" }]}
        LinkComponent={Link}
      />
      <AgentRequestsManager />
    </div>
  );
}
