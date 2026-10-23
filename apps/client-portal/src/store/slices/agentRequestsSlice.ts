import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AgentRequest } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { DEMO_CLIENT_ID } from "../../utils/constants";

interface AgentRequestsState {
  items: AgentRequest[];
}

const now = new Date().toISOString();

const initialState: AgentRequestsState = {
  items: [
    {
      id: generateId("agentreq"),
      clientId: DEMO_CLIENT_ID,
      label: "Agent 1",
      businessType: "Property Management",
      voiceGender: "female",
      language: "bilingual",
      arabicDialect: "egyptian",
      tone: "professional",
      robotSensitivity: "balanced",
      customInstructions: "",
      createdAt: now,
      updatedAt: now,
    },
  ],
};

export type AgentRequestInput = Omit<AgentRequest, "id" | "clientId" | "createdAt" | "updatedAt">;

const agentRequestsSlice = createSlice({
  name: "agentRequests",
  initialState,
  reducers: {
    addAgentRequest: {
      reducer(state, action: PayloadAction<AgentRequest>) {
        state.items.push(action.payload);
      },
      prepare(input: AgentRequestInput) {
        const timestamp = new Date().toISOString();
        return {
          payload: {
            ...input,
            id: generateId("agentreq"),
            clientId: DEMO_CLIENT_ID,
            createdAt: timestamp,
            updatedAt: timestamp,
          } satisfies AgentRequest,
        };
      },
    },
    updateAgentRequest(state, action: PayloadAction<{ id: string; input: AgentRequestInput }>) {
      const index = state.items.findIndex((item) => item.id === action.payload.id);
      if (index === -1) return;
      state.items[index] = {
        ...state.items[index],
        ...action.payload.input,
        updatedAt: new Date().toISOString(),
      } as AgentRequest;
    },
    removeAgentRequest(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
  },
});

export const { addAgentRequest, updateAgentRequest, removeAgentRequest } = agentRequestsSlice.actions;
export default agentRequestsSlice.reducer;
