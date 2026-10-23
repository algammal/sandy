import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { ClientDetail } from "../features/clients/ClientDetail";

export function ClientDetailPage({ clientId }: { clientId: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Client details"
        breadcrumbs={[{ label: "Clients", href: "/clients" }, { label: "Details" }]}
        LinkComponent={Link}
      />
      <ClientDetail clientId={clientId} />
    </div>
  );
}
