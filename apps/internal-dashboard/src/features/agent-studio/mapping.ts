import type {
  AgentRequest,
  BusinessProfile,
  Client,
  Compound,
  ContactNumber,
  Faq,
  JsonValue,
  Property,
} from "@sandy/shared-types";
import { pickDemoVoice } from "@sandy/shared-utils";
import { getAtPath, setAtPath } from "./jsonPath";
import { ROBOT_SENSITIVITY_TO_STABILITY } from "./configSchema";

export interface ClientMappingContext {
  client: Client;
  businessProfile: BusinessProfile | null;
  properties: Property[];
  compounds: Compound[];
  faqs: Faq[];
  contacts: ContactNumber[];
  /** The specific requested agent being mapped, if this draft is tied to one. */
  agentRequest?: AgentRequest | null;
}

const TONE_LABEL: Record<NonNullable<AgentRequest["tone"]>, string> = {
  professional: "professional and precise",
  friendly: "friendly and approachable",
  luxury_concierge: "polished, unhurried and luxury-concierge in style",
  formal: "formal and courteous",
  warm: "warm and welcoming",
  sales_oriented: "upbeat and sales-oriented, while staying honest and non-pushy",
};

/** Appended — never replaces — the template's own system prompt. */
export function buildBusinessKnowledgeBlock(context: ClientMappingContext): string {
  const { businessProfile, properties, compounds, faqs, client, agentRequest } = context;
  const lines: string[] = ["# Business Knowledge (auto-generated — do not edit the template above this line)"];

  const name = businessProfile?.businessName ?? client.name;
  lines.push(`You represent ${name}, a ${client.businessCategory.toLowerCase()} business.`);

  if (businessProfile?.description) lines.push(businessProfile.description);

  if (businessProfile?.supportedServices.length) {
    lines.push(`Services offered: ${businessProfile.supportedServices.join(", ")}.`);
  }

  if (compounds.length > 0) {
    lines.push(`Compounds and communities you can discuss: ${compounds.map((c) => c.name).join(", ")}.`);
  }

  if (properties.length > 0) {
    lines.push(`There are ${properties.length} properties on file; describe them when asked, but never invent details you don't have.`);
  }

  if (businessProfile?.policies.length) {
    lines.push(`Business policies: ${businessProfile.policies.map((p) => `${p.title}: ${p.description}`).join(" ")}`);
  }

  if (faqs.length > 0) {
    lines.push("Frequently asked questions you should be able to answer:");
    for (const faq of faqs.slice(0, 12)) {
      lines.push(`- Q: ${faq.question} A: ${faq.answer}`);
    }
  }

  if (agentRequest) {
    lines.push(`# Agent Preferences (auto-generated from the client's request "${agentRequest.label}")`);
    lines.push(`Speak in a tone that is ${TONE_LABEL[agentRequest.tone]}.`);
    if (agentRequest.language === "arabic" || agentRequest.language === "bilingual") {
      const dialectLabel = agentRequest.arabicDialect ? agentRequest.arabicDialect.replace("_", " ") : "Modern Standard";
      lines.push(`When speaking Arabic, use ${dialectLabel} Arabic.`);
    }
    if (agentRequest.customInstructions) {
      lines.push(`Additional client instructions: ${agentRequest.customInstructions}`);
    }
  }

  lines.push("If you don't know the answer to something, offer to connect the caller with a team member instead of guessing.");

  return lines.join("\n");
}

export function buildGreeting(context: ClientMappingContext, language: "en" | "ar" = "en"): string {
  const name = context.businessProfile?.businessName ?? context.client.name;
  return language === "ar"
    ? `أهلاً بيك في ${name}. إزاي أقدر أساعد حضرتك النهاردة؟`
    : `Thank you for calling ${name}. How can I help you today?`;
}

/** Real ElevenLabs built-in system tools (from the reference export), not invented ones. */
export function buildBuiltInTools(context: ClientMappingContext): JsonValue {
  const tools: JsonValue[] = [
    {
      type: "system",
      name: "end_call",
      description: "End the call once the caller's request has been resolved or they want to hang up.",
      params: { system_tool_type: "end_call" },
    },
  ];
  if (context.agentRequest?.language === "bilingual") {
    tools.push({
      type: "system",
      name: "language_detection",
      description: "Switch language if the caller speaks in a different language than the current one.",
      params: { system_tool_type: "language_detection", only_at_conversation_start: false },
    });
  }
  return tools;
}

export interface MappingResult {
  mappedConfig: Record<string, JsonValue>;
  appliedFieldPaths: string[];
}

