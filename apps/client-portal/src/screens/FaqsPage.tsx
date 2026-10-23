import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { FaqList } from "../features/faqs/FaqList";

export function FaqsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="FAQs & Knowledge"
        description="Questions, answers and policies your voice agent can draw on."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "FAQs & Knowledge" }]}
        LinkComponent={Link}
      />
      <FaqList />
    </div>
  );
}
