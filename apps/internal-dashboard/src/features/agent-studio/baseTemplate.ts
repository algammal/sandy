import type { JsonValue } from "@sandy/shared-types";

/**
 * The one default base template every auto-generated configuration draft
 * starts from. Its *structure* mirrors the real sanitized ElevenLabs export
 * in `apps/ai-sales-employee-test-package/agent-config/agent.sanitized.json`
 * (asr, turn, tts, conversation, vad, agent.prompt.{llm,temperature,
 * built_in_tools}) — not a thin guessed subset — because the mapper and the
 * rest of Agent Studio are grounded in that real shape. The *content*
 * (persona, greeting, dynamic variable names) is generic and neutral rather
 * than copied from that reference agent: the reference is a B2B outbound
 * sales caller for a different business; this platform's clients run
 * inbound receptionist/concierge agents, so `mapping.ts` fills in the real
 * persona per client on top of this shell.
 *
 * `agent.prompt.tools` is deliberately left unset (the real export doesn't
 * have that path either — it uses `tool_ids` + `built_in_tools`) so the
 * mapper's own default-tool logic applies the same way it does for any
 * import that lacks it.
 */
export function createDefaultAgentTemplate(): Record<string, JsonValue> {
  return {
    name: "Untitled Agent",
    tags: ["auto-generated", "demo"],
    conversation_config: {
      asr: {
        quality: "high",
        provider: "scribe_realtime",
        user_input_audio_format: "pcm_16000",
        keywords: [],
      },
      turn: {
        turn_timeout: 8,
        silence_end_call_timeout: 30,
        mode: "turn",
        turn_eagerness: "normal",
      },
      tts: {
        model_id: "eleven_v3_conversational",
        voice_id: null,
        stability: 0.5,
        speed: 1,
        similarity_boost: 0.8,
        optimize_streaming_latency: 3,
      },
      conversation: {
        text_only: false,
        max_duration_seconds: 600,
      },
      vad: {
        background_voice_detection: false,
      },
      agent: {
        first_message: "",
        language: "en",
        dynamic_variables: { dynamic_variable_placeholders: {} },
        prompt: {
          prompt: "You are a helpful AI voice receptionist. Be concise, honest, and never invent information you don't have.",
          llm: "claude-haiku-4-5",
          temperature: 0.3,
          tool_ids: [],
          tool_ids_strict: false,
          knowledge_base: [],
          built_in_tools: {
            end_call: {
              type: "system",
              name: "end_call",
              description: "End the call once the conversation has reached a natural close.",
              params: { system_tool_type: "end_call" },
            },
          },
        },
      },
    },
  };
}
