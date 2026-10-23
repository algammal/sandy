import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { CompoundList } from "../features/compounds/CompoundList";

export function CompoundsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compounds"
        description="Residential communities and compounds grouping your properties."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Compounds" }]}
        LinkComponent={Link}
      />
      <CompoundList />
    </div>
  );
}
