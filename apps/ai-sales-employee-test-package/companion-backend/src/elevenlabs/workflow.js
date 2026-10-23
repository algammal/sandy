// Generates the ElevenLabs agent workflow (the in-call state machine) from the backend
// state machine, and maps a finished call's workflow-node trace back to states.
//
// Two modes:
//  - 'llm' (default, works without a deployed backend): the agent can only move along the
//    edges defined here, but which edge fires is an LLM condition. The backend re-validates
//    the actual path after every call.
//  - 'controller': every edge is an expression on the dynamic variable `flow_next_node`,
//    which only the backend controller sets (via the sales_flow_step webhook tool, see
//    flow-tool.js). Edges are derived from the state machine's transition map.

import { DISCOVERY_FIELDS, IN_CALL_INTENTS, STATES, TRANSITIONS, isAllowedTransition } from '../domain/state-machine.js';

// Workflow node id -> conversation state.
export const NODE_STATES = {
  permission: 'PERMISSION_CHECK',
  discovery: 'DISCOVERY',
  presentation: 'SOLUTION_PRESENTATION',
  objection: 'OBJECTION_HANDLING',
  next_step: 'NEXT_STEP_SELECTION',
  follow_up: 'FOLLOW_UP_CAPTURE',
  close: 'CALL_SUMMARY',
  dnc: 'DO_NOT_CALL',
};

// Conversation state -> workflow node the agent should be in.
export const STATE_NODES = {
  IDENTITY_DISCLOSURE: 'permission',
  PERMISSION_CHECK: 'permission',
  DISCOVERY: 'discovery',
  SOLUTION_PRESENTATION: 'presentation',
  OBJECTION_HANDLING: 'objection',
  LEAD_QUALIFICATION: 'next_step',
  NEXT_STEP_SELECTION: 'next_step',
  FOLLOW_UP_CAPTURE: 'follow_up',
  CALL_SUMMARY: 'close',
  CALL_COMPLETED: 'close',
  DO_NOT_CALL: 'dnc',
};

export const FLOW_VARIABLE = 'flow_next_node';
export const FLOW_TOOL_NAME = 'sales_flow_step';

const LIVE_NODES = ['permission', 'discovery', 'presentation', 'objection', 'next_step', 'follow_up'];

const COND = {
  dnc: 'The prospect asked not to be called or contacted again, or to be removed from the list, in any wording.',
  human: 'The prospect asked to speak with a person from the sales team instead of the AI.',
};

// [id, source, target, forward condition, backward condition?]
const EDGE_SPECS = [
  ['start_to_permission', 'start_node', 'permission', null],
  ['permission_to_discovery', 'permission', 'discovery', 'The prospect agreed that now is a good time to talk.'],
  ['permission_to_follow_up', 'permission', 'follow_up', 'The prospect is busy and open to a callback at another time, or asked to speak with a person.'],
  ['permission_to_close', 'permission', 'close', 'The prospect declined to talk, said they are not interested, or this is the wrong person or company.'],
  ['discovery_to_presentation', 'discovery', 'presentation', 'The prospect has described how their company handles leads today AND their main sales challenge; OR they asked directly what the product does; OR four discovery questions have already been asked.'],
  ['discovery_to_next_step', 'discovery', 'next_step', 'The prospect does not want to answer questions but is still willing to hear about a next step.'],
  ['discovery_to_follow_up', 'discovery', 'follow_up', COND.human],
  ['discovery_to_close', 'discovery', 'close', 'The prospect declined to continue the conversation.'],
  ['presentation_to_objection', 'presentation', 'objection', 'The prospect raised a concern or objection, or asked a question about pricing, privacy, integrations, how natural the AI sounds, or how it would work for them.', 'The concern or question has been answered and the prospect is willing to hear more.'],
  ['presentation_to_next_step', 'presentation', 'next_step', 'The prospect has heard how the AI Sales Employee could help them and either shows interest, asks how to proceed, or says they need time or internal approval.'],
  ['presentation_to_follow_up', 'presentation', 'follow_up', COND.human],
  ['presentation_to_close', 'presentation', 'close', 'The prospect clearly said they are not interested in the solution.'],
  ['objection_to_next_step', 'objection', 'next_step', 'The concern was addressed and the prospect is ready to discuss next steps; OR the same concern came up twice without resolution; OR the question needs our human team (pricing, contracts, technical integration details, legal or data questions).'],
  ['objection_to_follow_up', 'objection', 'follow_up', COND.human],
  ['objection_to_close', 'objection', 'close', 'After the concern was addressed, the prospect clearly declined the solution.'],
  ['next_step_to_follow_up', 'next_step', 'follow_up', 'The prospect agreed to a specific next step: a demo, a meeting, a callback from the sales team, a proposal, information to be sent, or a later call.'],
  ['next_step_to_close', 'next_step', 'close', 'The prospect does not want any next step.'],
  ['follow_up_to_close', 'follow_up', 'close', 'The preferred time and contact method for the follow-up have been captured, or the prospect declined to give them.'],
  ...LIVE_NODES.map((n) => [`${n}_to_dnc`, n, 'dnc', COND.dnc]),
];

