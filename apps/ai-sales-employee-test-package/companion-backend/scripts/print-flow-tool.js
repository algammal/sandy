// Prints the ElevenLabs webhook tool definition for the in-call controller (controller mode).
// Usage: node scripts/print-flow-tool.js https://<your-backend>/tools/sales-flow <elevenlabsSecretId> > ../agent/tools/sales-flow-step.json
// Create the tool once (ElevenLabs > Tools, or agents_create_tool), then build the workflow with its id.
import { loadPlaybook } from '../src/domain/playbook.js';
import { buildFlowTool } from '../src/elevenlabs/workflow.js';

const [url = 'https://REPLACE-WITH-YOUR-BACKEND/tools/sales-flow', secretId = 'REPLACE-WITH-ELEVENLABS-SECRET-ID'] = process.argv.slice(2);
console.log(JSON.stringify(buildFlowTool({ url, secretId, playbook: loadPlaybook() }), null, 2));
