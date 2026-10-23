// Renders docs/state-spec.md from STATE_SPECS and the transition map (section C of the spec),
// so the documented rules are the enforced ones.
// Usage: node scripts/render-state-spec.js > ../docs/state-spec.md
import { STATES, STATE_SPECS, TERMINAL_STATES, TRANSITIONS, nextStatesOf } from '../src/domain/state-machine.js';
import { loadPlaybook } from '../src/domain/playbook.js';

const limits = loadPlaybook().limits;
const out = ['# State Specification', '', '> GENERATED from `backend/src/domain/state-machine.js`. Run `node scripts/render-state-spec.js > ../docs/state-spec.md` after changing it.', ''];
out.push('Global events from every live state: `dnc_requested` → DO_NOT_CALL, `disconnected` → CALL_SUMMARY, `clarification_needed` → same state (counted).', '');
out.push(`Limits (\`config/sales-playbook.json\`): ${Object.entries(limits).map(([k, v]) => `\`${k}\`=${v}`).join(', ')}`, '');
const list = (a) => (a.length ? a.join('; ') : '—');
for (const s of STATES) {
  const spec = STATE_SPECS[s];
  out.push(`## ${s}`, '');
  out.push('| | |', '|---|---|');
  out.push(`| Runs in | ${spec.runsIn} |`);
  out.push(`| Entry conditions | ${spec.entry} |`);
  out.push(`| Objective | ${spec.objective} |`);
  out.push(`| Required inputs | ${list(spec.requiredInputs)} |`);
  out.push(`| Allowed dialogue intentions | ${list(spec.allowedIntents)} |`);
  out.push(`| Required actions | ${list(spec.requiredActions)} |`);
  out.push(`| Successful exit | ${spec.success} |`);
  out.push(`| Alternative exits | ${spec.alternatives} |`);
  out.push(`| Error handling | ${spec.errorHandling} |`);
  out.push(`| Events accepted | ${list(Object.entries(TRANSITIONS[s]).map(([e, t]) => `\`${e}\` → ${t}`))} |`);
  out.push(`| Next permitted states | ${list(nextStatesOf(s))} |`);
  out.push(`| Terminal | ${TERMINAL_STATES.includes(s) ? 'yes' : 'no'} |`, '');
}
console.log(out.join('\n'));
