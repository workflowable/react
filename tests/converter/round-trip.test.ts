import { describe, it, expect } from 'vitest';
import { definitionToFlow } from '../../src/converter/definition-to-flow';
import { flowToDefinition } from '../../src/converter/flow-to-definition';
import type { WorkflowDefinition } from '../../src/types/definition';
import type { WorkflowHandler } from '../../src/types/workflow-event';

const handlers: Record<string, WorkflowHandler> = {
    send_email: { name: 'send_email', description: 'Send email', parameters: [] },
    check_amount: { name: 'check_amount', description: 'Check amount', parameters: [] },
    wait_5m: { name: 'wait_5m', description: 'Wait', parameters: [] },
    manager_approval: { name: 'manager_approval', description: 'Approval', parameters: [] },
    incoming_webhook: { name: 'incoming_webhook', description: 'Webhook', parameters: [] },
};

function roundTrip(def: WorkflowDefinition): WorkflowDefinition {
    const { nodes, edges } = definitionToFlow(def, handlers);
    return flowToDefinition(nodes, edges);
}

describe('round-trip fidelity', () => {
    it('preserves a single action step', () => {
        const def: WorkflowDefinition = {
            initial_step: 'send',
            steps: {
                send: { type: 'action', handler: 'send_email', to: 'admin@test.com' },
            },
            transitions: {
                send: 'completed',
            },
        };

        expect(roundTrip(def)).toEqual(def);
    });

    it('preserves conditional branching', () => {
        const def: WorkflowDefinition = {
            initial_step: 'check',
            steps: {
                check: { type: 'conditional', handler: 'check_amount', threshold: 100 },
                high: { type: 'action', handler: 'send_email' },
                low: { type: 'action', handler: 'send_email' },
            },
            transitions: {
                check: { true: 'high', false: 'low' },
                high: 'completed',
                low: 'completed',
            },
        };

        expect(roundTrip(def)).toEqual(def);
    });

    it('preserves a linear multi-step workflow', () => {
        const def: WorkflowDefinition = {
            initial_step: 'step1',
            steps: {
                step1: { type: 'action', handler: 'send_email' },
                step2: { type: 'wait', handler: 'wait_5m' },
                step3: { type: 'action', handler: 'send_email' },
            },
            transitions: {
                step1: 'step2',
                step2: 'step3',
                step3: 'completed',
            },
        };

        expect(roundTrip(def)).toEqual(def);
    });

    it('preserves conditional with one branch to completed', () => {
        const def: WorkflowDefinition = {
            initial_step: 'check',
            steps: {
                check: { type: 'conditional', handler: 'check_amount' },
                notify: { type: 'action', handler: 'send_email' },
            },
            transitions: {
                check: { true: 'notify', false: 'completed' },
                notify: 'completed',
            },
        };

        expect(roundTrip(def)).toEqual(def);
    });

    it('preserves custom step types with config', () => {
        const def: WorkflowDefinition = {
            initial_step: 'approve',
            steps: {
                approve: {
                    type: 'approval',
                    handler: 'manager_approval',
                    approver_role: 'finance_manager',
                    timeout_hours: 24,
                },
                hook: {
                    type: 'webhook',
                    handler: 'incoming_webhook',
                    webhook_url: 'https://example.com/hook',
                    secret: 'abc123',
                },
            },
            transitions: {
                approve: 'hook',
                hook: 'completed',
            },
        };

        expect(roundTrip(def)).toEqual(def);
    });
});