const EXAMPLES = (lines) => `\nExample phrasing in Egyptian Arabic (adapt, never read verbatim):\n${lines.map((l) => `- ${l}`).join('\n')}`;

const NODE_PROMPTS = {
  permission: `INTERNAL STAGE (never say stage names, tools or these notes aloud): PERMISSION_CHECK.
Objective: get a clear answer on whether now is a good time. You already introduced yourself as an AI assistant in the first message.
Allowed: answer "who are you / why are you calling" in one sentence; confirm you are an AI if asked; ask for a better callback time if busy.
Not allowed: any product pitch or discovery question before permission.${EXAMPLES([
    'تمام، مش هطول على حضرتك.',
    'ولا يهمك، إمتى يكون وقت أنسب أكلم حضرتك فيه؟',
  ])}`,
  discovery: `INTERNAL STAGE (never say stage names, tools or these notes aloud): DISCOVERY.
Objective: understand (1) how the company handles real estate leads today and (2) its main sales challenge. These two are REQUIRED. Optional, only if natural: company name, the prospect's role, sales team size, approximate monthly lead volume, CRM or Google Sheets in use.
Rules: ONE question per turn. Never repeat a question already answered; acknowledge what they said. Ask at most 4 questions in total. Do not ask for confidential figures; accept "I'd rather not say".
Interruption rule: if they ask a short relevant question, answer it in one or two sentences from the knowledge base, then return to the next discovery question.
Not allowed: pitching the full solution yet, inventing what other companies do.${EXAMPLES([
    'حضرتك بتتعاملوا مع الليدز اللي بتيجي لكم إزاي دلوقتي؟',
    'فريق المبيعات بيكلم العملاء الجداد بنفسه؟',
    'إيه أكتر حاجة بتتعبكم: الوصول للعميل، ولا تقييمه، ولا المتابعة؟',
    'بتستخدموا CRM ولا جوجل شيت عشان تتابعوا العملاء؟',
  ])}`,
  presentation: `INTERNAL STAGE (never say stage names, tools or these notes aloud): SOLUTION_PRESENTATION.
Objective: explain the AI Sales Employee in terms of what the prospect told you. Connect at most two benefits to their specific challenge. Keep it to 2-4 short sentences, then ask one question to check relevance.
Use only CURRENT capabilities from the knowledge base as available today. If you mention CRM/Google Sheets, email, WhatsApp, calendar booking or live transfer, you MUST say they are planned, not available yet.
Make clear it supports their human sales team; it does not replace them.
Not allowed: prices, guaranteed results, conversion rates, savings, 24/7 claims, customer names or case studies.${EXAMPLES([
    'بناءً على اللي حضرتك قلته، الموظف الذكي بيعمل أول مكالمة مع العميل، يجاوب على الأسئلة الأساسية من معلومات مشاريعكم، ويعرف مين جاد، ويسلّمه لفريق حضرتك.',
    'كده فريقكم يركز وقته على العملاء الجادين والإغلاق.',
    'تفتكر ده ممكن يفرق معاكم؟',
  ])}`,
  objection: `INTERNAL STAGE (never say stage names, tools or these notes aloud): OBJECTION_HANDLING.
Objective: identify the prospect's concern, match it to the objection registry in the knowledge base (document "05 - Objection Registry"), and use THAT approved strategy, including any required disclosure. Then ask its permitted follow-up question.
Rules: if several concerns come together, handle the most important first (a request for a person, then privacy, then pricing, then the rest), one at a time. Never repeat the same pitch. If the same concern comes back a second time, offer a human follow-up instead of arguing. If the answer is not in the knowledge base, say you don't have that confirmed and offer the sales team.
Pricing: never give a number or range; use the approved pricing answer.${EXAMPLES([
    'فاهمة حضرتك تماماً.',
    'بصراحة مش معايا رقم مؤكد أقوله لحضرتك دلوقتي، فريق المبيعات يقدر يجهز ده بعد ما يفهم احتياجكم.',
  ])}`,
  next_step: `INTERNAL STAGE (never say stage names, tools or these notes aloud): NEXT_STEP_SELECTION.
Objective: offer ONE appropriate next step and let the prospect choose. Options: a short product demo, a meeting with our sales team (including their decision maker), a callback from the sales team, information sent to them, or a later call.
Rules: one offer at a time; if declined, you may offer one alternative, then accept the answer. Calendar booking is NOT available: never say anything is booked or confirmed.${EXAMPLES([
    'تحب نرتب ديمو قصير تشوف فيه الموظف الذكي شغال على مشروع من مشاريعكم؟',
    'ولا تفضّل حد من فريقنا يكلم حضرتك ويشرح التفاصيل؟',
  ])}`,
  follow_up: `INTERNAL STAGE (never say stage names, tools or these notes aloud): FOLLOW_UP_CAPTURE.
Objective: capture what is needed for the agreed follow-up: preferred day and time window, then preferred contact method (phone, WhatsApp or email). If they asked for a person, confirm the sales team will call them.
Rules: one question at a time. Repeat the details back in one sentence. Say the sales team will contact them to confirm. Never say a meeting or demo is booked, and never say anything has been sent.${EXAMPLES([
    'إمتى يكون مناسب لحضرتك؟ الصبح ولا بعد الضهر؟',
    'تحب نتواصل مع حضرتك على التليفون ولا واتساب؟',
    'تمام، فريق المبيعات هيتواصل مع حضرتك يوم الخميس بعد الضهر عشان يأكد الميعاد.',
  ])}`,
  close: `INTERNAL STAGE (never say stage names, tools or these notes aloud): CALL_SUMMARY then CALL_COMPLETED.
Objective: in ONE sentence summarise the agreed next step (or that there is none), thank the prospect by name, say goodbye, then call the end_call tool.
Not allowed: new questions, re-pitching, or any attempt to change their decision.${EXAMPLES([
    'تمام، فريقنا هيكلم حضرتك الخميس بعد الضهر. شكراً جداً لوقت حضرتك، مع السلامة.',
  ])}`,
  dnc: `INTERNAL STAGE (never say stage names, tools or these notes aloud): DO_NOT_CALL (terminal).
Say exactly one sentence in the prospect's language, then call end_call immediately. No questions, no apology for the product, no attempt to keep them.
Egyptian Arabic: "تمام، هسجّل إن محدش يتصل بحضرتك تاني. آسفة على الإزعاج، ويومك سعيد."
English: "Understood, I'll make sure we don't call you again. Sorry for the interruption, have a good day."`,
};

