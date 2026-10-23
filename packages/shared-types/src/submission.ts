import type { ContactNumber, ID, ISODateString } from "./common";
import type { AmenityRecord, BusinessProfile, Compound, Faq, Location, Property } from "./business";
import type { AgentRequest } from "./agent";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "provisioning"
  | "active"
  | "provisioning_failed";

export const SUBMISSION_STATUS_ORDER: SubmissionStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "changes_requested",
  "approved",
  "provisioning",
  "active",
  "provisioning_failed",
];

export interface SubmissionHistoryEntry {
  id: ID;
  status: SubmissionStatus;
  note?: string;
  actorName: string;
  createdAt: ISODateString;
}

export interface Submission {
  id: ID;
  clientId: ID;
  status: SubmissionStatus;
  completionPercentage: number;
  submittedAt?: ISODateString;
  lastReviewedAt?: ISODateString;
  history: SubmissionHistoryEntry[];
}

export type ReviewNoteVisibility = "internal" | "client_visible";

export interface ReviewNote {
  id: ID;
  clientId: ID;
  authorName: string;
  visibility: ReviewNoteVisibility;
  message: string;
  createdAt: ISODateString;
}

export const CLIENT_SUBMISSION_BUNDLE_SCHEMA_VERSION = 1 as const;

/**
 * The payload a client submits from the Client Portal and the Internal
 * Dashboard imports to materialize that client's workspace. This is the
 * explicit, user-driven bridge between the two separate-origin frontend
 * applications in this demo phase — there is no shared backend yet, so
 * nothing crosses between them automatically. See `services/submissionBridgeService`
 * in each app for the replaceable adapter boundary.
 */
export interface ClientSubmissionBundle {
  schemaVersion: typeof CLIENT_SUBMISSION_BUNDLE_SCHEMA_VERSION;
  submissionId: ID;
  client: {
    id: ID;
    name: string;
    businessCategory: string;
    contactEmail: string;
    contactPhone: string;
  };
  businessProfile: BusinessProfile;
  properties: Property[];
  compounds: Compound[];
  locations: Location[];
  contacts: ContactNumber[];
  faqs: Faq[];
  amenities: AmenityRecord[];
  agentRequests: AgentRequest[];
  submittedAt: ISODateString;
}
