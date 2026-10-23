/**
 * App-specific type re-exports, plus types unique to the internal dashboard
 * that don't belong in the shared package (business-info bundling, mapping
 * context). Domain entity types still live in `@sandy/shared-types`.
 */
export type {
  ActivityLogEntry,
  AgentConfiguration,
  AgentConfigValidationIssue,
  AgentInstance,
  Client,
  JsonDiffEntry,
  ProvisioningRecord,
  RequestStatus,
  ReviewNote,
  SubmissionStatus,
  SupportedAgentField,
} from "@sandy/shared-types";

export type { ClientBusinessInfo } from "../services/businessInfoSeed";
export type { ClientMappingContext } from "../features/agent-studio/mapping";
