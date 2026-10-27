import { describe, expect, it } from "vitest";
import reducer, {
  addProcedureToActiveConfiguration,
  applyMappingToActiveConfiguration,
  commitActiveConfigurationToClient,
  generateDraftsForClient,
  importConfig,
  removeProcedureFromActiveConfiguration,
  selectClientForMapping,
  toggleProcedureInclusion,
} from "./agentConfigurationsSlice";
import type { AgentRequest, Client } from "@sandy/shared-types";
import type { ClientMappingContext } from "../../features/agent-studio/mapping";

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

const mappingContext: ClientMappingContext = {
  client,
  businessProfile: null,
  properties: [],
  compounds: [],
  faqs: [],
  contacts: [],
};

describe("agentConfigurationsSlice", () => {
  it("records a parse error for invalid JSON without creating a configuration", () => {
    const state = reducer(undefined, importConfig({ sourceText: "{ invalid", importSource: "paste", name: "Import 1" }));
    expect(state.parseError).toMatch(/invalid json/i);
    expect(state.configurations).toHaveLength(0);
  });

  it("creates a configuration and marks it active on successful import", () => {
    const state = reducer(
      undefined,
      importConfig({ sourceText: JSON.stringify({ name: "Agent", conversation_config: {} }), importSource: "paste", name: "Import 1" }),
    );
    expect(state.parseError).toBeNull();
    expect(state.configurations).toHaveLength(1);
    expect(state.activeConfigurationId).toBe(state.configurations[0]?.id);
  });

  it("applies mapping to the active configuration without touching unrelated state", () => {
    let state = reducer(
      undefined,
      importConfig({ sourceText: JSON.stringify({ unrelated: true }), importSource: "paste", name: "Import 1" }),
    );
    state = reducer(state, applyMappingToActiveConfiguration(mappingContext));
    const active = state.configurations.find((c) => c.id === state.activeConfigurationId);
    expect(active?.mappedConfig.name).toBe("Test Co");
    expect(active?.mappedConfig.unrelated).toBe(true);
  });

  it("commits the active configuration to the selected client as a new version", () => {
    let state = reducer(
      undefined,
      importConfig({ sourceText: JSON.stringify({ name: "Agent" }), importSource: "paste", name: "Import 1" }),
    );
    state = reducer(state, selectClientForMapping("client_1"));
    state = reducer(state, commitActiveConfigurationToClient());

    const committed = state.configurations.find((c) => c.clientId === "client_1");
    expect(committed).toBeDefined();
    expect(committed?.version).toBe(1);
    expect(state.activeConfigurationId).toBe(committed?.id);
  });

  it("generates one draft per requested agent, each mapped and linked to its request", () => {
    const requestA: AgentRequest = {
      id: "req_a",
      clientId: "client_1",
      label: "English Concierge",
      businessType: "real_estate_developer",
      voiceGender: "female",
      language: "english",
      tone: "professional",
      robotSensitivity: "balanced",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    const requestB: AgentRequest = { ...requestA, id: "req_b", label: "Arabic Sales", language: "arabic", tone: "sales_oriented" };

    const state = reducer(
      undefined,
      generateDraftsForClient({
        contexts: [
          { client, businessProfile: null, properties: [], compounds: [], faqs: [], contacts: [], agentRequest: requestA },
          { client, businessProfile: null, properties: [], compounds: [], faqs: [], contacts: [], agentRequest: requestB },
        ],
      }),
    );

    expect(state.configurations).toHaveLength(2);
    expect(state.configurations.map((c) => c.agentRequestId).sort()).toEqual(["req_a", "req_b"]);
    expect(state.configurations.every((c) => c.clientId === "client_1")).toBe(true);
    expect(state.configurations.every((c) => c.mappedConfig.name)).toBeTruthy();
  });

  it("adds a custom procedure only to mappedConfig, leaving rawConfig as the untouched original", () => {
    let state = reducer(undefined, importConfig({ sourceText: JSON.stringify({ name: "Agent" }), importSource: "paste", name: "Import 1" }));
    state = reducer(
      state,
      addProcedureToActiveConfiguration({ name: "Pricing question", trigger: "Caller asks about price.", message: "Our team will follow up." }),
    );
    const active = state.configurations.find((c) => c.id === state.activeConfigurationId);
    expect(Array.isArray(active?.mappedConfig.procedures) && (active.mappedConfig.procedures as unknown[])).toHaveLength(1);
    expect(active?.rawConfig.procedures).toBeUndefined();
  });

  it("deletes a custom procedure permanently", () => {
    let state = reducer(undefined, importConfig({ sourceText: JSON.stringify({ name: "Agent" }), importSource: "paste", name: "Import 1" }));
    state = reducer(
      state,
      addProcedureToActiveConfiguration({ name: "Pricing question", trigger: "Caller asks about price.", message: "Our team will follow up." }),
    );
    const addedId = (
      state.configurations.find((c) => c.id === state.activeConfigurationId)?.mappedConfig.procedures as { procedure_id: string }[]
    )[0]?.procedure_id as string;
    state = reducer(state, removeProcedureFromActiveConfiguration({ procedureId: addedId }));
    const active = state.configurations.find((c) => c.id === state.activeConfigurationId);
    expect(active?.mappedConfig.procedures).toEqual([]);
  });

  it("toggling an imported procedure off excludes it from mappedConfig without touching rawConfig", () => {
    const sourceText = JSON.stringify({
      name: "Agent",
      conversation_config: {},
      procedures: [{ procedure_id: "agtprc_1", name: "Do-not-call request", trigger: "x", type: "deterministic", content: "{}", guardrails: [], referenced_procedure_ids: [] }],
    });
    let state = reducer(undefined, importConfig({ sourceText, importSource: "paste", name: "Import 1" }));
    const configId = state.activeConfigurationId!;

    // Imported procedures start included (mappedConfig starts as a clone of rawConfig).
    let active = state.configurations.find((c) => c.id === configId);
    expect(active?.mappedConfig.procedures).toHaveLength(1);

    state = reducer(state, toggleProcedureInclusion({ procedureId: "agtprc_1" }));
    active = state.configurations.find((c) => c.id === configId);
    expect(active?.mappedConfig.procedures).toEqual([]);
    expect(active?.rawConfig.procedures).toHaveLength(1); // original import untouched

    // Toggling again re-includes it, restored from the rawConfig catalog.
    state = reducer(state, toggleProcedureInclusion({ procedureId: "agtprc_1" }));
    active = state.configurations.find((c) => c.id === configId);
    expect(active?.mappedConfig.procedures).toHaveLength(1);
  });
});
