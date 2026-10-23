// Renders knowledge-base/05-objection-registry.md from config/sales-playbook.json so the
// agent's objection guidance and the backend registry never drift apart.
// Usage: node scripts/render-objections-kb.js > ../knowledge-base/05-objection-registry.md
import { loadPlaybook } from '../src/domain/playbook.js';

const p = loadPlaybook();
const out = [];
out.push('# Objection Registry and FAQ (approved strategies)');
out.push('');
out.push('> GENERATED from backend/config/sales-playbook.json. Edit the playbook, then re-render. Do not edit by hand.');
out.push('> Rule for the assistant: match the concern to ONE entry below and use its strategy, including any required disclosure. If several concerns come together, handle them in priority order (1 = first), one at a time. Never repeat the same pitch; after the same concern comes back a second time, offer a human follow-up. If the answer is not in the knowledge base, say you don\'t have it confirmed and offer the sales team.');
out.push('');
const RETURNS = { previous: 'return to the conversation where it was', NEXT_STEP_SELECTION: 'offer a next step', FOLLOW_UP_CAPTURE: 'arrange the follow-up' };
for (const o of [...p.objections].sort((a, b) => a.priority - b.priority)) {
  out.push(`## ${o.id} (priority ${o.priority})`);
  out.push(`- Sounds like: ${o.phrases.map((x) => `"${x}"`).join(', ')}`);
  out.push(`- Approved strategy: ${o.strategy}`);
  if (o.required_disclosures.length) out.push(`- Must also say: ${o.required_disclosures.join(' ')}`);
  out.push(`- Follow-up question: ${o.follow_up_question}`);
  out.push(`- Escalate to the human sales team: ${o.escalate_when}`);
  out.push(`- Afterwards: ${RETURNS[o.return_state]}`);
  if (o.kb_sources.length) out.push(`- Sources: ${o.kb_sources.join(', ')}`);
  out.push('');
}
out.push('## Claims you may make');
for (const c of p.approved_claims) out.push(`- ${c}`);
out.push('');
out.push('## Claims you must never make');
for (const c of p.prohibited_claims) out.push(`- ${c}`);
out.push('');
out.push('## Always escalate to the human sales team when');
for (const c of p.escalation_criteria) out.push(`- ${c}`);
console.log(out.join('\n'));
