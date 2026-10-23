import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { PropertyDetail } from "../features/properties/PropertyDetail";

export function PropertyDetailPage({ propertyId }: { propertyId: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Property details"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Properties", href: "/properties" }, { label: "Details" }]}
        LinkComponent={Link}
      />
      <PropertyDetail propertyId={propertyId} />
    </div>
  );
}
