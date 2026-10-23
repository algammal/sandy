import type { ID, ISODateString } from "./common";

/**
 * ElevenLabs does not guarantee a single stable export schema, so these types
 * describe a provisional, generic shape this platform understands. Anything
 * outside `KNOWN_AGENT_FIELD_PATHS` is treated as an "unknown field" and is
 * preserved, never discarded.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AgentConfigImportSource = "file" | "paste" | "template";

export type ValidationSeverity = "warning" | "error";

/**
 * Local draft identifiers and future ElevenLabs agent identifiers are kept as
 * distinct branded string types on purpose — a draft id must never be
 * mistaken for (or passed where the platform expects) a real external agent
 * id once that integration exists.
 */
export type DraftConfigId = string & { readonly __brand: "DraftConfigId" };
export type ElevenLabsAgentId = string & { readonly __brand: "ElevenLabsAgentId" };

export function toDraftConfigId(value: string): DraftConfigId {
  return value as DraftConfigId;
}

/** Only ever used to label a *simulated* demo reference — never a real ElevenLabs id. */
export function toSimulatedElevenLabsAgentId(value: string): ElevenLabsAgentId {
  return value as ElevenLabsAgentId;
}

export type VoiceGender = "male" | "female";

export type AgentLanguagePreference = "arabic" | "english" | "bilingual";

export type ArabicDialect = "egyptian" | "msa" | "gulf" | "levantine" | "maghrebi";

export type VoiceTone =
  | "professional"
  | "friendly"
  | "luxury_concierge"
  | "formal"
  | "warm"
  | "sales_oriented";

/**
 * A frontend-only preference describing how controlled vs. naturally
 * conversational the client wants the agent to sound. This is NOT a real
 * ElevenLabs parameter — it is mapped, where possible, onto genuinely
 * supported fields (e.g. voice stability) by the mapping layer, and the
 * mapping explicitly records which target field it affected.
 */
export type RobotSensitivity = "natural" | "balanced" | "controlled";

export interface AgentRequest {
  id: ID;
  clientId: ID;
  label: string;
  businessType: string;
  voiceGender: VoiceGender;
  language: AgentLanguagePreference;
  arabicDialect?: ArabicDialect;
  tone: VoiceTone;
  robotSensitivity: RobotSensitivity;
  customInstructions?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type MasterAccountIntegrationStatus = "not_connected" | "planned" | "connected_demo";

/**
 * Placeholder model for the planned master/child ElevenLabs account
 * relationship. Nothing here implies a real account, API, or credit-sharing
 * behavior exists yet — see the `notes` field for the explicit disclaimer
 * shown in the UI.
 */
export interface MasterAccountStatus {
  integrationStatus: MasterAccountIntegrationStatus;
  masterAccountLabel: string | null;
  childWorkspaceIdPlaceholder: string | null;
  lastSyncAt: ISODateString | null;
  syncStatus: "idle" | "syncing_demo" | "synced_demo" | "error_demo";
  notes: string;
}

export interface AgentConfigValidationIssue {
  path: string;
  message: string;
  severity: ValidationSeverity;
}

/** A supported, inspectable field of the provisional agent schema. */
export interface SupportedAgentField {
  path: string;
  label: string;
  description: string;
}

export interface AgentConfiguration {
  id: DraftConfigId;
  clientId: ID | null;
  /** Links this draft back to the specific requested agent it was generated for, if any. */
  agentRequestId: ID | null;
  name: string;
  version: number;
  importSource: AgentConfigImportSource;
  rawConfig: Record<string, JsonValue>;
  mappedConfig: Record<string, JsonValue>;
  supportedFieldPaths: string[];
  unknownFieldPaths: string[];
  validationIssues: AgentConfigValidationIssue[];
  createdAt: ISODateString;
}

export type AgentInstanceStatus =
  | "not_configured"
  | "draft"
  | "provisioning"
  | "active"
  | "provisioning_failed";

export interface AgentInstance {
  id: ID;
  clientId: ID;
  agentName: string;
  /** Always null until a demo provisioning run completes; never a real ElevenLabs ID. */
  elevenLabsAgentIdPlaceholder: ElevenLabsAgentId | null;
  status: AgentInstanceStatus;
  configurationVersion: number;
  lastSyncAt: ISODateString | null;
  lastError: string | null;
}

export type ProvisioningOutcome = "succeeded_demo" | "failed_demo";

export interface ProvisioningRecord {
  id: ID;
  clientId: ID;
  agentConfigurationId: DraftConfigId;
  requestedAt: ISODateString;
  completedAt: ISODateString | null;
  outcome: ProvisioningOutcome | null;
  /** Clearly-labelled simulated reference, e.g. "DEMO-AGT-7F21". Never a real agent ID. */
  simulatedReference: ElevenLabsAgentId | null;
  errorMessage: string | null;
}

export interface JsonDiffEntry {
  path: string;
  kind: "added" | "removed" | "changed" | "unchanged";
  before?: JsonValue;
  after?: JsonValue;
}
