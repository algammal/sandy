import type { DraftConfigId, ProvisioningRecord } from "@sandy/shared-types";
import { toSimulatedElevenLabsAgentId } from "@sandy/shared-types";
import { generateId } from "@sandy/shared-utils";
import { simulateRequest } from "./simulate";
import { recordActivity } from "./activityLog";

/**
 * Pure frontend simulation of a provisioning run. No network request is made
 * and no real ElevenLabs agent is created — the "reference" below is always
 * a clearly-labelled demo string, never a real agent ID.
 */
export const provisioningService = {
  provision(clientId: string, clientName: string, agentConfigurationId: DraftConfigId): Promise<ProvisioningRecord> {
    const requestedAt = new Date().toISOString();
    // Demo-only: an occasional simulated failure so the failure state is reachable too.
    const willFail = Math.random() < 0.15;

    return simulateRequest(
      () => {
        const record: ProvisioningRecord = {
          id: generateId("provision"),
          clientId,
          agentConfigurationId,
          requestedAt,
          completedAt: new Date().toISOString(),
          outcome: "succeeded_demo",
          simulatedReference: toSimulatedElevenLabsAgentId(`DEMO-AGT-${generateId().slice(0, 6).toUpperCase()}`),
          errorMessage: null,
        };
        recordActivity({
          clientId,
          actorType: "system",
          actorName: "System",
          action: "agent_provisioned_demo",
          description: `Demo provisioning completed for ${clientName}.`,
        });
        return record;
      },
      {
        delayMs: 1600,
        failureRate: willFail ? 1 : 0,
        errorMessage: "Simulated provisioning failure (demo only) — no real request was made.",
      },
    ).catch((error: Error) => {
      const record: ProvisioningRecord = {
        id: generateId("provision"),
        clientId,
        agentConfigurationId,
        requestedAt,
        completedAt: new Date().toISOString(),
        outcome: "failed_demo",
        simulatedReference: null,
        errorMessage: error.message,
      };
      recordActivity({
        clientId,
        actorType: "system",
        actorName: "System",
        action: "agent_provisioning_failed_demo",
        description: `Demo provisioning failed for ${clientName}: ${error.message}`,
      });
      return record;
    });
  },
};
