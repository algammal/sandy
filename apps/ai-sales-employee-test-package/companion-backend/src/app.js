import { timingSafeEqual } from 'node:crypto';
import { checkEligibility } from './domain/eligibility.js';
import { ValidationError, maskPhone, newLeadRecord, parseLeadInput } from './domain/lead.js';
import { parseCampaign } from './domain/campaign.js';
import { applyInitiationFailure, applyOutcome } from './domain/outcome.js';
import { ElevenLabsError } from './elevenlabs/client.js';
import { parsePostCall, verifySignature } from './elevenlabs/webhook.js';
import { FLOW_VARIABLE, pathFromWorkflowNodes } from './elevenlabs/workflow.js';
import { FlowRequestError, handleFlowStep } from './elevenlabs/flow-tool.js';
import { LIVE_STATES, applyEvent, validatePath } from './domain/state-machine.js';
import { loadDeployedIds, procedureEvidence } from './elevenlabs/procedures.js';

const MAX_BODY_BYTES = 1024 * 1024;

// Structured logs. Never log phone numbers, names or transcripts.
export const jsonLogger = {
  info: (msg, fields = {}) => console.log(JSON.stringify({ level: 'info', msg, ...fields })),
  error: (msg, fields = {}) => console.error(JSON.stringify({ level: 'error', msg, ...fields })),
};

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class SalesCallService {
  constructor({ config, store, elevenlabs, dispatcher, playbook, procedureIds = loadDeployedIds(), logger = jsonLogger, clock = () => new Date() }) {
    Object.assign(this, { config, store, elevenlabs, dispatcher, playbook, procedureIds, logger, clock });
  }

  async upsertCampaign(input) {
    const campaign = parseCampaign(input);
    await this.store.putCampaign(campaign);
    return campaign;
  }

  async upsertLead(input) {
    const parsed = parseLeadInput(input);
    const existing = this.store.getLead(parsed.id);
    const now = this.clock();
    // Re-import never clears call history or a do-not-call flag.
    const lead = existing ? { ...existing, ...parsed, updated_at: now.toISOString() } : newLeadRecord(parsed, now);
    await this.store.putLead(lead);
    return lead;
  }

  // Procedure 1 (pre-call validation) followed by explicit, authorised initiation.
  async startCall({ lead_id, campaign_id, confirm }) {
    if (confirm !== true) throw new HttpError(400, 'Set "confirm": true to place a real call');
    const now = this.clock();
    const lead = this.store.getLead(lead_id);
    const campaign = this.store.getCampaign(campaign_id);
    const verdict = checkEligibility({
      lead,
      campaign,
      suppressed: lead ? this.store.isSuppressed(lead.phone) : false,
      activeCall: lead ? this.store.activeCallForLead(lead.id) : null,
      callMode: this.config.callMode,
      testAllowlist: this.config.testAllowlist,
      now,
    });
    if (!verdict.eligible) {
      this.logger.info('call.blocked', { lead_id, campaign_id, reasons: verdict.reasons });
      throw new HttpError(422, 'Lead is not eligible to be called', { reasons: verdict.reasons });
    }

    const dynamicVariables = {
      contact_name: lead.name,
      prospect_company: lead.company_name,
      contact_role: lead.contact_role || '',
      agent_name: this.config.agentPersonaName,
      company_name: this.config.companyName,
      contact_reason: lead.contact_reason || '',
      lead_id: lead.id,
      campaign_name: campaign.name,
      campaign_focus: campaign.campaign_focus,
      // Controller mode: the workflow starts in the permission node; only the backend changes it.
      [FLOW_VARIABLE]: 'permission',
    };

    if (this.config.dryRun) {
      const preview = this.elevenlabs.buildOutboundRequest({ toNumber: lead.phone, dynamicVariables });
      preview.body.to_number = maskPhone(lead.phone);
      return { dry_run: true, would_send: preview };
    }

    // Count the attempt before dialing so a crash can't cause an uncounted re-dial.
    const attempted = { ...lead, attempts: lead.attempts + 1, last_attempt_at: now.toISOString(), status: 'calling' };
    await this.store.putLead(attempted);

    try {
      const { conversationId, callSid } = await this.elevenlabs.startOutboundCall({ toNumber: lead.phone, dynamicVariables });
      await this.store.putCall({
        conversation_id: conversationId,
        call_sid: callSid,
        lead_id: lead.id,
        campaign_id: campaign.id,
        status: 'in_progress',
        started_at: now.toISOString(),
      });
      this.logger.info('call.started', { lead_id: lead.id, campaign_id: campaign.id, conversation_id: conversationId });
      return { dry_run: false, conversation_id: conversationId, status: 'in_progress' };
    } catch (err) {
      await this.store.putLead({ ...attempted, status: 'retry_scheduled' });
      this.logger.error('call.start_failed', { lead_id: lead.id, status: err.status, message: err.message });
      if (err instanceof ElevenLabsError) {
        throw new HttpError(502, 'ElevenLabs could not start the call', { retryable: err.retryable });
      }
      throw err;
    }
  }

  // In-call controller (sales_flow_step webhook tool). See src/elevenlabs/flow-tool.js.
  async handleFlowTool({ body, secretHeader }) {
    const secret = this.config.salesFlowToolSecret;
    if (!secret) throw new HttpError(404, 'Not found');
    const supplied = Buffer.from(secretHeader ?? '');
    const expected = Buffer.from(secret);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new HttpError(401, 'Unauthorized');
    try {
      const result = await handleFlowStep({ body, store: this.store, playbook: this.playbook, callMode: this.config.callMode, now: this.clock() });
      this.logger.info('flow.step', { conversation_id: body.conversation_id, intent: body.intent, accepted: result.accepted, node: result.next_node });
      return result;
    } catch (err) {
      if (err instanceof FlowRequestError) throw new HttpError(400, err.message);
      throw err;
    }
  }

  // Controller path for a finished call: a hang-up in a live state is a disconnection.
  controllerPath(conversationId) {
    let ctx = this.store.getFlowContext(conversationId);
    if (!ctx) return null;
    if (LIVE_STATES.includes(ctx.currentState)) ctx = applyEvent(ctx, { type: 'disconnected' });
    return ctx;
  }

  async recordSave(ctx, type) {
    if (!ctx || ctx.currentState !== 'CALL_SUMMARY') return;
    await this.store.putFlowContext({ ...applyEvent(ctx, { type }), updated_at: this.clock().toISOString() });
  }

  async handleWebhook({ rawBody, signatureHeader }) {
    if (!verifySignature({ rawBody, header: signatureHeader, secret: this.config.elevenlabs.webhookSecret, now: this.clock().getTime() })) {
      throw new HttpError(401, 'Invalid webhook signature');
    }
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new HttpError(400, 'Webhook body is not JSON');
    }
    const type = payload.type;
    const conversationId = payload.data?.conversation_id;
    if (!conversationId) throw new HttpError(400, 'Webhook has no conversation_id');
    if (this.config.elevenlabs.agentId && payload.data?.agent_id && payload.data.agent_id !== this.config.elevenlabs.agentId) {
      return { ignored: 'other_agent' };
    }

    const key = `${type}:${conversationId}`;
    if (this.store.data.processed_webhooks[key]) return { duplicate: true };

    // Only conversations this service started are trusted to update leads.
    const call = this.store.getCall(conversationId);
    if (!call) {
      this.logger.info('webhook.unknown_conversation', { conversation_id: conversationId, type });
      await this.store.markWebhookProcessed(key);
      return { ignored: 'unknown_conversation' };
    }
    const lead = this.store.getLead(call.lead_id);
    const campaign = this.store.getCampaign(call.campaign_id);
    const now = this.clock();

    let result;
    let flowCtx = null;
    if (type === 'post_call_transcription') {
      const parsed = parsePostCall(payload);
      // Controller mode: the backend's own transition history is the authoritative path; the
      // node trace is kept as a cross-check. LLM mode: the node trace is the only evidence.
      flowCtx = this.controllerPath(conversationId);
      const tracePath = parsed.workflowNodes.length ? pathFromWorkflowNodes(parsed.workflowNodes) : null;
      const controllerPath = flowCtx ? [...flowCtx.history, ...(flowCtx.currentState === 'CALL_SUMMARY' ? ['CALL_COMPLETED'] : [])] : null;
      const evidence = procedureEvidence(parsed.proceduresRun, this.procedureIds);
      result = applyOutcome({
        lead,
        results: { ...parsed.results, ...evidence.facts },
        conversation: { id: conversationId, summary: parsed.summary, durationSecs: parsed.durationSecs },
        campaign,
        playbook: this.playbook,
        path: controllerPath ?? tracePath,
        now,
      });
      // Suppress first: if a later write fails and the webhook is retried, the number is already safe.
      if (result.lead.do_not_call) await this.store.suppress(lead.phone, 'customer_request');
      await this.store.putCall({
        ...call,
        status: 'completed',
        ended_at: now.toISOString(),
        evaluation: parsed.evaluation,
        state_path: result.flow.path,
        flow_valid: result.flow.valid,
        flow_violations: result.flow.violations,
        flow_source: controllerPath ? 'controller' : tracePath ? 'workflow_trace' : 'none',
        procedures_run: evidence.keys,
        ...(controllerPath && tracePath ? { trace_matches_controller: validatePath(tracePath).valid && sameStages(tracePath, controllerPath) } : {}),
      });
      if (result.flow.valid === false) this.logger.error('call.flow_violation', { conversation_id: conversationId, violations: result.flow.violations });
    } else if (type === 'call_initiation_failure') {
      result = applyInitiationFailure({ lead, campaign, conversationId, failureReason: payload.data.failure_reason, now });
      await this.store.putCall({ ...call, status: 'failed', ended_at: now.toISOString() });
    } else {
      return { ignored: `unhandled_type:${type}` };
    }

    // If any write below throws, the webhook is NOT marked processed: the handler returns 500,
    // ElevenLabs retries, and deterministic event ids prevent duplicate business actions.
    try {
      await this.store.putLead(result.lead);
      await this.dispatcher.publish(result.events, result.lead);
      await this.store.markWebhookProcessed(key);
    } catch (err) {
      // A failed save is recorded, never reported as saved (CALL_SUMMARY retries in place).
      await this.recordSave(flowCtx, 'outcome_save_failed').catch(() => {});
      throw err;
    }
    await this.recordSave(flowCtx, 'outcome_saved');
    this.logger.info('webhook.processed', { conversation_id: conversationId, type, lead_id: lead.id, category: result.lead.category });
    return { processed: true, lead_category: result.lead.category, events: result.events.map((e) => e.type) };
  }
}

