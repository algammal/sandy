import { validateEvent } from './catalog.js';

// Records each event once and fans it out to subscribed adapters.
// Disabled adapters produce an outbox entry with status "not_sent"; nothing is delivered.
export class EventDispatcher {
  constructor({ store, adapters, logger }) {
    this.store = store;
    this.adapters = adapters;
    this.logger = logger;
  }

  async publish(events, lead) {
    for (const event of events) {
      const errors = validateEvent(event);
      if (errors.length) {
        this.logger.error('event.invalid', { event_id: event.id, errors });
        continue;
      }
      // Idempotent: duplicate webhooks produce the same event id.
      const isNew = await this.store.recordEvent(event);
      if (!isNew) continue;

      for (const adapter of this.adapters) {
        if (!adapter.subscribes.includes(event.type)) continue;
        const plan = adapter.plan(event, lead);
        if (!plan) continue;

        let status = 'not_sent';
        let detail = 'integration_disabled';
        if (plan.action === 'blocked') {
          status = 'blocked';
          detail = plan.payload.reason;
        } else if (adapter.enabled) {
          try {
            const result = await adapter.execute(plan);
            status = result.status;
            detail = result.external_id ?? '';
          } catch (err) {
            status = 'failed';
            detail = err.message;
          }
        }
        await this.store.addOutbox({ event_id: event.id, adapter: adapter.name, status, detail, plan });
      }
    }
  }
}
