// Minimal file-backed store. Single-process only; swap for a database adapter with the
// same methods when moving beyond a pilot.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EMPTY = () => ({
  leads: {},
  campaigns: {},
  calls: {},
  suppression: {},
  processed_webhooks: {},
  events: {},
  outbox: [],
  flow_contexts: {},
});

export class JsonStore {
  constructor(dir) {
    this.file = path.join(dir, 'store.json');
    this.dir = dir;
    this.data = EMPTY();
    this.queue = Promise.resolve();
  }

  async init() {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    try {
      this.data = { ...EMPTY(), ...JSON.parse(await readFile(this.file, 'utf8')) };
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    return this;
  }

  // Serialised atomic write: temp file + rename.
  persist() {
    this.queue = this.queue.then(async () => {
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
      await rename(tmp, this.file);
    });
    return this.queue;
  }

  getLead(id) {
    return this.data.leads[id] ?? null;
  }
  async putLead(lead) {
    this.data.leads[lead.id] = lead;
    await this.persist();
  }

  getCampaign(id) {
    return this.data.campaigns[id] ?? null;
  }
  async putCampaign(campaign) {
    this.data.campaigns[campaign.id] = campaign;
    await this.persist();
  }

  isSuppressed(phone) {
    return Boolean(this.data.suppression[phone]);
  }
  async suppress(phone, reason) {
    this.data.suppression[phone] = { reason, at: new Date().toISOString() };
    await this.persist();
  }

  getCall(conversationId) {
    return this.data.calls[conversationId] ?? null;
  }
  activeCallForLead(leadId) {
    return Object.values(this.data.calls).find((c) => c.lead_id === leadId && c.status === 'in_progress') ?? null;
  }
  async putCall(call) {
    this.data.calls[call.conversation_id] = call;
    await this.persist();
  }

  // Returns false if this webhook was already processed.
  async markWebhookProcessed(key) {
    if (this.data.processed_webhooks[key]) return false;
    this.data.processed_webhooks[key] = new Date().toISOString();
    await this.persist();
    return true;
  }

  // In-call controller state per conversation (recovery after a tool retry or restart).
  getFlowContext(conversationId) {
    return this.data.flow_contexts[conversationId] ?? null;
  }
  async putFlowContext(ctx) {
    this.data.flow_contexts[ctx.conversationId] = ctx;
    await this.persist();
  }

  async recordEvent(event) {
    if (this.data.events[event.id]) return false;
    this.data.events[event.id] = event;
    await this.persist();
    return true;
  }
  listEvents() {
    return Object.values(this.data.events);
  }

  async addOutbox(entry) {
    this.data.outbox.push({ ...entry, created_at: new Date().toISOString() });
    await this.persist();
  }
  listOutbox() {
    return this.data.outbox;
  }

  // Retention: drop call summaries, events and outbox payloads older than `days`.
  async purgeOlderThan(days, now = new Date()) {
    if (!days) return 0;
    const cutoff = now.getTime() - days * 86400 * 1000;
    let removed = 0;
    for (const [id, call] of Object.entries(this.data.calls)) {
      if (Date.parse(call.started_at) < cutoff) {
        delete this.data.calls[id];
        removed++;
      }
    }
    for (const [id, event] of Object.entries(this.data.events)) {
      if (Date.parse(event.occurred_at) < cutoff) {
        delete this.data.events[id];
        removed++;
      }
    }
    for (const [id, ctx] of Object.entries(this.data.flow_contexts)) {
      if (Date.parse(ctx.updated_at) < cutoff) {
        delete this.data.flow_contexts[id];
        removed++;
      }
    }
    const before = this.data.outbox.length;
    this.data.outbox = this.data.outbox.filter((o) => Date.parse(o.created_at) >= cutoff);
    removed += before - this.data.outbox.length;
    await this.persist();
    return removed;
  }
}
