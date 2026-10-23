import type { AgentInstanceStatus, AgentStatus, SubmissionStatus } from "@sandy/shared-types";
import type { StatusTone } from "@sandy/ui";

export const submissionStatusMeta: Record<SubmissionStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Submitted", tone: "info" },
  under_review: { label: "Under Review", tone: "primary" },
  changes_requested: { label: "Changes Requested", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  provisioning: { label: "Provisioning", tone: "info" },
  active: { label: "Active", tone: "success" },
  provisioning_failed: { label: "Provisioning Failed", tone: "danger" },
};

export const agentStatusMeta: Record<AgentStatus | AgentInstanceStatus, { label: string; tone: StatusTone }> = {
  not_configured: { label: "Not Configured", tone: "neutral" },
  draft: { label: "Draft", tone: "neutral" },
  ready: { label: "Ready", tone: "info" },
  provisioning: { label: "Provisioning", tone: "info" },
  active: { label: "Active", tone: "success" },
  provisioning_failed: { label: "Provisioning Failed", tone: "danger" },
};
