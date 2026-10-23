import { describe, expect, it } from "vitest";
import type { AgentRequest, Client } from "@sandy/shared-types";
import { mapClientDataToAgentConfig, type ClientMappingContext } from "./mapping";
import { getAtPath } from "./jsonPath";

const client: Client = {
  id: "client_1",
  name: "Test Co",
  businessCategory: "Real Estate",
  contactEmail: "hi@test.co",
  contactPhone: "+1 555 0100",
  submissionStatus: "approved",
  agentStatus: "ready",
  propertyCount: 0,
  compoundCount: 0,
  locationCount: 0,
  contactNumberCount: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const baseContext: ClientMappingContext = {
  client,
  businessProfile: null,
  properties: [],
  compounds: [],
  faqs: [],
  contacts: [],
  agentRequest: null,
};

const agentRequest: AgentRequest = {
  id: "req_1",
  clientId: "client_1",
  label: "English Concierge",
  businessType: "real_estate_developer",
  voiceGender: "female",
  language: "bilingual",
  arabicDialect: "egyptian",
  tone: "luxury_concierge",
  robotSensitivity: "controlled",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("mapClientDataToAgentConfig", () => {
  it("sets the agent name from the client when no business profile exists", () => {
    const { mappedConfig } = mapClientDataToAgentConfig({}, baseContext);
    expect(getAtPath(mappedConfig, "name")).toBe("Test Co");
  });

  it("preserves unrelated existing fields it does not know about", () => {
    const original = { name: "Old Name", some_unrelated_field: { keep: "me" } };
    const { mappedConfig } = mapClientDataToAgentConfig(original, baseContext);
    expect(getAtPath(mappedConfig, "some_unrelated_field")).toEqual({ keep: "me" });
  });

  it("does not overwrite an existing tools array", () => {
    const original = { conversation_config: { agent: { prompt: { tools: ["existing-tool"] } } } };
    const { mappedConfig, appliedFieldPaths } = mapClientDataToAgentConfig(original, baseContext);
    expect(getAtPath(mappedConfig, "conversation_config.agent.prompt.tools")).toEqual(["existing-tool"]);
    expect(appliedFieldPaths).not.toContain("conversation_config.agent.prompt.tools");
  });

  it("adds a real built-in end_call tool only when none were present", () => {
    const { mappedConfig, appliedFieldPaths } = mapClientDataToAgentConfig({}, baseContext);
    expect(appliedFieldPaths).toContain("conversation_config.agent.prompt.tools");
    const tools = getAtPath(mappedConfig, "conversation_config.agent.prompt.tools");
    expect(Array.isArray(tools)).toBe(true);
    expect((tools as Record<string, unknown>[])[0]?.name).toBe("end_call");
  });

  it("merges dynamic variables instead of discarding existing ones", () => {
    const original = {
      conversation_config: { agent: { dynamic_variables: { dynamic_variable_placeholders: { campaign_name: "Spring Promo" } } } },
    };
    const { mappedConfig } = mapClientDataToAgentConfig(original, baseContext);
    const placeholders = getAtPath(mappedConfig, "conversation_config.agent.dynamic_variables.dynamic_variable_placeholders");
    expect(placeholders).toMatchObject({ campaign_name: "Spring Promo", company_name: "Test Co" });
  });

  it("appends FAQs to the prompt without discarding the template's own prompt text", () => {
    const context: ClientMappingContext = {
      ...baseContext,
      faqs: [{ id: "faq_1", clientId: "client_1", question: "Are you open on Sundays?", answer: "Yes, 9am-5pm.", category: "general", createdAt: "", updatedAt: "" }],
    };
    const original = { conversation_config: { agent: { prompt: { prompt: "You are a helpful concierge." } } } };
    const { mappedConfig } = mapClientDataToAgentConfig(original, context);
    const prompt = String(getAtPath(mappedConfig, "conversation_config.agent.prompt.prompt"));
    expect(prompt).toContain("You are a helpful concierge.");
    expect(prompt).toContain("Are you open on Sundays?");
  });

  it("maps robot sensitivity onto the real voice-stability field", () => {
    const context: ClientMappingContext = { ...baseContext, agentRequest };
    const { mappedConfig } = mapClientDataToAgentConfig({}, context);
    expect(getAtPath(mappedConfig, "conversation_config.tts.stability")).toBe(0.75);
  });

  it("adds an English language preset for a bilingual request without inventing a new field shape", () => {
    const context: ClientMappingContext = { ...baseContext, agentRequest };
    const { mappedConfig } = mapClientDataToAgentConfig({}, context);
    expect(getAtPath(mappedConfig, "conversation_config.agent.language")).toBe("ar");
    expect(getAtPath(mappedConfig, "conversation_config.language_presets.en")).toBeDefined();
  });

  it("produces the same mapped output for the same inputs (deterministic)", () => {
    const context: ClientMappingContext = { ...baseContext, agentRequest };
    const first = mapClientDataToAgentConfig({ name: "Base" }, context);
    const second = mapClientDataToAgentConfig({ name: "Base" }, context);
    expect(first.mappedConfig).toEqual(second.mappedConfig);
  });
});
