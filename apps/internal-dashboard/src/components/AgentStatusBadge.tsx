import type { AgentInstanceStatus, AgentStatus } from "@sandy/shared-types";
import { StatusBadge } from "@sandy/ui";
import { agentStatusMeta } from "../utils/statusMeta";

export function AgentStatusBadge({ status }: { status: AgentStatus | AgentInstanceStatus }) {
  const meta = agentStatusMeta[status];
  return <StatusBadge label={meta.label} tone={meta.tone} />;
}
