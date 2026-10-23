import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  InvalidTransitionError,
  STATES,
  STATE_SPECS,
  applyEvent,
  createContext,
  isAllowedTransition,
  nextStatesOf,
  prioritizeObjections,
  validatePath,
} from '../src/domain/state-machine.js';
import { NODE_STATES, STATE_NODES, buildFlowTool, buildWorkflow, controllerEdges, pathFromWorkflowNodes, workflowEdges } from '../src/elevenlabs/workflow.js';
import { PLAYBOOK } from './helpers.js';

// Each step: [event, Egyptian Arabic utterance that maps to it (documentation only)].
// The LLM's job is utterance -> event; the controller's job is event -> next state.
const fresh = () => createContext({ conversationId: 'c1', playbook: PLAYBOOK, consentStatus: 'existing_enquiry' });
function run(steps, ctx = fresh()) {
  for (const [event] of steps) ctx = applyEvent(ctx, event);
  return ctx;
}

const OPENING = [
  [{ type: 'eligibility_passed' }, '(backend)'],
  [{ type: 'call_connected' }, '(telephony)'],
  [{ type: 'disclosure_done' }, 'أهلاً، أنا سارة، مساعدة مبيعات بالذكاء الاصطناعي…'],
];
const PERMISSION_OK = [{ type: 'permission_granted' }, 'أيوه اتفضلي، معايا دقيقتين'];
const DISCOVERY_DONE = [
  [{ type: 'discovery_answer', field: 'current_lead_process', value: 'manual calls from a sheet' }, 'الفريق بيكلم الليدز بإيده من شيت'],
  [{ type: 'discovery_answer', field: 'primary_challenge', value: 'cannot reach all leads fast' }, 'المشكلة إننا مش بنلحق نكلم كل الناس بسرعة'],
];
const TO_NEXT_STEP = [...OPENING, PERMISSION_OK, ...DISCOVERY_DONE, [{ type: 'presentation_done' }, 'ده ممكن يفرق معانا فعلاً'], [{ type: 'qualification_recorded' }, '(backend)']];

