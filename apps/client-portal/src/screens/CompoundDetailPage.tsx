import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { CompoundDetail } from "../features/compounds/CompoundDetail";

export function CompoundDetailPage({ compoundId }: { compoundId: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compound details"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Compounds", href: "/compounds" }, { label: "Details" }]}
        LinkComponent={Link}
      />
      <CompoundDetail compoundId={compoundId} />
    </div>
  );
}
