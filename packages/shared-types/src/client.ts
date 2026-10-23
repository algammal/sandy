import type { ID, ISODateString } from "./common";
import type { SubmissionStatus } from "./submission";

export type AgentStatus =
  | "not_configured"
  | "draft"
  | "ready"
  | "provisioning"
  | "active"
  | "provisioning_failed";

export interface Client {
  id: ID;
  name: string;
  businessCategory: string;
  contactEmail: string;
  contactPhone: string;
  submissionStatus: SubmissionStatus;
  agentStatus: AgentStatus;
  propertyCount: number;
  compoundCount: number;
  locationCount: number;
  contactNumberCount: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
