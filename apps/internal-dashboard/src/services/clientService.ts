import type { Client, SubmissionStatus } from "@sandy/shared-types";
import { simulateRequest } from "./simulate";
import { seedClients } from "./seedData";
import { recordActivity } from "./activityLog";

let clients: Client[] = seedClients.map((client) => ({ ...client }));

export const clientService = {
  list(): Promise<Client[]> {
    return simulateRequest(() => [...clients]);
  },

  get(id: string): Promise<Client | undefined> {
    return simulateRequest(() => clients.find((client) => client.id === id));
  },

  transitionSubmission(id: string, status: SubmissionStatus, actorName = "You"): Promise<Client> {
    return simulateRequest(() => {
      const existing = clients.find((client) => client.id === id);
      if (!existing) throw new Error("Client not found.");
      const updated: Client = { ...existing, submissionStatus: status, updatedAt: new Date().toISOString() };
      clients = clients.map((client) => (client.id === id ? updated : client));
      recordActivity({
        clientId: id,
        actorType: "internal",
        actorName,
        action: `submission_${status}`,
        description: `${actorName} set ${existing.name}'s submission status to "${status.replace("_", " ")}".`,
      });
      return updated;
    });
  },
};
