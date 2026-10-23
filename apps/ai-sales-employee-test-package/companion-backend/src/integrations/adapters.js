// Future integrations: email, CRM / Google Sheets, WhatsApp.
//
// Each adapter implements the same contract:
//   name:        unique id
//   subscribes:  event types it reacts to
//   plan(event, lead) -> null | { action, channel, template?, payload }
//       Pure: decides WHAT it would do. Returns null when the event doesn't apply
//       (e.g. no consent for that channel).
//   execute(plan) -> Promise<{ status, external_id? }>
//       Performs the side effect. Not implemented in this phase.
//
// The dispatcher only calls execute() when the adapter is enabled. In this phase every
// adapter is disabled, so plans are written to the outbox with status "not_sent" and
// nothing leaves the system.

import { EVENT_TYPES as E } from '../events/catalog.js';

class NotImplementedAdapter {
  enabled = false;
  async execute() {
    throw new Error(`${this.name} integration is not implemented in this phase`);
  }
}

export class EmailAdapter extends NotImplementedAdapter {
  name = 'email';
  subscribes = [E.INFORMATION_REQUESTED, E.DEMO_REQUESTED, E.LEAD_FOLLOW_UP_REQUESTED];

  plan(event, lead) {
    // Email requires the customer to have chosen email and an address on file.
    if (event.data.follow_up_channel !== 'email' || !lead.email) return null;
    const template = {
      [E.INFORMATION_REQUESTED]: 'ai_sales_employee_overview',
      [E.DEMO_REQUESTED]: 'demo_request_received',
      [E.LEAD_FOLLOW_UP_REQUESTED]: 'follow_up_after_call',
    }[event.type];
    return { action: 'send_email', channel: 'email', template, payload: { lead_id: lead.id, ...event.data } };
  }
}

export class WhatsAppAdapter extends NotImplementedAdapter {
  name = 'whatsapp';
  subscribes = [E.INFORMATION_REQUESTED, E.DEMO_REQUESTED, E.LEAD_FOLLOW_UP_REQUESTED];

  plan(event, lead) {
    // WhatsApp Business requires a recorded opt-in for that channel, not just call consent.
    if (event.data.follow_up_channel !== 'whatsapp') return null;
    if (lead.channel_consent?.whatsapp !== true) {
      return { action: 'blocked', channel: 'whatsapp', payload: { reason: 'no_whatsapp_opt_in', lead_id: lead.id } };
    }
    const template = {
      [E.INFORMATION_REQUESTED]: 'product_info_v1',
      [E.DEMO_REQUESTED]: 'demo_request_ack_v1',
      [E.LEAD_FOLLOW_UP_REQUESTED]: 'follow_up_v1',
    }[event.type];
    return { action: 'send_template_message', channel: 'whatsapp', template, payload: { lead_id: lead.id, ...event.data } };
  }
}

export class CrmAdapter extends NotImplementedAdapter {
  name = 'crm';
  subscribes = Object.values(E);

  plan(event, lead) {
    // Upsert keyed by lead id: the CRM/sheet must dedupe on this key.
    return {
      action: event.type === E.LEAD_DO_NOT_CALL ? 'mark_do_not_call' : 'upsert_lead',
      channel: 'crm',
      payload: {
        upsert_key: lead.id,
        lead_id: lead.id,
        contact_name: lead.name,
        company_name: lead.company_name,
        contact_role: lead.contact_role,
        category: lead.category,
        status: lead.status,
        qualification: lead.qualification,
        last_outcome: lead.last_outcome,
        event_type: event.type,
      },
    };
  }
}

export function defaultAdapters() {
  return [new EmailAdapter(), new WhatsAppAdapter(), new CrmAdapter()];
}
