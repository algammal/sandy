// Structured (deterministic) ElevenLabs procedures, defined in config/procedures.json.
// Each renders to the `content` JSON that ElevenLabs expects for type=deterministic.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_PATH = fileURLToPath(new URL('../../config/procedures.json', import.meta.url));

export const STEP_TYPES = ['ask', 'tell', 'say', 'sub_procedure', 'tool_call', 'system_tool', 'branch'];
const SUB_TOKEN = '{{FOLLOW_UP_CAPTURE}}';

export function loadProcedures(path = DEFAULT_PATH) {
  return JSON.parse(readFileSync(path, 'utf8')).procedures;
}

export function loadDeployedIds(path = DEFAULT_PATH) {
  const { _comment, ...ids } = JSON.parse(readFileSync(path, 'utf8')).deployed_ids ?? {};
  return ids;
}

// A structured procedure that actually ran is direct evidence, stronger than the model's
// post-call extraction: e.g. the do-not-call procedure ran -> do_not_call_requested=true.
const EVIDENCE = {
  do_not_call: { do_not_call_requested: true },
  human_requested: { human_requested: true },
};

export function procedureEvidence(proceduresRun, deployedIds) {
  const byId = Object.fromEntries(Object.entries(deployedIds).map(([key, id]) => [id, key]));
  const keys = proceduresRun.map((id) => byId[id]).filter(Boolean);
  return { keys, facts: Object.assign({}, ...keys.map((k) => EVIDENCE[k] ?? {})) };
}

// Walks every step, including steps nested in branches.
export function* walkSteps(steps) {
  for (const step of steps) {
    yield step;
    if (step.type === 'branch') for (const b of step.branches) yield* walkSteps(b.steps);
  }
}

/** Renders one procedure's ElevenLabs body, replacing the sub-procedure placeholder. */
// ElevenLabs stores each translation as a TranslatedString: { "<lang>": { "value": "..." } }.
function toApiStep(step) {
  if (step.type === 'say' && step.message_translations) {
    const translations = Object.fromEntries(Object.entries(step.message_translations).map(([lang, value]) => [lang, { value }]));
    return { ...step, message_translations: translations };
  }
  if (step.type === 'branch') return { ...step, branches: step.branches.map((b) => ({ ...b, steps: b.steps.map(toApiStep) })) };
  return step;
}

export function renderProcedure(proc, { followUpCaptureId } = {}) {
  let json = JSON.stringify({ steps: proc.steps.map(toApiStep) });
  if (json.includes(SUB_TOKEN)) {
    if (!followUpCaptureId) throw new Error(`${proc.key} needs the follow-up capture procedure id`);
    json = json.split(SUB_TOKEN).join(followUpCaptureId);
  }
  return { name: proc.name, type: 'deterministic', trigger: proc.trigger, content: json };
}
