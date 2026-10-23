import { PageHeader } from "@sandy/ui";
import { AgentList } from "../features/agents/AgentList";

export function AgentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Agents" description="Every agent instance prepared for a client, and its provisioning history." />
      <AgentList />
    </div>
  );
}