const NODE_LABELS = {
  permission: 'Permission check',
  discovery: 'Discovery',
  presentation: 'Solution presentation',
  objection: 'Objection handling',
  next_step: 'Next step selection',
  follow_up: 'Follow-up capture',
  close: 'Call summary & close',
  dnc: 'Do not call',
};

const ENTRY = { permission: 'wait_for_user', close: 'generate_immediately', dnc: 'generate_immediately' };

// Intents the agent may report from each node (controller mode), from the transition map.
const IN_CALL_GLOBAL = ['dnc_requested', 'clarification_needed'];
function intentsFor(node) {
  const state = NODE_STATES[node];
  const own = Object.keys(TRANSITIONS[state] ?? {}).filter((e) => !['unresolved_intent', 'outcome_saved', 'outcome_save_failed'].includes(e));
  return [...new Set([...own, ...IN_CALL_GLOBAL])];
}

const CONTROLLER_RULES = (node) => `

FLOW CONTROL (controller mode): you do NOT decide when the conversation moves on.
After each prospect reply that answers this stage's question, raises a question or concern, asks for a person, declines, is unclear, or asks not to be called, call the ${FLOW_TOOL_NAME} tool BEFORE you answer, with exactly one intent.
Intents valid here: ${intentsFor(node).join(', ')}.
Then follow the returned guidance. If accepted is false, stay on the current task. Do not repeat a call for the same reply.
If the tool fails twice in a row, apologise briefly, say our team will call back, and use end_call.`;

