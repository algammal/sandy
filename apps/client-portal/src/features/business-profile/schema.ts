import { z } from "zod";

const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export const businessHoursEntrySchema = z.object({
  day: z.enum(weekDays),
  closed: z.boolean(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
});

export const businessPolicySchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Policy title is required."),
  description: z.string().min(1, "Policy description is required."),
});

export const businessProfileSchema = z.object({
  businessName: z.string().min(2, "Business name is required."),
  description: z.string().min(20, "Add at least a short paragraph describing your business (20+ characters)."),
  category: z.string().min(2, "Category is required."),
  contactEmail: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  contactPhone: z
    .string()
    .min(6, "Enter a valid phone number.")
    .regex(/^\+?[0-9\s().-]{6,20}$/, "Enter a valid phone number."),
  website: z.string().url("Enter a valid URL.").optional().or(z.literal("")),
  workingHours: z.array(businessHoursEntrySchema).length(7),
  supportedServices: z.array(z.string().min(1)).min(1, "Add at least one supported service."),
  policies: z.array(businessPolicySchema),
  additionalInformation: z.string().optional().or(z.literal("")),
});

export type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;
