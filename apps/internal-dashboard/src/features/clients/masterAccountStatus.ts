import type { Client, MasterAccountStatus } from "@sandy/shared-types";

/**
 * Pure, deterministic placeholder for the planned master/child ElevenLabs
 * account relationship described in the product brief. Nothing here implies
 * a real account, API or credit-sharing behavior exists — see `notes`,
 * which is surfaced directly in the UI next to this status.
 */
export function getMasterAccountStatusForClient(client: Client): MasterAccountStatus {
  if (client.agentStatus === "active") {
    return {
      integrationStatus: "connected_demo",
      masterAccountLabel: "Aether Voice AI — Master Workspace (Demo)",
      childWorkspaceIdPlaceholder: `demo-child-${client.id}`,
      lastSyncAt: client.updatedAt,
      syncStatus: "synced_demo",
      notes:
        "Demo only — no real ElevenLabs master/child account relationship exists yet. The exact account hierarchy, available APIs and credit-sharing behavior will be verified when the backend and ElevenLabs integration are implemented.",
    };
  }

  return {
    integrationStatus: "planned",
    masterAccountLabel: null,
    childWorkspaceIdPlaceholder: null,
    lastSyncAt: null,
    syncStatus: "idle",
    notes:
      "Planned capability — this client has not been connected to a master ElevenLabs workspace. No real account or credentials will be created until the backend and ElevenLabs integration are implemented.",
  };
}
