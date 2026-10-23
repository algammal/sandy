import type { JsonValue } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";

/**
 * Shaped after the real structured procedures in the sanitized export
 * (`procedures/structured/*.json`): a deterministic rule with a trigger
 * condition and a fixed response. `content` is itself a JSON string in the
 * real export (ElevenLabs serializes the step list that way), so this keeps
 * the same shape rather than inventing a cleaner one.
 */
export interface StructuredProcedure {
  procedure_id: string;
  name: string;
  type: "deterministic";
  trigger: string;
  content: string;
  guardrails: JsonValue[];
  referenced_procedure_ids: string[];
}

export function buildStructuredProcedure(input: { name: string; trigger: string; message: string }): StructuredProcedure {
  return {
    procedure_id: `agtprc_demo_${generateId().slice(0, 12)}`,
    name: input.name,
    type: "deterministic",
    trigger: input.trigger,
    content: JSON.stringify({
      steps: [
        { type: "say", message: input.message },
        { type: "system_tool", system_tool_name: "end_call" },
      ],
    }),
    guardrails: [],
    referenced_procedure_ids: [],
  };
}

function looksLikeProcedure(entry: JsonValue): entry is Record<string, JsonValue> {
  return typeof entry === "object" && entry !== null && !Array.isArray(entry) && typeof entry.name === "string";
}

/** Reads the `procedures` array off a config object, tolerating it being absent or malformed rather than throwing. */
export function listProcedures(config: Record<string, JsonValue>): StructuredProcedure[] {
  const raw = config.procedures;
  if (!Array.isArray(raw)) return [];
  return raw.filter(looksLikeProcedure).map((entry) => entry as unknown as StructuredProcedure);
}

/**
 * Real structured-procedure names from the reference export package, offered
 * as one-click starting points — never auto-added, and never claiming to
 * replicate the real trigger/response wording exactly (that content is
 * business-specific to the reference agent, not this platform's clients).
 */
export const PROCEDURE_CATALOG = [
  { name: "Do-not-call request", trigger: "The caller asks not to be contacted again." },
  { name: "Asks for a human", trigger: "The caller asks to speak with a person instead of the AI agent." },
  { name: "Pricing question", trigger: "The caller asks how much the service costs." },
  { name: "Busy — call back later", trigger: "The caller is busy and asks to be called back at another time." },
  { name: "Send me information", trigger: "The caller asks for information to be sent instead of continuing the call." },
  { name: "Follow-up capture", trigger: "The caller agrees to a follow-up and a preferred time/channel needs to be recorded." },
] as const;

export interface ProcedureRow {
  procedure: StructuredProcedure;
  /** "catalog" = present in the original import (rawConfig) — toggling is reversible. "custom" = added here — toggling off deletes it. */
  source: "catalog" | "custom";
  included: boolean;
}

/**
 * Builds the merged row list the Agent Studio procedures panel renders:
 * every procedure from the original import ("catalog", toggleable) plus any
 * procedure present in the working draft but not the original ("custom",
 * removable). Pure and synchronous so it's trivial to test independent of
 * Redux or the DOM.
 */
export function buildProcedureRows(rawConfig: Record<string, JsonValue>, mappedConfig: Record<string, JsonValue>): ProcedureRow[] {
  const catalog = listProcedures(rawConfig);
  const active = listProcedures(mappedConfig);
  const activeIds = new Set(active.map((p) => p.procedure_id));
  const catalogIds = new Set(catalog.map((p) => p.procedure_id));

  const catalogRows: ProcedureRow[] = catalog.map((procedure) => ({
    procedure,
    source: "catalog",
    included: activeIds.has(procedure.procedure_id),
  }));
  const customRows: ProcedureRow[] = active
    .filter((procedure) => !catalogIds.has(procedure.procedure_id))
    .map((procedure) => ({ procedure, source: "custom", included: true }));

  return [...catalogRows, ...customRows];
}
