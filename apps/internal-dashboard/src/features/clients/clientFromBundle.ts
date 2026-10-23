import type { Client, ClientSubmissionBundle } from "@sandy/shared-types";

/** Builds (or refreshes) the internal dashboard's Client record from an imported submission bundle. */
export function clientFromBundle(bundle: ClientSubmissionBundle, existing?: Client): Client {
  const now = new Date().toISOString();
  return {
    id: bundle.client.id,
    name: bundle.client.name,
    businessCategory: bundle.client.businessCategory,
    contactEmail: bundle.client.contactEmail,
    contactPhone: bundle.client.contactPhone,
    submissionStatus: "submitted",
    agentStatus: existing?.agentStatus ?? "not_configured",
    propertyCount: bundle.properties.length,
    compoundCount: bundle.compounds.length,
    locationCount: bundle.locations.length,
    contactNumberCount: bundle.contacts.length,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
