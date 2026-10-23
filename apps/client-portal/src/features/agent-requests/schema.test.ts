import { describe, expect, it } from "vitest";
import { validateAgentRequest } from "./schema";

const validRequest = {
  label: "Agent 1",
  businessType: "Property Management",
  voiceGender: "female",
  language: "bilingual",
  arabicDialect: "egyptian",
  tone: "professional",
  robotSensitivity: "balanced",
  customInstructions: "Be concise.",
};

describe("validateAgentRequest", () => {
  it("accepts a fully valid request", () => {
    expect(validateAgentRequest(validRequest)).toEqual([]);
  });

  it("flags a missing label", () => {
    const errors = validateAgentRequest({ ...validRequest, label: "" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("flags an invalid voice gender", () => {
    const errors = validateAgentRequest({ ...validRequest, voiceGender: "robot" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("flags instructions over the length limit", () => {
    const errors = validateAgentRequest({ ...validRequest, customInstructions: "x".repeat(601) });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("allows an empty arabicDialect when language is english", () => {
    const errors = validateAgentRequest({ ...validRequest, language: "english", arabicDialect: undefined });
    expect(errors).toEqual([]);
  });
});
