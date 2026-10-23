import { z } from "zod";

export const faqCategoryOptions = [
  { value: "general", label: "General" },
  { value: "pricing", label: "Pricing" },
  { value: "policies", label: "Policies" },
  { value: "amenities", label: "Amenities" },
  { value: "booking", label: "Booking" },
  { value: "support", label: "Support" },
  { value: "other", label: "Other" },
];

export const faqSchema = z.object({
  question: z.string().min(5, "Enter the question callers might ask."),
  answer: z.string().min(5, "Enter the answer your voice agent should give."),
  category: z.enum(["general", "pricing", "policies", "amenities", "booking", "support", "other"]),
  compoundId: z.string().optional().or(z.literal("")),
  propertyId: z.string().optional().or(z.literal("")),
});

export type FaqFormValues = z.infer<typeof faqSchema>;
