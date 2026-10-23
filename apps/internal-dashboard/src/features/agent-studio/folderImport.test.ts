import { describe, expect, it } from "vitest";
import { mergeConfigFolder, type PickedFile } from "./folderImport";
import { getAtPath } from "./jsonPath";

const baseConfig = {
  path: "agent-config/agent.sanitized.json",
  content: JSON.stringify({
    name: "AI Sales Employee",
    conversation_config: {
      agent: { first_message: "Hi", language: "ar", prompt: { prompt: "You are helpful." } },
    },
  }),
};

const procedureFile: PickedFile = {
  path: "procedures/structured/do-not-call-request.json",
  content: JSON.stringify({ procedure_id: "agtprc_1", name: "Do-not-call request", trigger: "Caller asks to stop being called." }),
};

const knowledgeFile: PickedFile = {
  path: "knowledge-base/01-product-overview.md",
  content: "# Product Overview\nSome knowledge content.",
};

describe("mergeConfigFolder", () => {
  it("rejects an empty folder", () => {
    const result = mergeConfigFolder([]);
    expect(result.ok).toBe(false);
  });

  it("fails clearly when no file looks like an agent configuration", () => {
    const result = mergeConfigFolder([{ path: "readme.md", content: "not json" }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/no agent configuration file/i);
  });

  it("finds the base config and merges procedures and knowledge docs into it", () => {
    const result = mergeConfigFolder([baseConfig, procedureFile, knowledgeFile]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const merged = JSON.parse(result.mergedJson);
    expect(merged.name).toBe("AI Sales Employee");
    const procedures = getAtPath(merged, "procedures");
    expect(Array.isArray(procedures)).toBe(true);
    expect((procedures as { name: string }[])[0]?.name).toBe("Do-not-call request");
    const knowledgeBase = getAtPath(merged, "conversation_config.agent.prompt.knowledge_base");
    expect((knowledgeBase as { name: string }[])[0]?.name).toBe("01-product-overview");
    expect(result.summary).toEqual({
      baseFileName: "agent-config/agent.sanitized.json",
      procedureCount: 1,
      knowledgeDocCount: 1,
    });
  });

  it("does not duplicate a procedure that is already present on the base config", () => {
    const baseWithProcedure = {
      path: "agent-config/agent.sanitized.json",
      content: JSON.stringify({
        name: "AI Sales Employee",
        conversation_config: { agent: { first_message: "Hi", language: "ar" } },
        procedures: [{ procedure_id: "agtprc_1", name: "Do-not-call request", trigger: "x" }],
      }),
    };
    const result = mergeConfigFolder([baseWithProcedure, procedureFile]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const merged = JSON.parse(result.mergedJson);
    expect(merged.procedures).toHaveLength(1);
  });

  it("preserves unrelated fields already on the base config", () => {
    const result = mergeConfigFolder([baseConfig]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const merged = JSON.parse(result.mergedJson);
    expect(getAtPath(merged, "conversation_config.agent.prompt.prompt")).toBe("You are helpful.");
  });
});