describe('conversation scenarios (outcome + state sequence)', () => {
  test('1. qualified prospect requests a demo', () => {
    const ctx = run([
      ...TO_NEXT_STEP,
      [{ type: 'next_step_agreed', step: 'demo_requested' }, 'ياريت نعمل ديمو'],
      [{ type: 'follow_up_captured', time: 'Thursday afternoon', channel: 'phone' }, 'الخميس بعد الضهر، على التليفون'],
      [{ type: 'outcome_saved' }, '(backend)'],
    ]);
    assert.deepEqual(ctx.history, [
      'PRE_CALL_CHECK', 'CALL_INITIATED', 'IDENTITY_DISCLOSURE', 'PERMISSION_CHECK', 'DISCOVERY',
      'SOLUTION_PRESENTATION', 'LEAD_QUALIFICATION', 'NEXT_STEP_SELECTION', 'FOLLOW_UP_CAPTURE', 'CALL_SUMMARY', 'CALL_COMPLETED',
    ]);
    assert.equal(ctx.preferredNextStep, 'demo_requested');
    assert.equal(ctx.data.preferred_callback_time, 'Thursday afternoon');
  });

  test('2. asks for pricing that is not configured -> registry escalates to next step', () => {
    const ctx = run([
      ...OPENING, PERMISSION_OK, ...DISCOVERY_DONE,
      [{ type: 'objection_raised', objectionId: 'asks_for_pricing' }, 'طيب ده بكام؟'],
      [{ type: 'objection_resolved' }, 'ماشي، يبقى الفريق يقولي'],
    ]);
    // escalate_when=always in the registry: no return to the pitch, no price invented.
    assert.deepEqual(ctx.history.slice(-3), ['SOLUTION_PRESENTATION', 'OBJECTION_HANDLING', 'NEXT_STEP_SELECTION']);
    assert.equal(ctx.escalated, true);
    assert.deepEqual(ctx.objections, ['asks_for_pricing']);
  });

  test('3. already has a sales team and a CRM (raised together) -> one at a time, then back to the pitch', () => {
    let ctx = run([
      ...OPENING, PERMISSION_OK, ...DISCOVERY_DONE,
      [{ type: 'objection_raised', objectionIds: ['already_uses_crm', 'already_has_sales_team'] }, 'إحنا عندنا فريق مبيعات كبير وكمان CRM'],
    ]);
    // Registry priority decides the order, not the order the prospect said them in.
    assert.equal(ctx.activeObjection, 'already_has_sales_team');
    assert.deepEqual(ctx.pendingObjections, ['already_uses_crm']);
    ctx = applyEvent(ctx, { type: 'objection_resolved' });
    assert.equal(ctx.currentState, 'OBJECTION_HANDLING');
    assert.equal(ctx.activeObjection, 'already_uses_crm');
    ctx = applyEvent(ctx, { type: 'objection_resolved' }); // "ماشي، فهمت"
    assert.equal(ctx.currentState, 'SOLUTION_PRESENTATION');
    assert.deepEqual(ctx.objections, ['already_has_sales_team', 'already_uses_crm']);
    assert.equal(ctx.returnState, null);
  });

  test('4. interrupts discovery with a relevant question -> answers, returns to discovery', () => {
    const ctx = run([
      ...OPENING, PERMISSION_OK,
      DISCOVERY_DONE[0],
      [{ type: 'question_asked', objectionId: 'how_does_it_know_inventory' }, 'استني، هو هيعرف مشاريعنا إزاي؟'],
      [{ type: 'objection_resolved' }, 'آه تمام'],
    ]);
    assert.equal(ctx.currentState, 'DISCOVERY');
    assert.equal(ctx.data.current_lead_process, 'manual calls from a sheet');
    const done = applyEvent(ctx, DISCOVERY_DONE[1][0]);
    assert.equal(done.currentState, 'SOLUTION_PRESENTATION');
  });

  test('5. changes mind midway -> decline is respected, no next step', () => {
    const ctx = run([
      ...TO_NEXT_STEP,
      [{ type: 'no_next_step' }, 'لا بصراحة، مش دلوقتي، مش مهتم'],
      [{ type: 'outcome_saved' }, '(backend)'],
    ]);
    assert.equal(ctx.currentState, 'CALL_COMPLETED');
    assert.ok(!ctx.history.includes('FOLLOW_UP_CAPTURE'));
    // After a decline the flow cannot be pushed back into selling.
    assert.throws(() => applyEvent(ctx, { type: 'next_step_agreed', step: 'demo_requested' }), InvalidTransitionError);
  });

  test('6. declines immediately -> summary and completion, nothing else', () => {
    const ctx = run([...OPENING, [{ type: 'permission_declined' }, 'لا شكراً، مش مهتم'], [{ type: 'outcome_saved' }, '']]);
    assert.deepEqual(ctx.history.slice(-3), ['PERMISSION_CHECK', 'CALL_SUMMARY', 'CALL_COMPLETED']);
    assert.equal(ctx.declined, true);
  });

  test('7. do-not-call is honoured from every live state and is terminal', () => {
    const prefixes = {
      PERMISSION_CHECK: [...OPENING],
      DISCOVERY: [...OPENING, PERMISSION_OK],
      SOLUTION_PRESENTATION: [...OPENING, PERMISSION_OK, ...DISCOVERY_DONE],
      OBJECTION_HANDLING: [...OPENING, PERMISSION_OK, ...DISCOVERY_DONE, [{ type: 'objection_raised', objectionId: 'privacy_concern' }, '']],
      NEXT_STEP_SELECTION: TO_NEXT_STEP,
      FOLLOW_UP_CAPTURE: [...OPENING, [{ type: 'callback_requested' }, '']],
    };
    for (const [state, prefix] of Object.entries(prefixes)) {
      const before = run(prefix);
      assert.equal(before.currentState, state);
      const after = applyEvent(before, { type: 'dnc_requested' }); // "متتصلوش بيا تاني لو سمحتي"
      assert.equal(after.currentState, 'DO_NOT_CALL', `from ${state}`);
      assert.equal(after.doNotCall, true);
      assert.equal(after.callOutcome, 'do_not_call');
      for (const type of ['permission_granted', 'outcome_saved', 'disconnected', 'clarification_needed']) {
        assert.throws(() => applyEvent(after, { type }), InvalidTransitionError);
      }
      assert.throws(() => applyEvent(after, { type: 'next_step_agreed', step: 'demo_requested' }), InvalidTransitionError);
    }
  });

  test('8. asks to speak with a human -> follow-up capture, pitch stops', () => {
    const direct = run([...OPENING, PERMISSION_OK, [{ type: 'human_requested' }, 'أنا عايز أكلم حد من الفريق مش AI']]);
    assert.equal(direct.currentState, 'FOLLOW_UP_CAPTURE');
    assert.equal(direct.preferredNextStep, 'human_callback_requested');
    assert.throws(() => applyEvent(direct, { type: 'presentation_done' }), InvalidTransitionError);
    // Same request recognised as a registry objection during the pitch.
    const viaRegistry = run([...OPENING, PERMISSION_OK, ...DISCOVERY_DONE, [{ type: 'objection_raised', objectionId: 'requests_human' }, 'ممكن حد بني آدم يكلمني؟'], [{ type: 'objection_resolved' }, '']]);
    assert.equal(viaRegistry.currentState, 'FOLLOW_UP_CAPTURE');
    assert.equal(viaRegistry.humanRequested, true);
  });

  test('9. incomplete or unclear information -> no skipping, unknown stays unknown, clarification limit', () => {
    let ctx = run([...OPENING, PERMISSION_OK, [{ type: 'discovery_answer', field: 'primary_challenge', value: null }, 'مش عارف والله']]);
    assert.equal(ctx.currentState, 'DISCOVERY');
    assert.equal('primary_challenge' in ctx.data, false, 'a non-answer is not stored as a value');
    assert.throws(() => applyEvent(ctx, { type: 'discovery_complete' }), /missing current_lead_process, primary_challenge/);
    // Explicit early-presentation rule (prospect asked "what is it?") is allowed.
    assert.equal(applyEvent(ctx, { type: 'discovery_complete', earlyPresentation: true }).currentState, 'SOLUTION_PRESENTATION');
    // Repeated unclear answers: targeted clarifications up to the limit, then the documented fallback.
    for (let i = 0; i < PLAYBOOK.limits.max_clarification_attempts; i++) {
      ctx = applyEvent(ctx, { type: 'clarification_needed' }); // "يعني إيه؟ مش فاهم"
      assert.equal(ctx.currentState, 'DISCOVERY');
    }
    ctx = applyEvent(ctx, { type: 'clarification_needed' });
    assert.equal(ctx.currentState, 'NEXT_STEP_SELECTION');
    assert.equal(ctx.escalated, true);
  });

  test('10. requests a meeting with no booking integration -> follow-up capture only, never booked', () => {
    assert.equal(PLAYBOOK.next_steps.booking_integration_available, false);
    const ctx = run([...TO_NEXT_STEP, [{ type: 'next_step_agreed', step: 'meeting_requested' }, 'احجزيلي ميعاد مع المدير بتاعكم']]);
    assert.equal(ctx.currentState, 'FOLLOW_UP_CAPTURE');
    assert.equal(ctx.preferredNextStep, 'meeting_requested');
    // There is no "booking confirmed" event in the machine at all.
    assert.throws(() => applyEvent(ctx, { type: 'meeting_booked' }), InvalidTransitionError);
    assert.throws(() => run([...TO_NEXT_STEP, [{ type: 'next_step_agreed', step: 'calendar_invite_sent' }, '']]), /not permitted/);
  });

  test('11. tool failure while recording the outcome -> retried, then completed with the failure recorded', () => {
    let ctx = run([...OPENING, [{ type: 'permission_declined' }, '']]);
    for (let i = 0; i < PLAYBOOK.limits.max_tool_retries; i++) {
      ctx = applyEvent(ctx, { type: 'outcome_save_failed' });
      assert.equal(ctx.currentState, 'CALL_SUMMARY', 'retry in place');
      assert.equal(ctx.saveFailed, false);
    }
    const saved = applyEvent(ctx, { type: 'outcome_saved' });
    assert.equal(saved.currentState, 'CALL_COMPLETED');
    const failed = applyEvent(ctx, { type: 'outcome_save_failed' });
    assert.equal(failed.currentState, 'CALL_COMPLETED');
    assert.equal(failed.saveFailed, true, 'never reported as saved');
  });

  test('12. disconnection goes to summary from any live state (retry dedupe: see app.test.js)', () => {
    const ctx = run([...OPENING, PERMISSION_OK, ...DISCOVERY_DONE, [{ type: 'disconnected' }, '(line dropped)']]);
    assert.deepEqual(ctx.history.slice(-2), ['SOLUTION_PRESENTATION', 'CALL_SUMMARY']);
    assert.equal(ctx.callOutcome, 'disconnected');
  });
});

