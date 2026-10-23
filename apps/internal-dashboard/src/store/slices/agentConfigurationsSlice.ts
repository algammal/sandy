import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AgentConfiguration, AgentConfigImportSource, DraftConfigId, ID, JsonValue } from "@sandy/shared-types";
import { toDraftConfigId } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { parseAgentConfigJson } from "../../features/agent-studio/parseConfig";
import { mapClientDataToAgentConfig, type ClientMappingContext } from "../../features/agent-studio/mapping";
import { createDefaultAgentTemplate } from "../../features/agent-studio/baseTemplate";
import { buildStructuredProcedure } from "../../features/agent-studio/procedures";

interface AgentConfigurationsState {
  configurations: AgentConfiguration[];
  activeConfigurationId: DraftConfigId | null;
  selectedClientId: ID | null;
  parseError: string | null;
}

const initialState: AgentConfigurationsState = {
  configurations: [],
  activeConfigurationId: null,
  selectedClientId: null,
  parseError: null,
};

function nextVersionFor(configurations: AgentConfiguration[], clientId: ID, agentRequestId: ID | null): number {
  const priorVersions = configurations.filter((config) => config.clientId === clientId && config.agentRequestId === agentRequestId);
  return priorVersions.length > 0 ? Math.max(...priorVersions.map((c) => c.version)) + 1 : 1;
}

const agentConfigurationsSlice = createSlice({
  name: "agentConfigurations",
  initialState,
  reducers: {
    importConfig(state, action: PayloadAction<{ sourceText: string; importSource: AgentConfigImportSource; name: string }>) {
      const result = parseAgentConfigJson(action.payload.sourceText);
      if (!result.ok) {
        state.parseError = result.error;
        return;
      }
      state.parseError = null;
      const configuration: AgentConfiguration = {
        id: toDraftConfigId(generateId("agentcfg")),
        clientId: null,
        agentRequestId: null,
        name: action.payload.name,
        version: 1,
        importSource: action.payload.importSource,
        rawConfig: result.config,
        mappedConfig: result.config,
        supportedFieldPaths: result.supportedFieldPaths,
        unknownFieldPaths: result.unknownFieldPaths,
        validationIssues: result.issues,
        createdAt: new Date().toISOString(),
      };
      state.configurations.unshift(configuration);
      state.activeConfigurationId = configuration.id;
    },

    clearParseError(state) {
      state.parseError = null;
    },

    setActiveConfiguration(state, action: PayloadAction<DraftConfigId>) {
      state.activeConfigurationId = action.payload;
    },

    selectClientForMapping(state, action: PayloadAction<ID | null>) {
      state.selectedClientId = action.payload;
    },

    applyMappingToActiveConfiguration(state, action: PayloadAction<ClientMappingContext>) {
      const active = state.configurations.find((config) => config.id === state.activeConfigurationId);
      if (!active) return;
      const { mappedConfig } = mapClientDataToAgentConfig(active.rawConfig, action.payload);
      active.mappedConfig = mappedConfig;
    },

    commitActiveConfigurationToClient(state) {
      const active = state.configurations.find((config) => config.id === state.activeConfigurationId);
      if (!active || !state.selectedClientId) return;
      const clientId = state.selectedClientId;
      const committed: AgentConfiguration = {
        ...active,
        id: toDraftConfigId(generateId("agentcfg")),
        clientId,
        version: nextVersionFor(state.configurations, clientId, active.agentRequestId),
        createdAt: new Date().toISOString(),
      };
      state.configurations.unshift(committed);
      state.activeConfigurationId = committed.id;
    },

    /**
     * Auto-generates one configuration draft per requested agent for a
     * client, mapping their business data onto the one default base
     * template (see baseTemplate.ts) immediately — this is the
     * "automatically configured, editable afterwards" behavior triggered
     * right after a client submission is imported, so staff never start
     * from a totally empty workspace. Every draft starts from the same
     * template on purpose: it's the only one this phase ships.
     */
    generateDraftsForClient(state, action: PayloadAction<{ contexts: ClientMappingContext[] }>) {
      for (const context of action.payload.contexts) {
        if (!context.agentRequest) continue;
        const rawConfig = createDefaultAgentTemplate();
        const { mappedConfig } = mapClientDataToAgentConfig(rawConfig, context);
        const agentLabel = context.agentRequest.label;
        const configuration: AgentConfiguration = {
          id: toDraftConfigId(generateId("agentcfg")),
          clientId: context.client.id,
          agentRequestId: context.agentRequest.id,
          name: `${context.client.name} — ${agentLabel}`,
          version: nextVersionFor(state.configurations, context.client.id, context.agentRequest.id),
          importSource: "template",
          rawConfig,
          mappedConfig,
          supportedFieldPaths: [],
          unknownFieldPaths: [],
          validationIssues: [],
          createdAt: new Date().toISOString(),
        };
        state.configurations.unshift(configuration);
      }
    },

    removeConfiguration(state, action: PayloadAction<DraftConfigId>) {
      state.configurations = state.configurations.filter((config) => config.id !== action.payload);
      if (state.activeConfigurationId === action.payload) state.activeConfigurationId = null;
    },

    /**
     * Procedures are a real, preserved-but-opaque top-level field (see
     * configSchema.ts) — this is the first bit of structure this phase adds
     * on top of that passthrough: staff can add a new deterministic
     * procedure (shaped like the real sanitized export's structured
     * procedures) or remove one. Written to `rawConfig` (not just
     * `mappedConfig`) so the edit survives the next "Apply Rules" re-map,
     * which never touches `procedures`.
     */
    addProcedureToActiveConfiguration(state, action: PayloadAction<{ name: string; trigger: string; message: string }>) {
      const active = state.configurations.find((config) => config.id === state.activeConfigurationId);
      if (!active) return;
      const procedure = buildStructuredProcedure(action.payload);
      for (const target of [active.rawConfig, active.mappedConfig]) {
        const existing = target.procedures;
        const list = Array.isArray(existing) ? existing : [];
        target.procedures = [...list, procedure as unknown as JsonValue];
      }
    },

    removeProcedureFromActiveConfiguration(state, action: PayloadAction<{ procedureId: string }>) {
      const active = state.configurations.find((config) => config.id === state.activeConfigurationId);
      if (!active) return;
      for (const target of [active.rawConfig, active.mappedConfig]) {
        const existing = target.procedures;
        if (!Array.isArray(existing)) continue;
        target.procedures = existing.filter((entry) => {
          const procedureId = entry && typeof entry === "object" && !Array.isArray(entry) ? entry.procedure_id : undefined;
          return procedureId !== action.payload.procedureId;
        });
      }
    },
  },
});

export const {
  importConfig,
  clearParseError,
  setActiveConfiguration,
  selectClientForMapping,
  applyMappingToActiveConfiguration,
  commitActiveConfigurationToClient,
  generateDraftsForClient,
  removeConfiguration,
  addProcedureToActiveConfiguration,
  removeProcedureFromActiveConfiguration,
} = agentConfigurationsSlice.actions;

export default agentConfigurationsSlice.reducer;
