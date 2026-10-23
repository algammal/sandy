import { describe, expect, it } from "vitest";
import { parseAgentConfigJson } from "./parseConfig";

describe("parseAgentConfigJson", () => {
  it("rejects empty input", () => {
    const result = parseAgentConfigJson("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/empty/i);
  });

  it("rejects invalid JSON", () => {
    const result = parseAgentConfigJson("{ not valid json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/invalid json/i);
  });

  it("rejects a JSON array as the root", () => {
    const result = parseAgentConfigJson("[1, 2, 3]");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/object/i);
  });

  it("flags a missing agent name as an error-severity issue", () => {
    const result = parseAgentConfigJson(JSON.stringify({ conversation_config: {} }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues.some((issue) => issue.path === "name" && issue.severity === "error")).toBe(true);
    }
  });

  it("flags a missing conversation_config as an error", () => {
    const result = parseAgentConfigJson(JSON.stringify({ name: "Test Agent" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues.some((issue) => issue.path === "conversation_config" && issue.severity === "error")).toBe(true);
    }
  });

  it("detects supported fields that are present", () => {
    const result = parseAgentConfigJson(
      JSON.stringify({
        name: "Test Agent",
        conversation_config: {
          agent: { first_message: "Hello!", language: "en", prompt: { prompt: "Be helpful." } },
          tts: { voice_id: "voice_123" },
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.supportedFieldPaths).toContain("conversation_config.agent.first_message");
      expect(result.supportedFieldPaths).toContain("conversation_config.tts.voice_id");
      expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    }
  });

  it("recognizes a realistic export shape (dynamic variables, language presets, tts tuning) without false unknown-field noise", () => {
    const result = parseAgentConfigJson(
      JSON.stringify({
        agent_id: "agnt_live_synth_89x0",
        name: "Base Template AI Receptionist",
        tags: ["b2b", "test-only"],
        conversation_config: {
          asr: { quality: "high", provider: "scribe_realtime" },
          turn: { turn_timeout: 8, mode: "turn" },
          agent: {
            first_message: "Hi {{contact_name}}, this is {{agent_name}}.",
            language: "en",
            dynamic_variables: { dynamic_variable_placeholders: { agent_name: "Sara", contact_name: "Ahmed" } },
            prompt: {
              prompt: "You are a helpful assistant.",
              llm: "claude-haiku-4-5",
              temperature: 0.2,
              tools: [],
              knowledge_base: [],
            },
          },
          tts: { model_id: "eleven_v3_conversational", voice_id: "L10lEremDiJfPicq5CPh", stability: 0.5, speed: 0.97 },
          language_presets: { ar: { overrides: { agent: { first_message: "أهلاً" } } } },
        },
        metadata: { created_at_unix_secs: 1, updated_at_unix_secs: 2 },
        platform_settings: { guardrails: { version: "1" } },
        phone_numbers: [],
        whatsapp_accounts: [],
        workflow: { edges: {}, nodes: {} },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.unknownFieldPaths).toEqual([]);
      expect(result.supportedFieldPaths).toContain("conversation_config.agent.dynamic_variables.dynamic_variable_placeholders");
      expect(result.supportedFieldPaths).toContain("conversation_config.language_presets");
      expect(result.supportedFieldPaths).toContain("conversation_config.tts.stability");
    }
  });

  it("preserves unrecognized fields as unknown rather than dropping them", () => {
    const result = parseAgentConfigJson(
      JSON.stringify({
        name: "Test Agent",
        conversation_config: { agent: { first_message: "Hi", custom_field: "surprise" } },
        totally_custom_top_level: { nested: true },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.unknownFieldPaths).toContain("totally_custom_top_level");
      expect(result.unknownFieldPaths).toContain("conversation_config.agent.custom_field");
      expect(result.config.totally_custom_top_level).toEqual({ nested: true });
    }
  });
});
