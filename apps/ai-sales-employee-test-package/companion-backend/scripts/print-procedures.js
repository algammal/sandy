// Prints the ElevenLabs bodies for the structured procedures in config/procedures.json.
// Usage: node scripts/print-procedures.js <followUpCaptureProcedureId> > ../agent/procedures.json
// Create the follow-up capture sub-procedure first, then the others with its id.
import { loadProcedures, renderProcedure } from '../src/elevenlabs/procedures.js';

const followUpCaptureId = process.argv[2];
const out = loadProcedures().map((p) => ({ key: p.key, ...renderProcedure(p, { followUpCaptureId }) }));
console.log(JSON.stringify(out, null, 2));
