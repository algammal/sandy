import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_PATH = fileURLToPath(new URL('../../config/sales-playbook.json', import.meta.url));

// Loads and validates the sales playbook (business rules kept out of the prompt).
export function loadPlaybook(path = DEFAULT_PATH) {
  const playbook = JSON.parse(readFileSync(path, 'utf8'));
  const errors = [];
  const limits = playbook.limits ?? {};
  for (const key of ['max_objection_attempts_per_topic', 'max_clarification_attempts', 'max_discovery_questions', 'max_state_entries', 'max_turns_per_state', 'max_tool_retries']) {
    if (!Number.isInteger(limits[key]) || limits[key] < 1) errors.push(`limits.${key} must be a positive integer`);
  }
  if (!Array.isArray(playbook.discovery?.required_fields) || playbook.discovery.required_fields.length === 0) {
    errors.push('discovery.required_fields must be a non-empty array');
  }
  const ids = new Set();
  const priorities = new Set();
  for (const o of playbook.objections ?? []) {
    if (!o.id || !o.strategy || !o.return_state) errors.push(`objection ${o.id ?? '?'} needs id, strategy, return_state`);
    if (ids.has(o.id)) errors.push(`duplicate objection id ${o.id}`);
    ids.add(o.id);
    if (!Number.isInteger(o.priority) || o.priority < 1) errors.push(`objection ${o.id} needs a positive integer priority`);
    else if (priorities.has(o.priority)) errors.push(`objection ${o.id} reuses priority ${o.priority}`);
    priorities.add(o.priority);
    if (!['previous', 'NEXT_STEP_SELECTION', 'FOLLOW_UP_CAPTURE'].includes(o.return_state)) errors.push(`objection ${o.id} has an invalid return_state`);
  }
  if (!playbook.next_steps?.permitted?.length) errors.push('next_steps.permitted is required');
  if (!playbook.qualification?.hot?.concrete_next_steps?.length) errors.push('qualification.hot.concrete_next_steps is required');
  if (errors.length) throw new Error(`Invalid sales playbook:\n- ${errors.join('\n- ')}`);
  return playbook;
}
