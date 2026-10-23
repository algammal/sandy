import type { AgentInstance, AgentInstanceStatus, ProvisioningRecord } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { simulateRequest } from "./simulate";
import { seedAgentInstances } from "./seedData";

let instances: AgentInstance[] = seedAgentInstances.map((instance) => ({ ...instance }));

export const agentInstanceService = {
  list(): Promise<AgentInstance[]> {
    return simulateRequest(() => [...instances]);
  },

  getForClient(clientId: string): Promise<AgentInstance | undefined> {
    return simulateRequest(() => instances.find((instance) => instance.clientId === clientId));
  },

  ensureForClient(clientId: string, agentName: string): Promise<AgentInstance> {
    return simulateRequest(() => {
      const existing = instances.find((instance) => instance.clientId === clientId);
      if (existing) return existing;
      const created: AgentInstance = {
        id: generateId("agent"),
        clientId,
        agentName,
        elevenLabsAgentIdPlaceholder: null,
        status: "draft",
        configurationVersion: 1,
        lastSyncAt: null,
        lastError: null,
      };
      instances = [created, ...instances];
      return created;
    });
  },

  updateStatus(id: string, status: AgentInstanceStatus, patch: Partial<AgentInstance> = {}): Promise<AgentInstance> {
    return simulateRequest(() => {
      const existing = instances.find((instance) => instance.id === id);
      if (!existing) throw new Error("Agent instance not found.");
      const updated: AgentInstance = { ...existing, ...patch, status };
      instances = instances.map((instance) => (instance.id === id ? updated : instance));
      return updated;
    });
  },

  recordProvisioningOutcome(id: string, record: ProvisioningRecord): Promise<AgentInstance> {
    return simulateRequest(() => {
      const existing = instances.find((instance) => instance.id === id);
      if (!existing) throw new Error("Agent instance not found.");
      const updated: AgentInstance = {
        ...existing,
        status: record.outcome === "succeeded_demo" ? "active" : "provisioning_failed",
        elevenLabsAgentIdPlaceholder: record.simulatedReference ?? existing.elevenLabsAgentIdPlaceholder,
        configurationVersion: existing.configurationVersion + 1,
        lastSyncAt: record.completedAt,
        lastError: record.errorMessage,
      };
      instances = instances.map((instance) => (instance.id === id ? updated : instance));
      return updated;
    });
  },
};
