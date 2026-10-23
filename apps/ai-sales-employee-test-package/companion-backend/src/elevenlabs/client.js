// Thin wrapper over the ElevenLabs outbound-call API. All ElevenLabs specifics live in this folder.

const OUTBOUND_PATH = {
  twilio: '/v1/convai/twilio/outbound-call',
  sip_trunk: '/v1/convai/sip-trunk/outbound-call',
};

export class ElevenLabsError extends Error {
  constructor(message, { status, retryable }) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

export class ElevenLabsClient {
  constructor({ apiKey, agentId, phoneNumberId, provider, baseUrl, fetchImpl = fetch, timeoutMs = 15000 }) {
    Object.assign(this, { apiKey, agentId, phoneNumberId, provider, baseUrl, fetchImpl, timeoutMs });
  }

  buildOutboundRequest({ toNumber, dynamicVariables }) {
    return {
      url: `${this.baseUrl}${OUTBOUND_PATH[this.provider]}`,
      body: {
        agent_id: this.agentId,
        agent_phone_number_id: this.phoneNumberId,
        to_number: toNumber,
        conversation_initiation_client_data: { dynamic_variables: dynamicVariables },
      },
    };
  }

  // Not retried automatically: a timeout may still have placed the call, and a retry could
  // ring the customer twice. Failed attempts are retried by the campaign retry policy instead.
  async startOutboundCall(args) {
    const { url, body } = this.buildOutboundRequest(args);
    let res;
    try {
      res = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'xi-api-key': this.apiKey, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new ElevenLabsError(`ElevenLabs request failed: ${err.name}`, { status: 0, retryable: false });
    }
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      // Non-JSON error page; handled below.
    }
    if (!res.ok || json.success === false) {
      throw new ElevenLabsError(`ElevenLabs outbound call rejected (HTTP ${res.status})`, {
        status: res.status,
        retryable: res.status === 429 || res.status >= 500,
      });
    }
    if (!json.conversation_id) {
      throw new ElevenLabsError('ElevenLabs response had no conversation_id', { status: res.status, retryable: false });
    }
    return { conversationId: json.conversation_id, callSid: json.callSid ?? json.call_sid ?? null };
  }
}
