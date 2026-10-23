import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { ReviewSubmission } from "../features/submission/ReviewSubmission";

export function ReviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Review & Submit"
        description="Review your business information before it's sent for approval."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Review & Submit" }]}
        LinkComponent={Link}
      />
      <ReviewSubmission />
    </div>
  );
}
