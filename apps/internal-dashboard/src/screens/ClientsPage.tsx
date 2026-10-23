import { PageHeader } from "@sandy/ui";
import { ClientList } from "../features/clients/ClientList";

export function ClientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Clients" description="Search, filter and review every client on the platform." />
      <ClientList />
    </div>
  );
}
