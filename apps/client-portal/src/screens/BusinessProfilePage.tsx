import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { BusinessProfileForm } from "../features/business-profile/BusinessProfileForm";

export function BusinessProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Business Profile"
        description="This information powers how your AI voice agent describes your business to callers."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Business Profile" }]}
        LinkComponent={Link}
      />
      <BusinessProfileForm />
    </div>
  );
}
