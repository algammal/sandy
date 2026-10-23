import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { LocationList } from "../features/locations/LocationList";

export function LocationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Locations"
        description="Addresses your properties and compounds are located at."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Locations" }]}
        LinkComponent={Link}
      />
      <LocationList />
    </div>
  );
}