// Controller-mode edges: one per allowed node-to-node transition (LEAD_QUALIFICATION has no
// node and is passed through), each an expression on the backend-owned flow variable.
export function controllerEdges() {
  const ids = Object.keys(NODE_STATES);
  const edges = [];
  for (const s of ids) {
    for (const t of ids) {
      if (s === t || ['close', 'dnc'].includes(s)) continue;
      const from = NODE_STATES[s];
      const to = NODE_STATES[t];
      const direct = isAllowedTransition(from, to);
      const viaQualification = isAllowedTransition(from, 'LEAD_QUALIFICATION') && isAllowedTransition('LEAD_QUALIFICATION', to);
      if (direct || viaQualification) edges.push({ id: `${s}_to_${t}`, source: s, target: t, from, to });
    }
  }
  return edges;
}

const flowIs = (node) => ({
  type: 'expression',
  expression: { type: 'eq_operator', left: { type: 'dynamic_variable', name: FLOW_VARIABLE }, right: { type: 'string_literal', value: node } },
});

export function buildWorkflow({ objectionKbLocator, mode = 'llm', flowToolId } = {}) {
  if (!['llm', 'controller'].includes(mode)) throw new Error(`unknown workflow mode ${mode}`);
  if (mode === 'controller' && !flowToolId) throw new Error('controller mode needs the sales_flow_step tool id');
  const nodes = {
    start_node: { type: 'start', position: { x: 0, y: 0 }, edge_order: [] },
  };
  const ids = Object.keys(NODE_STATES);
  ids.forEach((id, i) => {
    const live = LIVE_NODES.includes(id);
    nodes[id] = {
      type: 'override_agent',
      label: NODE_LABELS[id],
      additional_prompt: NODE_PROMPTS[id] + (mode === 'controller' && live ? CONTROLLER_RULES(id) : ''),
      additional_knowledge_base: id === 'objection' && objectionKbLocator ? [objectionKbLocator] : [],
      additional_tool_ids: mode === 'controller' && live ? [flowToolId] : [],
      conversation_config: {},
      entry_behavior: ENTRY[id] ?? 'auto',
      position: { x: 300 * (i + 1), y: id === 'dnc' ? 400 : id === 'objection' ? 200 : 0 },
      edge_order: [],
    };
  });

  const edges = {};
  const add = (id, source, target, edge) => {
    edges[id] = { source, target, ...edge };
    // Do-not-call edges are evaluated first from every node.
    if (target === 'dnc') nodes[source].edge_order.unshift(id);
    else nodes[source].edge_order.push(id);
  };
  if (mode === 'controller') {
    add('start_to_permission', 'start_node', 'permission', { forward_condition: { type: 'unconditional' } });
    for (const e of controllerEdges()) add(e.id, e.source, e.target, { forward_condition: { ...flowIs(e.target), label: e.id } });
  } else {
    for (const [id, source, target, forward, backward] of EDGE_SPECS) {
      add(id, source, target, {
        forward_condition: forward ? { type: 'llm', condition: forward, label: id } : { type: 'unconditional' },
        ...(backward ? { backward_condition: { type: 'llm', condition: backward, label: `${id}_return` } } : {}),
      });
    }
  }
  return { nodes, edges, prevent_subagent_loops: false };
}

