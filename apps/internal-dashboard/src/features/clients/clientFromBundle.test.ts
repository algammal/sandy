import { describe, expect, it } from "vitest";
import type { ClientSubmissionBundle } from "@sandy/shared-types";
import { clientFromBundle } from "./clientFromBundle";

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
  properties: [{} as never, {} as never],
  compounds: [{} as never],
  locations: [],
  contacts: [{} as never, {} as never, {} as never],
  faqs: [],
  amenities: [],
  agentRequests: [],
  submittedAt: "2024-01-01T00:00:00.000Z",
};

describe("clientFromBundle", () => {
  it("derives a new client record with counts matching the bundle's arrays", () => {
    const client = clientFromBundle(bundle);
    expect(client.id).toBe("client_new");
    expect(client.submissionStatus).toBe("submitted");
    expect(client.agentStatus).toBe("not_configured");
    expect(client.propertyCount).toBe(2);
    expect(client.compoundCount).toBe(1);
    expect(client.contactNumberCount).toBe(3);
  });

  it("preserves createdAt and agentStatus when refreshing an existing client", () => {
    const existing = clientFromBundle(bundle);
    const refreshed = clientFromBundle(bundle, { ...existing, agentStatus: "active", createdAt: "2020-01-01T00:00:00.000Z" });
    expect(refreshed.createdAt).toBe("2020-01-01T00:00:00.000Z");
    expect(refreshed.agentStatus).toBe("active");
  });
});
