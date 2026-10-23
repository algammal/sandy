import type { JsonValue } from "@sandy/shared-types";
import { getAtPath, setAtPath } from "./jsonPath";

export interface PickedFile {
  /** Relative path within the selected folder, e.g. "agent-config/agent.sanitized.json". Forward slashes. */
  path: string;
  content: string;
}

export interface FolderImportSummary {
  baseFileName: string;
  procedureCount: number;
  knowledgeDocCount: number;
}

export type FolderImportResult = { ok: true; mergedJson: string; summary: FolderImportSummary } | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tryParseJson(content: string): Record<string, JsonValue> | undefined {
  try {
    const parsed = JSON.parse(content);
    return isPlainObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function fileStem(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.[^.]+$/, "");
}

/**
 * Merges a whole exported-package folder (base agent config + structured
 * procedures + knowledge-base documents) into one configuration object, so
 * importing doesn't require staff to hand-assemble pieces that the export
 * already ships as separate files. Pure and synchronous — the caller reads
 * File objects into `PickedFile[]` first (see ImportPanel.tsx).
 */
export function mergeConfigFolder(files: PickedFile[]): FolderImportResult {
  if (files.length === 0) {
    return { ok: false, error: "The selected folder is empty." };
  }

  const jsonFiles = files
    .filter((file) => file.path.toLowerCase().endsWith(".json"))
    .map((file) => ({ ...file, parsed: tryParseJson(file.content) }))
    .filter((file): file is PickedFile & { parsed: Record<string, JsonValue> } => file.parsed !== undefined);

  const baseCandidate =
    jsonFiles.find((file) => /agent.*sanitized/i.test(file.path) && isPlainObject(file.parsed.conversation_config)) ??
    jsonFiles.find((file) => isPlainObject(file.parsed.conversation_config));

  if (!baseCandidate) {
    return {
      ok: false,
      error:
        "No agent configuration file found in this folder (expected a JSON file with a conversation_config field, e.g. agent-config/agent.sanitized.json).",
    };
  }

  let merged: Record<string, JsonValue> = baseCandidate.parsed;

  const procedureFiles = jsonFiles.filter(
    (file) =>
      file.path !== baseCandidate.path &&
      /procedures?[\\/].*structured|structured[\\/]/i.test(file.path) &&
      typeof file.parsed.name === "string" &&
      (typeof file.parsed.trigger === "string" || typeof file.parsed.procedure_id === "string"),
  );

  if (procedureFiles.length > 0) {
    const existingProcedures = getAtPath(merged, "procedures");
    const existingList = Array.isArray(existingProcedures) ? existingProcedures : [];
    const existingIds = new Set(
      existingList
        .map((entry) => (isPlainObject(entry) ? entry.procedure_id : undefined))
        .filter((id): id is string => typeof id === "string"),
    );
    const newProcedures = procedureFiles
      .map((file) => file.parsed)
      .filter((procedure) => {
        const id = procedure.procedure_id;
        return typeof id !== "string" || !existingIds.has(id);
      });
    merged = setAtPath(merged, "procedures", [...existingList, ...newProcedures]);
  }

  const knowledgeFiles = files.filter((file) => /knowledge-base[\\/]/i.test(file.path) && file.path.toLowerCase().endsWith(".md"));

  if (knowledgeFiles.length > 0) {
    const existingDocs = getAtPath(merged, "conversation_config.agent.prompt.knowledge_base");
    const existingList = Array.isArray(existingDocs) ? existingDocs : [];
    const existingNames = new Set(
      existingList.map((entry) => (isPlainObject(entry) ? entry.name : undefined)).filter((name): name is string => typeof name === "string"),
    );
    const newDocs: JsonValue[] = knowledgeFiles
      .filter((file) => !existingNames.has(fileStem(file.path)))
      .map((file) => ({
        id: fileStem(file.path).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: fileStem(file.path),
        type: "text",
        content: file.content,
      }));
    merged = setAtPath(merged, "conversation_config.agent.prompt.knowledge_base", [...existingList, ...newDocs]);
  }

  return {
    ok: true,
    mergedJson: JSON.stringify(merged, null, 2),
    summary: {
      baseFileName: baseCandidate.path,
      procedureCount: procedureFiles.length,
      knowledgeDocCount: knowledgeFiles.length,
    },
  };
}
