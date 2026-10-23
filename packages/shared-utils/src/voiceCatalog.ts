import type { VoiceGender, VoiceTone } from "@sandy/shared-types";

/**
 * A small curated reference list used only by this demo's UI and mapping
 * layer to turn a client's voice gender/tone preference into *something*
 * concrete to show in the Agent Studio preview. These ids are deliberately
 * fake-looking (`demo_voice_*`) and must never be treated as real
 * ElevenLabs voice ids — selecting a real voice is a future integration
 * step (a real voice catalog fetched from ElevenLabs, or the client
 * uploading/choosing one directly).
 */
export interface DemoVoiceOption {
  id: string;
  label: string;
  gender: VoiceGender;
  tones: VoiceTone[];
  description: string;
}

export const DEMO_VOICE_CATALOG: DemoVoiceOption[] = [
  {
    id: "demo_voice_female_warm_01",
    label: "Warm Female (Demo)",
    gender: "female",
    tones: ["friendly", "warm"],
    description: "Calm, warm and approachable — suited to concierge and support roles.",
  },
  {
    id: "demo_voice_female_luxury_01",
    label: "Luxury Female (Demo)",
    gender: "female",
    tones: ["luxury_concierge", "formal"],
    description: "Polished, unhurried delivery for premium and luxury brands.",
  },
  {
    id: "demo_voice_male_professional_01",
    label: "Professional Male (Demo)",
    gender: "male",
    tones: ["professional", "formal"],
    description: "Clear, confident, business-appropriate tone.",
  },
  {
    id: "demo_voice_male_sales_01",
    label: "Energetic Male (Demo)",
    gender: "male",
    tones: ["sales_oriented", "friendly"],
    description: "Upbeat and persuasive, suited to sales-forward agents.",
  },
];

export function pickDemoVoice(gender: VoiceGender, tone: VoiceTone): DemoVoiceOption {
  const byGenderAndTone = DEMO_VOICE_CATALOG.find((voice) => voice.gender === gender && voice.tones.includes(tone));
  if (byGenderAndTone) return byGenderAndTone;
  const byGender = DEMO_VOICE_CATALOG.find((voice) => voice.gender === gender);
  return byGender ?? DEMO_VOICE_CATALOG[0]!;
}
