import { z } from "zod";

export const propertySchema = z.object({
  name: z.string().min(2, "Property name is required."),
  type: z.enum(["apartment", "villa", "office", "retail", "warehouse", "mixed_use", "other"]),
  description: z.string().min(10, "Add a short description (10+ characters)."),
  compoundId: z.string().optional().or(z.literal("")),
  locationId: z.string().optional().or(z.literal("")),
  amenityIds: z.array(z.string()),
  contactNumberIds: z.array(z.string()),
  metadataText: z.string().optional().or(z.literal("")),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;

export function parseMetadataText(text: string | undefined): Record<string, string> {
  if (!text) return {};
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (key && key.trim() && value) {
      result[key.trim()] = value;
    }
  }
  return result;
}

export function formatMetadataText(metadata: Record<string, string> | undefined): string {
  if (!metadata) return "";
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}
