import { describe, expect, it } from "vitest";
import reducer, { addAgentRequest, removeAgentRequest, updateAgentRequest } from "./agentRequestsSlice";

const baseInput = {
  label: "Agent 2",
  businessType: "Hospitality",
  voiceGender: "male" as const,
  language: "english" as const,
  tone: "friendly" as const,
  robotSensitivity: "natural" as const,
  customInstructions: "",
};

describe("agentRequestsSlice", () => {
  it("seeds one default agent request", () => {
    const state = reducer(undefined, { type: "@@init" });
    expect(state.items).toHaveLength(1);
  });

  it("adds a new agent request with a generated id and client id", () => {
    const state = reducer(undefined, addAgentRequest(baseInput));
    expect(state.items).toHaveLength(2);
    const added = state.items[1];
    expect(added?.label).toBe("Agent 2");
    expect(added?.id).toBeTruthy();
    expect(added?.clientId).toBeTruthy();
  });

  it("updates an existing agent request in place", () => {
    let state = reducer(undefined, addAgentRequest(baseInput));
    const id = state.items[1]!.id;
    state = reducer(state, updateAgentRequest({ id, input: { ...baseInput, label: "Renamed Agent" } }));
    expect(state.items.find((item) => item.id === id)?.label).toBe("Renamed Agent");
  });

  it("removes an agent request by id", () => {
    let state = reducer(undefined, addAgentRequest(baseInput));
    const id = state.items[1]!.id;
    state = reducer(state, removeAgentRequest(id));
    expect(state.items.find((item) => item.id === id)).toBeUndefined();
  });

  it("allows removing every agent request down to zero", () => {
    let state = reducer(undefined, { type: "@@init" });
    for (const item of state.items) {
      state = reducer(state, removeAgentRequest(item.id));
    }
    expect(state.items).toHaveLength(0);
  });
});
