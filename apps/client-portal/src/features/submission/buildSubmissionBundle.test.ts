import { describe, expect, it } from "vitest";
import type { AgentRequest, BusinessProfile } from "@sandy/shared-types";
import { CLIENT_SUBMISSION_BUNDLE_SCHEMA_VERSION } from "@sandy/shared-types";
import { buildSubmissionBundle } from "./buildSubmissionBundle";

const businessProfile: BusinessProfile = {
  clientId: "client_1",
  businessName: "Test Co",
  description: "A test business.",
  category: "Real Estate",
  contactEmail: "hi@test.co",
  contactPhone: "+1 555 0100",
  workingHours: [],
  supportedServices: [],
  policies: [],
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const agentRequest: AgentRequest = {
  id: "req_1",
  clientId: "client_1",
  label: "Agent 1",
  businessType: "Property Management",
  voiceGender: "female",
  language: "english",
  tone: "professional",
  robotSensitivity: "balanced",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("buildSubmissionBundle", () => {
  it("includes the correct schema version", () => {
    const bundle = buildSubmissionBundle({
      client: { id: "client_1", name: "Test Co", businessCategory: "Real Estate", contactEmail: "hi@test.co", contactPhone: "+1 555 0100" },
      businessProfile,
      properties: [],
      compounds: [],
      locations: [],
      contacts: [],
      faqs: [],
      amenities: [],
      agentRequests: [agentRequest],
    });
    expect(bundle.schemaVersion).toBe(CLIENT_SUBMISSION_BUNDLE_SCHEMA_VERSION);
  });

  it("carries every requested agent through untouched", () => {
    const bundle = buildSubmissionBundle({
      client: { id: "client_1", name: "Test Co", businessCategory: "Real Estate", contactEmail: "hi@test.co", contactPhone: "+1 555 0100" },
      businessProfile,
      properties: [],
      compounds: [],
      locations: [],
      contacts: [],
      faqs: [],
      amenities: [],
      agentRequests: [agentRequest],
    });
    expect(bundle.agentRequests).toEqual([agentRequest]);
  });

  it("uses a provided submissionId instead of generating a new one", () => {
    const bundle = buildSubmissionBundle({
      client: { id: "client_1", name: "Test Co", businessCategory: "Real Estate", contactEmail: "hi@test.co", contactPhone: "+1 555 0100" },
      businessProfile,
      properties: [],
      compounds: [],
      locations: [],
      contacts: [],
      faqs: [],
      amenities: [],
      agentRequests: [],
      submissionId: "submission_demo",
    });
    expect(bundle.submissionId).toBe("submission_demo");
  });
});
