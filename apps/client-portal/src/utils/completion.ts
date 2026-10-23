import type { BusinessProfile } from "@sandy/shared-types";
import { clampPercentage } from "@sandy/shared-utils";

/** Business-profile-only completeness, shown as a standalone dashboard metric. */
export function computeProfileCompletion(profile: BusinessProfile | null): number {
  if (!profile) return 0;
  const checks = [
    Boolean(profile.businessName.trim()),
    Boolean(profile.description.trim()),
    Boolean(profile.category.trim()),
    Boolean(profile.contactEmail.trim()),
    Boolean(profile.contactPhone.trim()),
    profile.workingHours.some((entry) => !entry.closed),
    profile.supportedServices.length > 0,
    profile.policies.length > 0,
  ];
  const score = checks.filter(Boolean).length / checks.length;
  return clampPercentage(score * 100);
}

export interface OverallCompletionInput {
  profile: BusinessProfile | null;
  propertyCount: number;
  compoundCount: number;
  locationCount: number;
  contactCount: number;
  faqCount: number;
}

/** Weighted readiness score across every section an AI agent would need before go-live. */
export function computeOverallCompletion(input: OverallCompletionInput): number {
  const weights = {
    profile: 0.4,
    properties: 0.15,
    compounds: 0.15,
    locations: 0.15,
    contacts: 0.1,
    faqs: 0.05,
  };
  const score =
    (computeProfileCompletion(input.profile) / 100) * weights.profile +
    (input.propertyCount > 0 ? 1 : 0) * weights.properties +
    (input.compoundCount > 0 ? 1 : 0) * weights.compounds +
    (input.locationCount > 0 ? 1 : 0) * weights.locations +
    (input.contactCount > 0 ? 1 : 0) * weights.contacts +
    (input.faqCount > 0 ? 1 : 0) * weights.faqs;
  return clampPercentage(score * 100);
}
