import { z } from "zod";

export const contactLabelOptions = [
  { value: "main", label: "Main" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "emergency", label: "Emergency" },
  { value: "property", label: "Property-specific" },
  { value: "other", label: "Other" },
];

export const contactSchema = z.object({
  label: z.enum(["main", "sales", "support", "emergency", "property", "other"]),
  displayName: z.string().min(2, "Display name is required."),
  phoneNumber: z
    .string()
    .min(6, "Enter a valid phone number.")
    .regex(/^\+?[0-9\s().-]{6,20}$/, "Enter a valid phone number."),
  extension: z.string().optional().or(z.literal("")),
  propertyId: z.string().optional().or(z.literal("")),
  compoundId: z.string().optional().or(z.literal("")),
  isPrimary: z.boolean(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
