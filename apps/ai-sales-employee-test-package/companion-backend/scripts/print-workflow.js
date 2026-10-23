// Prints the ElevenLabs workflow graph generated from the backend state machine.
// Usage:
//   node scripts/print-workflow.js [objectionKbDocId] > ../agent/workflow.json
//   node scripts/print-workflow.js [objectionKbDocId] --mode controller --tool-id <toolId> > ../agent/workflow.controller.json
// Then apply it in ElevenLabs (PATCH agent workflow, or agents_update_workflow via MCP).
import { buildWorkflow } from '../src/elevenlabs/workflow.js';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const mode = flag('--mode') ?? 'llm';
const flowToolId = flag('--tool-id');
const kbId = args[0];
const locator = kbId ? { type: 'text', id: kbId, name: '05 - Objection Registry', usage_mode: 'auto' } : undefined;
console.log(JSON.stringify(buildWorkflow({ objectionKbLocator: locator, mode, flowToolId }), null, 2));
