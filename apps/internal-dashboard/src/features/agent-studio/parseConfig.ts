import type { AgentConfigValidationIssue, JsonValue } from "@sandy/shared-types";
import { getAtPath } from "./jsonPath";
import {
  KNOWN_AGENT_KEYS,
  KNOWN_CONVERSATION_CONFIG_KEYS,
  KNOWN_PROMPT_KEYS,
  KNOWN_TTS_KEYS,
  SUPPORTED_AGENT_FIELD_PATHS,
  TOP_LEVEL_EXPECTED_KEYS,
} from "./configSchema";

export interface ParsedAgentConfig {
  ok: true;
  config: Record<string, JsonValue>;
  supportedFieldPaths: string[];
  unknownFieldPaths: string[];
  issues: AgentConfigValidationIssue[];
}

export interface ParseFailure {
  ok: false;
  error: string;
}

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownKeysAt(obj: JsonValue | undefined, knownKeys: string[], pathPrefix: string): string[] {
  if (!isPlainObject(obj)) return [];
  return Object.keys(obj)
    .filter((key) => !knownKeys.includes(key))
    .map((key) => `${pathPrefix}.${key}`);
}

function findUnknownPaths(config: Record<string, JsonValue>): string[] {
  const unknown: string[] = [
    ...Object.keys(config).filter((key) => !TOP_LEVEL_EXPECTED_KEYS.includes(key)),
    ...unknownKeysAt(config.conversation_config, KNOWN_CONVERSATION_CONFIG_KEYS, "conversation_config"),
    ...unknownKeysAt(getAtPath(config, "conversation_config.agent"), KNOWN_AGENT_KEYS, "conversation_config.agent"),
    ...unknownKeysAt(
      getAtPath(config, "conversation_config.agent.prompt"),
      KNOWN_PROMPT_KEYS,
      "conversation_config.agent.prompt",
    ),
    ...unknownKeysAt(getAtPath(config, "conversation_config.tts"), KNOWN_TTS_KEYS, "conversation_config.tts"),
  ];
  return unknown;
}

/**
 * Parses and validates a raw JSON string against the ElevenLabs agent schema
 * documented in `configSchema.ts` (grounded in a real sanitized export).
 * Never throws — JSON and structural problems are returned as a typed
 * failure so the UI can show a useful message instead of a stack trace.
 */
export function parseAgentConfigJson(rawText: string): ParsedAgentConfig | ParseFailure {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { ok: false, error: "The configuration is empty. Paste JSON or upload a file to continue." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return { ok: false, error: `Invalid JSON: ${message}` };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: "The root of an agent configuration must be a JSON object, not an array or primitive." };
  }

  const config = parsed;
  const issues: AgentConfigValidationIssue[] = [];

  const name = config.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    issues.push({ path: "name", message: "Missing agent name.", severity: "error" });
  }

  const conversationConfig = config.conversation_config;
  if (!isPlainObject(conversationConfig)) {
    issues.push({
      path: "conversation_config",
      message: "Missing conversation_config — this file may not be a supported ElevenLabs agent export.",
      severity: "error",
    });
  } else {
    if (!getAtPath(config, "conversation_config.agent.first_message")) {
      issues.push({
        path: "conversation_config.agent.first_message",
        message: "No greeting set; the agent will wait for the caller to speak first.",
        severity: "warning",
      });
    }
    if (!getAtPath(config, "conversation_config.agent.prompt.prompt")) {
      issues.push({
        path: "conversation_config.agent.prompt.prompt",
        message: "No system prompt found; add agent instructions before provisioning.",
        severity: "warning",
      });
    }
    if (!getAtPath(config, "conversation_config.tts.voice_id")) {
      issues.push({
        path: "conversation_config.tts.voice_id",
        message: "No voice selected; a default ElevenLabs voice will be used.",
        severity: "warning",
      });
    }
  }

  const unknownFieldPaths = findUnknownPaths(config);
  for (const path of unknownFieldPaths) {
    issues.push({ path, message: `Unrecognized field "${path}" was preserved but is not interpreted by this platform.`, severity: "warning" });
  }

  const supportedFieldPaths = SUPPORTED_AGENT_FIELD_PATHS.filter((path) => getAtPath(config, path) !== undefined);

  return { ok: true, config, supportedFieldPaths, unknownFieldPaths, issues };
}
