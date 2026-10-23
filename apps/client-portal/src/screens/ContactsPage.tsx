import Link from "next/link";
import { PageHeader } from "@sandy/ui";
import { ContactList } from "../features/contacts/ContactList";

export function ContactsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contact Numbers"
        description="Phone numbers your voice agent can route callers to."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Contact Numbers" }]}
        LinkComponent={Link}
      />
      <ContactList />
    </div>
  );
}