describe('technical branches and safety limits', () => {
  test('voicemail, no answer and failure skip the sales conversation', () => {
    for (const [type, outcome] of [['voicemail_detected', 'voicemail'], ['call_unanswered', 'unanswered'], ['call_failed', 'failed']]) {
      const ctx = run([[{ type: 'eligibility_passed' }], [{ type }]]);
      assert.deepEqual(ctx.history, ['PRE_CALL_CHECK', 'CALL_INITIATED', 'CALL_SUMMARY']);
      assert.equal(ctx.callOutcome, outcome);
    }
  });

  test('ineligible lead never reaches a call; consent is never inferred', () => {
    assert.deepEqual(run([[{ type: 'eligibility_failed' }]]).history, ['PRE_CALL_CHECK', 'CALL_COMPLETED']);
    for (const consentStatus of ['unknown', 'none', 'withdrawn', 'purchased_list']) {
      const ctx = createContext({ conversationId: 'c', playbook: PLAYBOOK, consentStatus });
      assert.throws(() => applyEvent(ctx, { type: 'eligibility_passed' }), /consent status/);
    }
  });

  test('same objection beyond the limit escalates instead of re-pitching', () => {
    let ctx = run([...OPENING, PERMISSION_OK, ...DISCOVERY_DONE]);
    ctx = applyEvent(ctx, { type: 'objection_raised', objectionId: 'prefers_real_people' });
    ctx = applyEvent(ctx, { type: 'objection_raised', objectionId: 'prefers_real_people' });
    assert.equal(ctx.currentState, 'OBJECTION_HANDLING');
    ctx = applyEvent(ctx, { type: 'objection_raised', objectionId: 'prefers_real_people' });
    assert.equal(ctx.currentState, 'NEXT_STEP_SELECTION');
    assert.equal(ctx.escalated, true);
  });

  test('conditional escalation from the registry (e.g. legal question) goes to a next step', () => {
    const ctx = run([...OPENING, PERMISSION_OK, ...DISCOVERY_DONE,
      [{ type: 'objection_raised', objectionId: 'privacy_concern', escalate: true }, 'البيانات بتتخزن فين؟ في مصر؟'],
      [{ type: 'objection_resolved' }, '']]);
    assert.equal(ctx.currentState, 'NEXT_STEP_SELECTION');
    // ...but a later, unrelated objection returns normally (escalation is per block).
    const later = run([[{ type: 'objection_raised', objectionId: 'prefers_real_people' }, ''], [{ type: 'objection_resolved' }, '']], ctx);
    assert.equal(later.currentState, 'NEXT_STEP_SELECTION');
    assert.deepEqual(later.history.slice(-2), ['OBJECTION_HANDLING', 'NEXT_STEP_SELECTION']);
  });

  test('state re-entry loop guard falls back to offering a human, not an endless loop', () => {
    let ctx = run([...OPENING, PERMISSION_OK, DISCOVERY_DONE[0]]);
    for (const id of ['measuring_performance', 'how_does_it_know_inventory', 'prefers_real_people']) {
      ctx = applyEvent(ctx, { type: 'question_asked', objectionId: id });
      ctx = applyEvent(ctx, { type: 'objection_resolved' });
    }
    assert.equal(ctx.currentState, 'DISCOVERY');
    ctx = applyEvent(ctx, { type: 'question_asked', objectionId: 'fits_existing_workflow' });
    assert.equal(ctx.entryCounts.OBJECTION_HANDLING, 4);
    ctx = applyEvent(ctx, { type: 'objection_resolved' });
    assert.equal(ctx.currentState, 'NEXT_STEP_SELECTION');
    assert.equal(ctx.escalated, true);
  });

  test('time-in-state limit: too many turns without progress triggers the fallback', () => {
    // A prospect who keeps asking new questions without ever moving on.
    const ids = PLAYBOOK.objections.map((o) => o.id);
    let ctx = run([...OPENING, PERMISSION_OK, ...DISCOVERY_DONE, [{ type: 'question_asked', objectionId: ids[0] }, '']]);
    for (let i = 1; i <= PLAYBOOK.limits.max_turns_per_state; i++) {
      ctx = applyEvent(ctx, { type: 'question_asked', objectionId: ids[i] });
      assert.equal(ctx.currentState, 'OBJECTION_HANDLING', `turn ${i}`);
    }
    ctx = applyEvent(ctx, { type: 'question_asked', objectionId: ids[PLAYBOOK.limits.max_turns_per_state + 1] });
    assert.equal(ctx.currentState, 'NEXT_STEP_SELECTION', 'documented fallback: offer a human follow-up');
    assert.equal(ctx.escalated, true);
  });

  test('discovery cannot exceed the question limit', () => {
    let ctx = run([...OPENING, PERMISSION_OK]);
    for (let i = 0; i < PLAYBOOK.limits.max_discovery_questions; i++) ctx = applyEvent(ctx, { type: 'discovery_answer', field: 'current_crm', value: null });
    assert.equal(ctx.currentState, 'SOLUTION_PRESENTATION');
  });

  test('unknown events are rejected', () => {
    assert.throws(() => run([...OPENING, [{ type: 'book_meeting_now' }]]), InvalidTransitionError);
    assert.throws(() => run([[{ type: 'permission_granted' }]]), InvalidTransitionError);
  });

  test('objection priority comes from the registry', () => {
    const rules = fresh().objectionRules;
    assert.deepEqual(prioritizeObjections(['send_information', 'asks_for_pricing', 'requests_human'], rules), ['requests_human', 'asks_for_pricing', 'send_information']);
  });

  test('every state has a complete specification and derived next states', () => {
    for (const state of STATES) {
      const spec = STATE_SPECS[state];
      for (const key of ['entry', 'objective', 'requiredInputs', 'allowedIntents', 'requiredActions', 'success', 'alternatives', 'errorHandling', 'runsIn']) {
        assert.ok(spec[key] !== undefined, `${state}.${key}`);
      }
      if (['CALL_COMPLETED', 'DO_NOT_CALL'].includes(state)) assert.deepEqual(nextStatesOf(state), []);
      else assert.ok(nextStatesOf(state).length > 0, state);
    }
  });
});