/**
 * Maps client business data and the selected agent request onto the
 * supported fields of an imported agent configuration. This is deterministic
 * — the same raw config, client data and agent request always produce the
 * same mapped output — and conservative: it only ever writes to the paths
 * listed in `appliedFieldPaths`, appends to (never replaces) the system
 * prompt, and never overwrites a field the template already set unless that
 * field is explicitly part of this client's preferences (name, greeting,
 * dynamic variables, voice stability).
 */
export function mapClientDataToAgentConfig(
  config: Record<string, JsonValue>,
  context: ClientMappingContext,
): MappingResult {
  const appliedFieldPaths: string[] = [];
  let next = config;
  const { agentRequest } = context;

  const name = context.businessProfile?.businessName ?? context.client.name;
  const agentName = agentRequest ? `${name} — ${agentRequest.label}` : name;
  next = setAtPath(next, "name", agentName);
  appliedFieldPaths.push("name");

  // Dynamic variables are the safest mapping target: the template's own
  // prompt/first_message can reference {{company_name}} etc. without us
  // having to rewrite that text.
  const existingPlaceholders = getAtPath(next, "conversation_config.agent.dynamic_variables.dynamic_variable_placeholders");
  const placeholders: Record<string, JsonValue> =
    typeof existingPlaceholders === "object" && existingPlaceholders !== null && !Array.isArray(existingPlaceholders)
      ? { ...existingPlaceholders }
      : {};
  placeholders.company_name = name;
  placeholders.contact_phone = context.businessProfile?.contactPhone ?? context.client.contactPhone;
  placeholders.contact_email = context.businessProfile?.contactEmail ?? context.client.contactEmail;
  next = setAtPath(next, "conversation_config.agent.dynamic_variables.dynamic_variable_placeholders", placeholders);
  appliedFieldPaths.push("conversation_config.agent.dynamic_variables.dynamic_variable_placeholders");

  const primaryLanguage: "en" | "ar" = !agentRequest ? "en" : agentRequest.language === "english" ? "en" : "ar";
  next = setAtPath(next, "conversation_config.agent.language", primaryLanguage);
  appliedFieldPaths.push("conversation_config.agent.language");

  next = setAtPath(next, "conversation_config.agent.first_message", buildGreeting(context, primaryLanguage));
  appliedFieldPaths.push("conversation_config.agent.first_message");

  if (agentRequest?.language === "bilingual") {
    const secondaryLanguage = primaryLanguage === "ar" ? "en" : "ar";
    const existingPresets = getAtPath(next, "conversation_config.language_presets");
    const presets: Record<string, JsonValue> =
      typeof existingPresets === "object" && existingPresets !== null && !Array.isArray(existingPresets) ? { ...existingPresets } : {};
    if (!(secondaryLanguage in presets)) {
      presets[secondaryLanguage] = {
        overrides: { agent: { first_message: buildGreeting(context, secondaryLanguage) } },
      };
      next = setAtPath(next, "conversation_config.language_presets", presets);
      appliedFieldPaths.push("conversation_config.language_presets");
    }
  }

  const existingPrompt = getAtPath(next, "conversation_config.agent.prompt.prompt");
  const basePrompt = typeof existingPrompt === "string" ? existingPrompt : "";
  const knowledgeBlock = buildBusinessKnowledgeBlock(context);
  if (!basePrompt.includes("# Business Knowledge (auto-generated")) {
    next = setAtPath(next, "conversation_config.agent.prompt.prompt", basePrompt ? `${basePrompt}\n\n${knowledgeBlock}` : knowledgeBlock);
    appliedFieldPaths.push("conversation_config.agent.prompt.prompt");
  }

  if (agentRequest) {
    const stability = ROBOT_SENSITIVITY_TO_STABILITY[agentRequest.robotSensitivity];
    next = setAtPath(next, "conversation_config.tts.stability", stability);
    appliedFieldPaths.push("conversation_config.tts.stability");

    if (getAtPath(next, "conversation_config.tts.voice_id") === undefined) {
      const voice = pickDemoVoice(agentRequest.voiceGender, agentRequest.tone);
      next = setAtPath(next, "conversation_config.tts.voice_id", voice.id);
      appliedFieldPaths.push("conversation_config.tts.voice_id");
    }
  }

  if (getAtPath(next, "conversation_config.agent.prompt.tools") === undefined) {
    next = setAtPath(next, "conversation_config.agent.prompt.tools", buildBuiltInTools(context));
    appliedFieldPaths.push("conversation_config.agent.prompt.tools");
  }

  return { mappedConfig: next, appliedFieldPaths };
}
