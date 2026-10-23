import type { SupportedAgentField } from "@sandy/shared-types";

/**
 * This shape is grounded in a real, sanitized ElevenLabs Conversational AI
 * agent export (`agent.sanitized.json`) rather than guessed from the public
 * docs alone. ElevenLabs still doesn't guarantee every export looks
 * identical — new accounts, agent types or API versions can add or omit
 * fields — so this remains a best-effort, inspectable list: everything
 * listed here is understood and mappable; everything else on an imported
 * file is preserved untouched and surfaced as an "unknown field" rather
 * than discarded.
 *
 * Deliberately NOT modeled field-by-field (kept as large opaque, preserved
 * blocks instead): `workflow` (visual call-flow graph), `procedures`,
 * `platform_settings.{evaluation,guardrails,privacy,data_collection,...}`,
 * `access_permissions`, `metadata`, `version_id`/`branch_id`. These are real
 * and valuable, but editing them safely needs dedicated graph/rule editors
 * that are out of scope for this phase — silently rewriting them would risk
 * corrupting a real export, so the mapper leaves them exactly as imported.
 */
export const SUPPORTED_AGENT_FIELDS: SupportedAgentField[] = [
  { path: "name", label: "Agent name", description: "Internal name for this agent configuration." },
  { path: "tags", label: "Tags", description: "Free-form labels for organizing agents in the workspace." },
  {
    path: "conversation_config.agent.language",
    label: "Primary language",
    description: "The language the agent defaults to (e.g. \"en\", \"ar\").",
  },
  {
    path: "conversation_config.agent.first_message",
    label: "Greeting / first message",
    description: "The first thing the agent says when a call connects. May reference {{dynamic_variables}}.",
  },
  {
    path: "conversation_config.agent.dynamic_variables.dynamic_variable_placeholders",
    label: "Dynamic variables",
    description:
      "Named values (e.g. company_name, contact_name) the prompt and first message reference as {{variable}} — the safest place to inject client-specific data without rewriting the template.",
  },
  {
    path: "conversation_config.agent.prompt.prompt",
    label: "Agent instructions (system prompt)",
    description: "Describes the business, persona and behavior rules. Client knowledge is appended, not replaced.",
  },
  {
    path: "conversation_config.agent.prompt.llm",
    label: "LLM",
    description: "The underlying language model driving the agent's responses.",
  },
  {
    path: "conversation_config.agent.prompt.temperature",
    label: "Temperature",
    description: "Response randomness (0 = most deterministic).",
  },
  {
    path: "conversation_config.agent.prompt.knowledge_base",
    label: "Knowledge base documents",
    description: "Documents attached to the agent for retrieval-augmented answers.",
  },
  {
    path: "conversation_config.agent.prompt.tools",
    label: "Runtime tools",
    description: "Tool/function definitions available to the agent at runtime (e.g. end_call, transfer).",
  },
  {
    path: "conversation_config.language_presets",
    label: "Language presets",
    description: "Per-language overrides (e.g. a translated first message) — how a real export supports bilingual agents.",
  },
  {
    path: "conversation_config.tts.voice_id",
    label: "Voice ID",
    description: "The ElevenLabs voice identifier used for speech synthesis.",
  },
  {
    path: "conversation_config.tts.stability",
    label: "Voice stability",
    description: "Higher = more consistent and controlled delivery; lower = more natural, expressive variation.",
  },
  {
    path: "conversation_config.tts.speed",
    label: "Voice speed",
    description: "Playback speed multiplier for synthesized speech.",
  },
  {
    path: "conversation_config.tts.similarity_boost",
    label: "Voice similarity boost",
    description: "How closely the output matches the reference voice.",
  },
  { path: "phone_numbers", label: "Phone numbers", description: "Numbers attached to this agent, if any." },
  { path: "whatsapp_accounts", label: "WhatsApp accounts", description: "WhatsApp channel accounts attached to this agent, if any." },
];

export const SUPPORTED_AGENT_FIELD_PATHS = SUPPORTED_AGENT_FIELDS.map((field) => field.path);

export const TOP_LEVEL_EXPECTED_KEYS = [
  "agent_id",
  "name",
  "tags",
  "conversation_config",
  "metadata",
  "platform_settings",
  "phone_numbers",
  "whatsapp_accounts",
  "workflow",
  "procedures",
  "access_info",
  "access_permissions",
  "version_id",
  "branch_id",
  "main_branch_id",
  "trust_context",
  "default_hold_audio_url",
];

/** Real ElevenLabs built-in system tool names, from `built-in-system-tools.json`. Never invent new ones. */
export const BUILT_IN_TOOL_NAMES = ["end_call", "language_detection", "voicemail_detection"] as const;

/**
 * Maps the frontend-only "natural ↔ controlled" sensitivity preference onto
 * the real, documented `tts.stability` field (0–1) from the sanitized
 * export. Not a new ElevenLabs concept — just a considered default for an
 * existing one.
 */
export const ROBOT_SENSITIVITY_TO_STABILITY: Record<"natural" | "balanced" | "controlled", number> = {
  natural: 0.3,
  balanced: 0.5,
  controlled: 0.75,
};

/**
 * Known-but-not-individually-modeled sibling keys at each nesting level,
 * taken directly from the real sanitized export. Listing them here means a
 * genuine ElevenLabs export doesn't get flooded with spurious "unknown
 * field" warnings for sections this phase doesn't edit (ASR, turn-taking,
 * guardrails, etc.) — they're still preserved byte-for-byte, just not
 * individually inspected.
 */
export const KNOWN_CONVERSATION_CONFIG_KEYS = ["asr", "turn", "tts", "conversation", "language_presets", "vad", "agent"];

export const KNOWN_AGENT_KEYS = [
  "first_message",
  "language",
  "hinglish_mode",
  "dynamic_variables",
  "disable_first_message_interruptions",
  "max_conversation_duration_message",
  "silence_end_call_message",
  "text_behavior_overrides",
  "subagent_config",
  "prompt",
];

export const KNOWN_PROMPT_KEYS = [
  "prompt",
  "llm",
  "service_tier",
  "enable_reasoning_summary",
  "temperature",
  "max_tokens",
  "tool_ids",
  "tool_ids_strict",
  "built_in_tools",
  "rich_content",
  "enable_parallel_tool_calls",
  "mcp_server_ids",
  "native_mcp_server_ids",
  "knowledge_base",
  "ignore_default_personality",
  "rag",
  "timezone",
  "backup_llm_config",
  "cascade_timeout_seconds",
  "tools",
];

export const KNOWN_TTS_KEYS = [
  "model_id",
  "voice_id",
  "supported_voices",
  "expressive_mode",
  "suggested_audio_tags",
  "agent_output_audio_format",
  "optimize_streaming_latency",
  "stability",
  "speed",
  "similarity_boost",
  "clone_strength",
  "text_normalisation_type",
  "pronunciation_dictionary_locators",
  "enable_phoneme_tags",
];
