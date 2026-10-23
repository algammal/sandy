import type {
  AgentRequest,
  AmenityRecord,
  BusinessProfile,
  Client,
  ClientSubmissionBundle,
  Compound,
  ContactNumber,
  Faq,
  Location,
  Property,
} from "@sandy/shared-types";
import { CLIENT_SUBMISSION_BUNDLE_SCHEMA_VERSION } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";

export interface BuildSubmissionBundleInput {
  client: Pick<Client, "id" | "name" | "businessCategory" | "contactEmail" | "contactPhone">;
  businessProfile: BusinessProfile;
  properties: Property[];
  compounds: Compound[];
  locations: Location[];
  contacts: ContactNumber[];
  faqs: Faq[];
  amenities: AmenityRecord[];
  agentRequests: AgentRequest[];
  submissionId?: string;
}

/**
 * Pure builder for the payload that bridges the Client Portal to the
 * Internal Dashboard in this demo phase (see `ClientSubmissionBundle` in
 * `@sandy/shared-types` for why this exists instead of relying on shared
 * browser storage across the two apps' separate origins).
 */
export function buildSubmissionBundle(input: BuildSubmissionBundleInput): ClientSubmissionBundle {
  return {
    schemaVersion: CLIENT_SUBMISSION_BUNDLE_SCHEMA_VERSION,
    submissionId: input.submissionId ?? generateId("submission"),
    client: {
      id: input.client.id,
      name: input.client.name,
      businessCategory: input.client.businessCategory,
      contactEmail: input.client.contactEmail,
      contactPhone: input.client.contactPhone,
    },
    businessProfile: input.businessProfile,
    properties: input.properties,
    compounds: input.compounds,
    locations: input.locations,
    contacts: input.contacts,
    faqs: input.faqs,
    amenities: input.amenities,
    agentRequests: input.agentRequests,
    submittedAt: new Date().toISOString(),
  };
}
