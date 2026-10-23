import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AgentInstance, DraftConfigId, ProvisioningRecord, RequestStatus } from "@sandy/shared-types";
import { agentInstanceService } from "../../services/agentInstanceService";
import { provisioningService } from "../../services/provisioningService";

interface AgentInstancesState {
  items: AgentInstance[];
  status: RequestStatus;
  provisioningStatus: RequestStatus;
  provisioningHistory: ProvisioningRecord[];
}

const initialState: AgentInstancesState = {
  items: [],
  status: "idle",
  provisioningStatus: "idle",
  provisioningHistory: [],
};

export const fetchAgentInstances = createAsyncThunk("agentInstances/fetch", async () => agentInstanceService.list());

export const ensureAgentInstance = createAsyncThunk(
  "agentInstances/ensure",
  async ({ clientId, agentName }: { clientId: string; agentName: string }) =>
    agentInstanceService.ensureForClient(clientId, agentName),
);

export const provisionAgent = createAsyncThunk(
  "agentInstances/provision",
  async ({
    instanceId,
    clientId,
    clientName,
    agentConfigurationId,
  }: {
    instanceId: string;
    clientId: string;
    clientName: string;
    agentConfigurationId: DraftConfigId;
  }) => {
    const record = await provisioningService.provision(clientId, clientName, agentConfigurationId);
    const instance = await agentInstanceService.recordProvisioningOutcome(instanceId, record);
    return { record, instance };
  },
);

const agentInstancesSlice = createSlice({
  name: "agentInstances",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgentInstances.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAgentInstances.fulfilled, (state, action: PayloadAction<AgentInstance[]>) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchAgentInstances.rejected, (state) => {
        state.status = "failed";
      })
      .addCase(ensureAgentInstance.fulfilled, (state, action: PayloadAction<AgentInstance>) => {
        const exists = state.items.some((item) => item.id === action.payload.id);
        if (!exists) state.items.unshift(action.payload);
      })
      .addCase(provisionAgent.pending, (state) => {
        state.provisioningStatus = "loading";
      })
      .addCase(provisionAgent.fulfilled, (state, action) => {
        state.provisioningStatus = "succeeded";
        state.provisioningHistory.unshift(action.payload.record);
        state.items = state.items.map((item) => (item.id === action.payload.instance.id ? action.payload.instance : item));
      })
      .addCase(provisionAgent.rejected, (state) => {
        state.provisioningStatus = "failed";
      });
  },
});

export default agentInstancesSlice.reducer;
