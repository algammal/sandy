/**
 * App-specific type re-exports. Domain entity types (Property, Compound,
 * BusinessProfile, etc.) live in the shared `@sandy/shared-types` package so
 * the internal dashboard can consume the same shapes — this module exists
 * so feature code can import either from one place within this app.
 */
export type {
  Address,
  AgentLanguagePreference,
  AgentRequest,
  ArabicDialect,
  AmenityRecord,
  BusinessHoursEntry,
  BusinessPolicy,
  BusinessProfile,
  Client,
  ClientSubmissionBundle,
  Compound,
  ContactLabel,
  ContactNumber,
  Coordinates,
  Faq,
  FaqCategory,
  Location,
  Property,
  PropertyType,
  RequestStatus,
  RobotSensitivity,
  Submission,
  SubmissionHistoryEntry,
  SubmissionStatus,
  VoiceGender,
  VoiceTone,
} from "@sandy/shared-types";
