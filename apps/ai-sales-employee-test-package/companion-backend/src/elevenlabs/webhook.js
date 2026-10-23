import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_SECS = 30 * 60;

// Verifies the `ElevenLabs-Signature: t=<unix>,v0=<hex hmac-sha256 of "<t>.<raw body>">` header.
export function verifySignature({ rawBody, header, secret, now = Date.now() }) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !parts.v0) return false;
  if (Math.abs(now / 1000 - t) > TOLERANCE_SECS) return false;

  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(parts.v0, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// Extracts the fields the core system needs from a post_call_transcription payload.
export function parsePostCall(payload) {
  const data = payload?.data ?? {};
  const results = {};
  for (const [key, item] of Object.entries(data.analysis?.data_collection_results ?? {})) {
    results[key] = item?.value ?? null;
  }
  // Ordered workflow nodes the agent actually visited (ElevenLabs tags each agent turn).
  const workflowNodes = [];
  const proceduresRun = [];
  for (const turn of data.transcript ?? []) {
    const node = turn?.agent_metadata?.workflow_node_id;
    if (node && workflowNodes[workflowNodes.length - 1] !== node) workflowNodes.push(node);
    // Structured procedures compile to nodes named "__xi_procedure__...agtprc_<id>...".
    const procedure = node?.match(/^__xi_procedure__.*?(agtprc_[a-z0-9]+)/)?.[1];
    if (procedure && !proceduresRun.includes(procedure)) proceduresRun.push(procedure);
  }
  return {
    conversationId: data.conversation_id,
    workflowNodes,
    proceduresRun,
    agentId: data.agent_id,
    summary: String(data.analysis?.transcript_summary ?? '').slice(0, 2000),
    durationSecs: data.metadata?.call_duration_secs ?? null,
    evaluation: Object.fromEntries(
      Object.entries(data.analysis?.evaluation_criteria_results ?? {}).map(([k, v]) => [k, v?.result ?? null]),
    ),
    results,
  };
}
