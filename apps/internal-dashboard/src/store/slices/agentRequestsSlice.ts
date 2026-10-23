import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AgentRequest, ID } from "@sandy/shared-types";

interface AgentRequestsState {
  byClientId: Record<ID, AgentRequest[]>;
}

const initialState: AgentRequestsState = {
  byClientId: {},
};

const agentRequestsSlice = createSlice({
  name: "agentRequests",
  initialState,
  reducers: {
    setAgentRequestsForClient(state, action: PayloadAction<{ clientId: ID; requests: AgentRequest[] }>) {
      state.byClientId[action.payload.clientId] = action.payload.requests;
    },
  },
});

export const { setAgentRequestsForClient } = agentRequestsSlice.actions;
export default agentRequestsSlice.reducer;
