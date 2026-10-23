import { describe, expect, it } from "vitest";
import type { AgentRequest, ClientSubmissionBundle } from "@sandy/shared-types";
import { makeStore } from "../index";
import { importSubmissionBundle } from "./importSubmissionBundle";

const agentRequest: AgentRequest = {
  id: "req_1",
  clientId: "client_new",
  label: "English Concierge",
  businessType: "real_estate_developer",
  voiceGender: "female",
  language: "english",
  tone: "professional",
  robotSensitivity: "balanced",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const bundle: ClientSubmissionBundle = {
  schemaVersion: 1,
  submissionId: "submission_1",
  client: {
    id: "client_new",
    name: "New Co",
    businessCategory: "Hospitality",
    contactEmail: "hi@newco.test",
    contactPhone: "+1 555 0000",
  },
  businessProfile: {
    clientId: "client_new",
    businessName: "New Co",
    description: "A test business.",
    category: "Hospitality",
    contactEmail: "hi@newco.test",
    contactPhone: "+1 555 0000",
    workingHours: [],
    supportedServices: [],
    policies: [],
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  properties: [],
  compounds: [],
  locations: [],
  contacts: [],
  faqs: [],
  amenities: [],
  agentRequests: [agentRequest],
  submittedAt: "2024-01-01T00:00:00.000Z",
};

describe("importSubmissionBundle", () => {
  it("materializes the client, business info, agent requests and a generated draft in one dispatch", () => {
    const store = makeStore();
    store.dispatch(importSubmissionBundle(bundle));
    const state = store.getState();

    expect(state.clients.items.find((c) => c.id === "client_new")).toBeDefined();
    expect(state.businessInfo.byClientId["client_new"]?.businessProfile.businessName).toBe("New Co");
    expect(state.agentRequests.byClientId["client_new"]).toHaveLength(1);

    const draft = state.agentConfigurations.configurations.find((c) => c.agentRequestId === "req_1");
    expect(draft).toBeDefined();
    expect(draft?.clientId).toBe("client_new");
    expect(draft?.mappedConfig.name).toContain("New Co");
  });
});
