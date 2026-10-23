import { z } from "zod";

export const agentRequestSchema = z.object({
  label: z.string().min(2, "Give this agent a short label, e.g. \"Agent 1\"."),
  businessType: z.string().min(2, "Select or describe a business type."),
  voiceGender: z.enum(["male", "female"]),
  language: z.enum(["arabic", "english", "bilingual"]),
  arabicDialect: z.enum(["egyptian", "msa", "gulf", "levantine", "maghrebi"]).optional(),
  tone: z.enum(["professional", "friendly", "luxury_concierge", "formal", "warm", "sales_oriented"]),
  robotSensitivity: z.enum(["natural", "balanced", "controlled"]),
  customInstructions: z.string().max(600, "Keep instructions under 600 characters.").optional().or(z.literal("")),
});

export type AgentRequestFormValues = z.infer<typeof agentRequestSchema>;

/** Returns a human-readable list of problems with one agent request, or an empty array if it's valid. */
export function validateAgentRequest(value: unknown): string[] {
  const result = agentRequestSchema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.message);
}
