import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { PropertyList } from "../features/properties/PropertyList";

export function PropertiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Properties"
        description="Every unit your voice agent can discuss with callers."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Properties" }]}
        LinkComponent={Link}
      />
      <PropertyList />
    </div>
  );
}