// ElevenLabs webhook tool definition for the controller (create it once, then pass its id
// to buildWorkflow). The shared secret is referenced from the ElevenLabs secret store.
export function buildFlowTool({ url, secretId, playbook }) {
  const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
  return {
    tool_config: {
      type: 'webhook',
      name: FLOW_TOOL_NAME,
      description: 'Reports the prospect\'s latest stage-relevant reply to the sales flow controller, which decides the next stage. Call it before answering whenever the reply changes the situation.',
      response_timeout_secs: 8,
      pre_tool_speech: 'off',
      tool_error_handling_mode: 'summarized',
      api_schema: {
        url,
        method: 'POST',
        request_headers: { 'x-sales-flow-secret': { secret_id: secretId } },
        request_body_schema: {
          type: 'object',
          required: ['conversation_id', 'intent'],
          properties: {
            conversation_id: { type: 'string', dynamic_variable: 'system__conversation_id' },
            intent: str('The single intent that best matches the prospect\'s latest reply.', { enum: IN_CALL_INTENTS }),
            objection_ids: str(`For objection_raised / question_asked: comma-separated registry ids, e.g. "asks_for_pricing,already_uses_crm". Valid ids: ${playbook.objections.map((o) => o.id).join(', ')}.`),
            escalate: { type: 'boolean', description: 'True only if the concern needs the human team (pricing, legal, technical specifics) per the registry.' },
            field: str('For discovery_answer: which fact the prospect just gave.', { enum: DISCOVERY_FIELDS }),
            value: str('For discovery_answer: the fact in a few words, as stated. Empty if they did not really answer.'),
            early_presentation: { type: 'boolean', description: 'For discovery_complete: true only if the prospect explicitly asked what the product is.' },
            next_step: str('For next_step_agreed: the step the prospect explicitly agreed to.', { enum: playbook.next_steps.permitted.filter((x) => x !== 'none') }),
            callback_time: str('For follow_up_captured: day/time window in the prospect\'s words.'),
            channel: str('For follow_up_captured: preferred contact method.', { enum: ['phone', 'email', 'whatsapp'] }),
          },
        },
      },
      assignments: [{ dynamic_variable: FLOW_VARIABLE, value_path: 'next_node', source: 'response' }],
    },
  };
}

export function workflowEdges() {
  return EDGE_SPECS.filter(([, s]) => s !== 'start_node').map(([id, s, t]) => ({ id, from: NODE_STATES[s], to: NODE_STATES[t] }));
}

// States the call passes through implicitly (no in-call node of their own).
const IMPLICIT_BEFORE = ['PRE_CALL_CHECK', 'CALL_INITIATED', 'IDENTITY_DISCLOSURE'];

/**
 * Converts the ordered workflow-node ids seen in a transcript into a state path,
 * inserting implicit states (pre-call, disclosure by first message, post-call
 * qualification, completion) so it can be validated against the transition map.
 */
export function pathFromWorkflowNodes(nodeIds) {
  const path = [...IMPLICIT_BEFORE];
  for (const id of nodeIds) {
    const state = NODE_STATES[id];
    if (!state) continue;
    const prev = path[path.length - 1];
    if (state === prev) continue;
    // Leaving the presentation normally passes through post-call qualification (no node of its own).
    const viaQualification = isAllowedTransition(prev, 'LEAD_QUALIFICATION') && isAllowedTransition('LEAD_QUALIFICATION', state);
    if (viaQualification && (prev === 'SOLUTION_PRESENTATION' || !isAllowedTransition(prev, state))) {
      path.push('LEAD_QUALIFICATION');
    }
    path.push(state);
  }
  const last = path[path.length - 1];
  if (last === 'CALL_SUMMARY') path.push('CALL_COMPLETED');
  return path.filter((s) => STATES.includes(s));
}