// Compares the in-call stages of two paths, ignoring pass-through and post-call states
// (a dropped call never reaches the close node, but the controller still summarises it).
const NOT_IN_CALL = ['LEAD_QUALIFICATION', 'CALL_SUMMARY', 'CALL_COMPLETED'];
function sameStages(a, b) {
  const stages = (p) => p.filter((s, i) => !NOT_IN_CALL.includes(s) && s !== p[i - 1]);
  return JSON.stringify(stages(a)) === JSON.stringify(stages(b));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseJson(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, 'Body is not valid JSON');
  }
}

function isAuthorized(req, token) {
  const header = req.headers.authorization ?? '';
  const supplied = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function publicLead(lead) {
  return { ...lead, phone: maskPhone(lead.phone) };
}

export function createHandler({ service, config, logger = jsonLogger }) {
  return async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = `${req.method} ${url.pathname}`;

      if (route === 'GET /health') return send(200, { ok: true, call_mode: config.callMode, dry_run: config.dryRun });

      if (route === 'POST /webhooks/elevenlabs') {
        const rawBody = await readBody(req);
        return send(200, await service.handleWebhook({ rawBody, signatureHeader: req.headers['elevenlabs-signature'] }));
      }

      if (route === 'POST /tools/sales-flow') {
        const body = parseJson(await readBody(req));
        return send(200, await service.handleFlowTool({ body, secretHeader: req.headers['x-sales-flow-secret'] }));
      }

      if (url.pathname.startsWith('/api/')) {
        if (!isAuthorized(req, config.adminApiToken)) throw new HttpError(401, 'Unauthorized');
        if (route === 'POST /api/campaigns') return send(200, await service.upsertCampaign(parseJson(await readBody(req))));
        if (route === 'POST /api/leads') return send(200, publicLead(await service.upsertLead(parseJson(await readBody(req)))));
        if (route === 'POST /api/calls') return send(200, await service.startCall(parseJson(await readBody(req))));
        const leadMatch = url.pathname.match(/^\/api\/leads\/([A-Za-z0-9_-]{1,64})$/);
        if (req.method === 'GET' && leadMatch) {
          const lead = service.store.getLead(leadMatch[1]);
          if (!lead) throw new HttpError(404, 'Lead not found');
          return send(200, publicLead(lead));
        }
        if (route === 'GET /api/events') {
          return send(200, { events: service.store.listEvents(), outbox: service.store.listOutbox() });
        }
      }
      throw new HttpError(404, 'Not found');
    } catch (err) {
      if (err instanceof ValidationError) return send(400, { error: err.message, details: err.errors });
      if (err instanceof HttpError) return send(err.status, { error: err.message, ...(err.details ?? {}) });
      logger.error('request.failed', { message: err.message });
      return send(500, { error: 'Internal error' });
    }
  };
}
