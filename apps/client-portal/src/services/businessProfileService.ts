import type { BusinessProfile } from "@sandy/shared-types";
import { simulateRequest } from "./simulate";
import { seedBusinessProfile } from "./seedData";

let profile: BusinessProfile = { ...seedBusinessProfile };

export const businessProfileService = {
  get(): Promise<BusinessProfile> {
    return simulateRequest(() => ({ ...profile }));
  },

  update(input: Omit<BusinessProfile, "clientId" | "updatedAt">): Promise<BusinessProfile> {
    return simulateRequest(() => {
      profile = { ...profile, ...input, updatedAt: new Date().toISOString() };
      return { ...profile };
    });
  },
};
