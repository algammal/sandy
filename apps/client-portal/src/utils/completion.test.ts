import { describe, expect, it } from "vitest";
import type { BusinessProfile } from "@sandy/shared-types";
import { computeOverallCompletion, computeProfileCompletion } from "./completion";

const completeProfile: BusinessProfile = {
  clientId: "client_demo",
  businessName: "Sandcastle Living",
  description: "A property management company.",
  category: "Real Estate",
  contactEmail: "hello@example.com",
  contactPhone: "+1 555 0100",
  workingHours: [{ day: "monday", closed: false, openTime: "09:00", closeTime: "18:00" }],
  supportedServices: ["Leasing"],
  policies: [{ id: "p1", title: "Policy", description: "Description" }],
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("computeProfileCompletion", () => {
  it("returns 0 for a null profile", () => {
    expect(computeProfileCompletion(null)).toBe(0);
  });

  it("returns 100 when every required field is filled", () => {
    expect(computeProfileCompletion(completeProfile)).toBe(100);
  });

  it("returns a partial score when some fields are missing", () => {
    const partial: BusinessProfile = { ...completeProfile, supportedServices: [], policies: [] };
    const score = computeProfileCompletion(partial);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe("computeOverallCompletion", () => {
  it("returns 100 when the profile and every count are satisfied", () => {
    const score = computeOverallCompletion({
      profile: completeProfile,
      propertyCount: 1,
      compoundCount: 1,
      locationCount: 1,
      contactCount: 1,
      faqCount: 1,
    });
    expect(score).toBe(100);
  });

  it("returns 0 when nothing is filled in", () => {
    const score = computeOverallCompletion({
      profile: null,
      propertyCount: 0,
      compoundCount: 0,
      locationCount: 0,
      contactCount: 0,
      faqCount: 0,
    });
    expect(score).toBe(0);
  });
});