describe('ElevenLabs workflow mirrors the transition map', () => {
  test('LLM mode: every edge is an allowed transition (directly or via post-call qualification)', () => {
    for (const { id, from, to } of workflowEdges()) {
      const ok = isAllowedTransition(from, to) || (isAllowedTransition(from, 'LEAD_QUALIFICATION') && isAllowedTransition('LEAD_QUALIFICATION', to));
      assert.ok(ok, `edge ${id}: ${from} -> ${to} is not in the transition map`);
    }
  });

  test('controller mode: edges are exactly the node-to-node transitions, all data-driven', () => {
    const wf = buildWorkflow({ mode: 'controller', flowToolId: 'tool_x' });
    const derived = controllerEdges();
    assert.equal(Object.keys(wf.edges).length, derived.length + 1);
    for (const e of derived) {
      const edge = wf.edges[e.id];
      assert.equal(edge.forward_condition.type, 'expression', e.id);
      assert.deepEqual(edge.forward_condition.expression.right, { type: 'string_literal', value: e.target });
      assert.equal(edge.forward_condition.expression.left.name, 'flow_next_node');
    }
    // Every node the controller can return is reachable from every state that can lead to it.
    for (const node of ['permission', 'discovery', 'presentation', 'objection', 'next_step', 'follow_up']) {
      assert.deepEqual(wf.nodes[node].additional_tool_ids, ['tool_x']);
      assert.ok(wf.nodes[node].additional_prompt.includes('sales_flow_step'));
    }
    assert.ok(wf.edges.objection_to_discovery && wf.edges.next_step_to_objection, 'interruption returns exist');
    assert.throws(() => buildWorkflow({ mode: 'controller' }), /tool id/);
  });

  test('every live node has a do-not-call edge evaluated first, in both modes', () => {
    for (const wf of [buildWorkflow(), buildWorkflow({ mode: 'controller', flowToolId: 't' })]) {
      for (const id of ['permission', 'discovery', 'presentation', 'objection', 'next_step', 'follow_up']) {
        assert.equal(wf.nodes[id].edge_order[0], `${id}_to_dnc`);
      }
      assert.equal(wf.nodes.dnc.edge_order.length, 0, 'do-not-call is terminal');
      assert.equal(wf.nodes.close.edge_order.length, 0, 'close is terminal');
    }
  });

  test('every node maps to a state, has instructions, and hides internal names', () => {
    const wf = buildWorkflow();
    for (const id of Object.keys(NODE_STATES)) {
      assert.equal(wf.nodes[id].type, 'override_agent');
      assert.ok(wf.nodes[id].additional_prompt.includes('never say stage names'));
    }
    for (const state of Object.values(NODE_STATES)) assert.ok(STATE_NODES[state], state);
  });

  test('flow tool definition matches the controller contract', () => {
    const tool = buildFlowTool({ url: 'https://example.test/tools/sales-flow', secretId: 'sec_1', playbook: PLAYBOOK }).tool_config;
    assert.equal(tool.type, 'webhook');
    assert.deepEqual(tool.assignments, [{ dynamic_variable: 'flow_next_node', value_path: 'next_node', source: 'response' }]);
    assert.equal(tool.api_schema.request_body_schema.properties.conversation_id.dynamic_variable, 'system__conversation_id');
    assert.deepEqual(tool.api_schema.request_headers['x-sales-flow-secret'], { secret_id: 'sec_1' });
  });

  test('a real node trace converts to a valid state path', () => {
    const path = pathFromWorkflowNodes(['permission', 'discovery', 'presentation', 'objection', 'presentation', 'next_step', 'follow_up', 'close']);
    assert.deepEqual(path, [
      'PRE_CALL_CHECK', 'CALL_INITIATED', 'IDENTITY_DISCLOSURE', 'PERMISSION_CHECK', 'DISCOVERY', 'SOLUTION_PRESENTATION',
      'OBJECTION_HANDLING', 'SOLUTION_PRESENTATION', 'LEAD_QUALIFICATION', 'NEXT_STEP_SELECTION', 'FOLLOW_UP_CAPTURE', 'CALL_SUMMARY', 'CALL_COMPLETED',
    ]);
    assert.equal(validatePath(path).valid, true);
  });

  test('an illegal jump is detected', () => {
    const result = validatePath(['PERMISSION_CHECK', 'FOLLOW_UP_CAPTURE', 'SOLUTION_PRESENTATION']);
    assert.equal(result.valid, false);
    assert.deepEqual(result.violations[0], { from: 'FOLLOW_UP_CAPTURE', to: 'SOLUTION_PRESENTATION', index: 2 });
  });
});
