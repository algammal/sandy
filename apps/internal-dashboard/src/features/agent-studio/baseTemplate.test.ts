import { describe, expect, it } from "vitest";
import { createDefaultAgentTemplate } from "./baseTemplate";
import { getAtPath } from "./jsonPath";
import { mapClientDataToAgentConfig, type ClientMappingContext } from "./mapping";
import { parseAgentConfigJson } from "./parseConfig";
import type { Client } from "@sandy/shared-types";

describe("createDefaultAgentTemplate", () => {
  it("includes every real top-level conversation_config section the schema understands", () => {
    const template = createDefaultAgentTemplate();
    for (const section of ["asr", "turn", "tts", "conversation", "vad", "agent"]) {
      expect(getAtPath(template, `conversation_config.${section}`)).toBeDefined();
    }
  });

  it("leaves agent.prompt.tools unset so the mapper's default-tool logic applies", () => {
    const template = createDefaultAgentTemplate();
    expect(getAtPath(template, "conversation_config.agent.prompt.tools")).toBeUndefined();
  });

  it("parses without blocking errors", () => {
    const result = parseAgentConfigJson(JSON.stringify(createDefaultAgentTemplate()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
    }
  });

  it("is a valid base for mapping client data onto", () => {
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
    const context: ClientMappingContext = {
      client,
      businessProfile: null,
      properties: [],
      compounds: [],
      faqs: [],
      contacts: [],
      agentRequest: null,
    };
    const { mappedConfig } = mapClientDataToAgentConfig(createDefaultAgentTemplate(), context);
    expect(mappedConfig.name).toBe("Test Co");
    expect(getAtPath(mappedConfig, "conversation_config.agent.prompt.tools")).toBeDefined();
    expect(getAtPath(mappedConfig, "conversation_config.tts.model_id")).toBe("eleven_v3_conversational");
  });
});
