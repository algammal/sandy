import { createServer } from 'node:http';
import { SalesCallService, createHandler, jsonLogger } from './app.js';
import { loadConfig } from './config.js';
import { ElevenLabsClient } from './elevenlabs/client.js';
import { EventDispatcher } from './events/dispatcher.js';
import { defaultAdapters } from './integrations/adapters.js';
import { JsonStore } from './store/json-store.js';
import { loadPlaybook } from './domain/playbook.js';

const config = loadConfig();
const store = await new JsonStore(config.dataDir).init();
const elevenlabs = new ElevenLabsClient(config.elevenlabs);
const dispatcher = new EventDispatcher({ store, adapters: defaultAdapters(), logger: jsonLogger });
const playbook = loadPlaybook();
const service = new SalesCallService({ config, store, elevenlabs, dispatcher, playbook });

const purged = await store.purgeOlderThan(config.retentionDays);
const server = createServer(createHandler({ service, config }));
server.listen(config.port, () => {
  jsonLogger.info('server.started', { port: config.port, call_mode: config.callMode, dry_run: config.dryRun, purged });
});
