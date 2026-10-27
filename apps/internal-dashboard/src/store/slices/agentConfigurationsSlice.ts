import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AgentConfiguration, AgentConfigImportSource, DraftConfigId, ID, JsonValue } from "@sandy/shared-types";
import { toDraftConfigId } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { parseAgentConfigJson } from "../../features/agent-studio/parseConfig";
import { mapClientDataToAgentConfig, type ClientMappingContext } from "../../features/agent-studio/mapping";
import { createDefaultAgentTemplate } from "../../features/agent-studio/baseTemplate";
import { buildStructuredProcedure, listProcedures } from "../../features/agent-studio/procedures";

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
        // mappedConfig starts as a structural clone of rawConfig (not the same
        // reference) so later procedure/mapping edits never mutate the
        // immutable "original import" the right-hand diff compares against.
        mappedConfig: JSON.parse(JSON.stringify(result.config)),
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
      // Map onto the current *working* config (mappedConfig), not the
      // original import — otherwise re-applying mapping would silently
      // discard any procedure include/exclude edits made in between.
      const { mappedConfig } = mapClientDataToAgentConfig(active.mappedConfig, action.payload);
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
        const { mappedConfig } = mapClientDataToAgentConfig(JSON.parse(JSON.stringify(rawConfig)), context);
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
     * Adds a brand-new procedure that was never part of the original
     * import. Written only to `mappedConfig` — `rawConfig` stays the
     * untouched original so the right-hand diff panel correctly shows it as
     * "added". Removing it again is a hard delete (see
     * `removeProcedureFromActiveConfiguration`) since there's no catalog
     * copy to restore it from.
     */
    addProcedureToActiveConfiguration(state, action: PayloadAction<{ name: string; trigger: string; message: string }>) {
      const active = state.configurations.find((config) => config.id === state.activeConfigurationId);
      if (!active) return;
      const procedure = buildStructuredProcedure(action.payload);
      const existing = active.mappedConfig.procedures;
      const list = Array.isArray(existing) ? existing : [];
      active.mappedConfig.procedures = [...list, procedure as unknown as JsonValue];
    },

    /** Permanently deletes a procedure that only exists in the working draft (never part of the original import). */
    removeProcedureFromActiveConfiguration(state, action: PayloadAction<{ procedureId: string }>) {
      const active = state.configurations.find((config) => config.id === state.activeConfigurationId);
      if (!active) return;
      const existing = active.mappedConfig.procedures;
      if (!Array.isArray(existing)) return;
      active.mappedConfig.procedures = existing.filter((entry) => {
        const id = entry && typeof entry === "object" && !Array.isArray(entry) ? entry.procedure_id : undefined;
        return id !== action.payload.procedureId;
      });
    },

    /**
     * Toggles whether a procedure that came from the original import is
     * included in the working draft. Reversible either way: excluding
     * removes it from `mappedConfig.procedures`; re-including copies it back
     * in from the untouched `rawConfig` catalog. `rawConfig` itself is never
     * modified, so the toggle history doesn't matter — only current state.
     */
    toggleProcedureInclusion(state, action: PayloadAction<{ procedureId: string }>) {
      const active = state.configurations.find((config) => config.id === state.activeConfigurationId);
      if (!active) return;
      const { procedureId } = action.payload;
      const currentlyIncluded = listProcedures(active.mappedConfig).some((p) => p.procedure_id === procedureId);

      if (currentlyIncluded) {
        const existing = active.mappedConfig.procedures;
        if (Array.isArray(existing)) {
          active.mappedConfig.procedures = existing.filter((entry) => {
            const id = entry && typeof entry === "object" && !Array.isArray(entry) ? entry.procedure_id : undefined;
            return id !== procedureId;
          });
        }
        return;
      }

      const fromCatalog = listProcedures(active.rawConfig).find((p) => p.procedure_id === procedureId);
      if (!fromCatalog) return;
      const existing = active.mappedConfig.procedures;
      const list = Array.isArray(existing) ? existing : [];
      active.mappedConfig.procedures = [...list, fromCatalog as unknown as JsonValue];
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
  toggleProcedureInclusion,
} = agentConfigurationsSlice.actions;

export default agentConfigurationsSlice.reducer;
