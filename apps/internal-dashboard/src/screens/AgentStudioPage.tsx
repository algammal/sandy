import { PageHeader } from "@sandy/ui";
import { AgentStudioWorkspace } from "../features/agent-studio/AgentStudioWorkspace";

export function AgentStudioPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agent Studio"
        description="Import an ElevenLabs configuration, map it to a client, preview the result and simulate provisioning."
      />
      <AgentStudioWorkspace />
    </div>
  );
}
