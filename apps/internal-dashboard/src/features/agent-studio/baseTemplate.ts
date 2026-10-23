import type { JsonValue } from "@sandy/shared-types";

/**
 * A minimal, generic starting point used when the internal dashboard
 * auto-generates a configuration draft for a requested agent instead of
 * requiring staff to import a file first. It intentionally only fills in
 * the fields this platform understands (see `configSchema.ts`) — everything
 * else a real ElevenLabs export carries (workflow graphs, guardrails,
 * analysis settings, etc.) is left for staff to add via a real import when
 * they're ready to go further than this demo.
 */
export function createBlankAgentTemplate(): Record<string, JsonValue> {
  return {
    name: "Untitled Agent",
    tags: ["auto-generated", "demo"],
    conversation_config: {
      agent: {
        first_message: "",
        language: "en",
        dynamic_variables: { dynamic_variable_placeholders: {} },
        prompt: {
          prompt: "You are a helpful AI voice receptionist. Be concise, honest, and never invent information you don't have.",
          llm: "claude-haiku-4-5",
          temperature: 0.3,
          tools: [],
          knowledge_base: [],
        },
      },
      tts: {
        model_id: "eleven_v3_conversational",
        stability: 0.5,
        speed: 1,
        similarity_boost: 0.8,
      },
    },
  };
}
