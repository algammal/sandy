import type { SubmissionStatus } from "@sandy/shared-types";
import { StatusBadge } from "@sandy/ui";
import { submissionStatusMeta } from "../features/dashboard/submissionStatusMeta";

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = submissionStatusMeta[status];
  return <StatusBadge label={meta.label} tone={meta.tone} />;
}
