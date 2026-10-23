import type { ClientSubmissionBundle } from "@sandy/shared-types";
import { CLIENT_SUBMISSION_BUNDLE_SCHEMA_VERSION } from "@sandy/shared-types";

export function serializeSubmissionBundle(bundle: ClientSubmissionBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export type ParsedSubmissionBundle = { ok: true; bundle: ClientSubmissionBundle } | { ok: false; error: string };

const REQUIRED_KEYS: (keyof ClientSubmissionBundle)[] = [
  "schemaVersion",
  "submissionId",
  "client",
  "businessProfile",
  "properties",
  "compounds",
  "locations",
  "contacts",
  "faqs",
  "agentRequests",
  "submittedAt",
];

/**
 * Parses and structurally validates a client submission bundle. Never
 * throws — JSON and shape problems come back as a typed failure so the UI
 * can show a useful message instead of a stack trace.
 */
export function parseSubmissionBundle(rawText: string): ParsedSubmissionBundle {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { ok: false, error: "The submission file is empty." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return { ok: false, error: `Invalid JSON: ${message}` };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "A client submission must be a JSON object." };
  }

  const record = parsed as Record<string, unknown>;
  const missing = REQUIRED_KEYS.filter((key) => !(key in record));
  if (missing.length > 0) {
    return { ok: false, error: `Missing required field(s): ${missing.join(", ")}.` };
  }

  if (record.schemaVersion !== CLIENT_SUBMISSION_BUNDLE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported submission schema version "${String(record.schemaVersion)}" (expected ${CLIENT_SUBMISSION_BUNDLE_SCHEMA_VERSION}).`,
    };
  }

  return { ok: true, bundle: parsed as ClientSubmissionBundle };
}
