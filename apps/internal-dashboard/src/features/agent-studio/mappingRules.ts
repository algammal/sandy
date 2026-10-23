/** Describes, for display only, what `mapping.ts` actually does — keep in sync with it by hand. */
export interface MappingRuleDescription {
  source: string;
  target: string;
}

export const MAPPING_RULE_DESCRIPTIONS: MappingRuleDescription[] = [
  { source: "Business name", target: "name" },
  { source: "Business name, contact email/phone", target: "agent.dynamic_variables.placeholders" },
  { source: "Requested language / dialect", target: "agent.language + language_presets" },
  { source: "Business description, policies, FAQs", target: "agent.prompt.prompt (appended)" },
  { source: "Robot sensitivity preference", target: "tts.stability" },
  { source: "Voice gender + tone preference", target: "tts.voice_id (demo catalog)" },
  { source: "Bilingual requests", target: "prompt.tools (language_detection)" },
];
