import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().min(2, "Location name is required."),
  line1: z.string().min(2, "Street address is required."),
  line2: z.string().optional().or(z.literal("")),
  city: z.string().min(1, "City is required."),
  region: z.string().min(1, "Region is required."),
  country: z.string().min(1, "Country is required."),
  postalCode: z.string().optional().or(z.literal("")),
  latitude: z.string().optional().or(z.literal("")),
  longitude: z.string().optional().or(z.literal("")),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
