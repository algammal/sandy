import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AgentConfiguration, AgentConfigImportSource, DraftConfigId, ID } from "@sandy/shared-types";
import { toDraftConfigId } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { parseAgentConfigJson } from "../../features/agent-studio/parseConfig";
import { mapClientDataToAgentConfig, type ClientMappingContext } from "../../features/agent-studio/mapping";
import { createBlankAgentTemplate } from "../../features/agent-studio/baseTemplate";

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
     * client, mapping their business data onto a blank base template
     * immediately — this is the "automatically configured, editable
     * afterwards" behavior triggered right after a client submission is
     * imported, so staff never start from a totally empty workspace.
     */
    generateDraftsForClient(state, action: PayloadAction<{ contexts: ClientMappingContext[] }>) {
      for (const context of action.payload.contexts) {
        if (!context.agentRequest) continue;
        const rawConfig = createBlankAgentTemplate();
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
} = agentConfigurationsSlice.actions;

export default agentConfigurationsSlice.reducer;
