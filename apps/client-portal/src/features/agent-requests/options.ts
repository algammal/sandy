import type { SelectOption } from "@sandy/ui";

export const businessTypeOptions: SelectOption[] = [
  { value: "Real Estate Developer", label: "Real estate developer" },
  { value: "Property Management", label: "Property management" },
  { value: "Residential Compounds", label: "Residential compounds" },
  { value: "Property Sales", label: "Property sales" },
  { value: "Hospitality", label: "Hospitality" },
  { value: "Customer Support", label: "Customer support" },
  { value: "Other", label: "Other" },
];

export const languageOptions: SelectOption[] = [
  { value: "english", label: "English" },
  { value: "arabic", label: "Arabic" },
  { value: "bilingual", label: "Arabic & English (bilingual)" },
];

export const arabicDialectOptions: SelectOption[] = [
  { value: "egyptian", label: "Egyptian Arabic" },
  { value: "msa", label: "Modern Standard Arabic" },
  { value: "gulf", label: "Gulf Arabic" },
  { value: "levantine", label: "Levantine Arabic" },
  { value: "maghrebi", label: "Maghrebi Arabic" },
];

export const toneOptions: SelectOption[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "luxury_concierge", label: "Luxury concierge" },
  { value: "formal", label: "Formal" },
  { value: "warm", label: "Warm and welcoming" },
  { value: "sales_oriented", label: "Sales-oriented" },
];

export const robotSensitivityOptions = [
  {
    value: "natural",
    label: "Natural & conversational",
    description: "Favors natural, varied phrasing — may sound less consistent call to call.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "A middle ground between natural variation and consistency.",
  },
  {
    value: "controlled",
    label: "More consistent & controlled",
    description: "Favors consistent, predictable phrasing over conversational variety.",
  },
] as const;
