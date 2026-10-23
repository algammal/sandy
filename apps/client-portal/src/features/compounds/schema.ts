import { z } from "zod";

export const compoundSchema = z.object({
  name: z.string().min(2, "Compound name is required."),
  description: z.string().min(10, "Add a short description (10+ characters)."),
  locationId: z.string().optional().or(z.literal("")),
  amenityIds: z.array(z.string()),
  contactNumberIds: z.array(z.string()),
  faqIds: z.array(z.string()),
});

export type CompoundFormValues = z.infer<typeof compoundSchema>;
