import { describe, expect, it } from "vitest";
import reducer, { provisionAgent } from "./agentInstancesSlice";
import type { AgentInstance, ProvisioningRecord } from "@sandy/shared-types";
import { toDraftConfigId, toSimulatedElevenLabsAgentId } from "@sandy/shared-types";

const draftConfigId = toDraftConfigId("cfg_1");

const instance: AgentInstance = {
  id: "agent_1",
  clientId: "client_1",
  agentName: "Test Agent",
  elevenLabsAgentIdPlaceholder: null,
  status: "draft",
  configurationVersion: 1,
  lastSyncAt: null,
  lastError: null,
};

describe("agentInstancesSlice provisioning", () => {
  it("sets provisioningStatus to loading while a request is pending", () => {
    const state = reducer(
      undefined,
      provisionAgent.pending("requestId", { instanceId: "agent_1", clientId: "client_1", clientName: "Test Co", agentConfigurationId: draftConfigId }),
    );
    expect(state.provisioningStatus).toBe("loading");
  });

  it("records a successful demo provisioning outcome", () => {
    const record: ProvisioningRecord = {
      id: "provision_1",
      clientId: "client_1",
      agentConfigurationId: draftConfigId,
      requestedAt: "2024-01-01T00:00:00.000Z",
      completedAt: "2024-01-01T00:00:05.000Z",
      outcome: "succeeded_demo",
      simulatedReference: toSimulatedElevenLabsAgentId("DEMO-AGT-ABC123"),
      errorMessage: null,
    };
    const updatedInstance: AgentInstance = { ...instance, status: "active", elevenLabsAgentIdPlaceholder: record.simulatedReference, configurationVersion: 2 };

    const state = reducer(
      undefined,
      provisionAgent.fulfilled(
        { record, instance: updatedInstance },
        "requestId",
        { instanceId: "agent_1", clientId: "client_1", clientName: "Test Co", agentConfigurationId: draftConfigId },
      ),
    );

    expect(state.provisioningStatus).toBe("succeeded");
    expect(state.provisioningHistory[0]?.outcome).toBe("succeeded_demo");
    expect(state.provisioningHistory[0]?.simulatedReference).toMatch(/^DEMO-/);
  });
});
