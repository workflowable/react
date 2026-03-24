import { describe, it, expect } from 'vitest';
import { definitionToFlow } from '../../src/converter/definition-to-flow';
import type { WorkflowDefinition } from '../../src/types/definition';
import type { WorkflowHandler } from '../../src/types/workflow-event';

const handlers: Record<string, WorkflowHandler> = {
    send_email: {
        name: 'send_email',
        description: 'Send an email',
        parameters: [{ name: 'to', type: 'text', label: 'To', required: true }],
    },
    check_amount: {
        name: 'check_amount',
        description: 'Check order amount',
        parameters: [{ name: 'threshold', type: 'number', label: 'Threshold', required: true }],
    },
    wait_5m: {
        name: 'wait_5m',
        description: 'Wait 5 minutes',
        parameters: [],
    },
};

describe('definitionToFlow', () => {
    it('produces start and end nodes for an empty definition', () => {
        const def: WorkflowDefinition = {
            initial_step: '',
            steps: {},
            transitions: {},
        };

        const { nodes, edges } = definitionToFlow(def, {});

        expect(nodes).toHaveLength(2);
        expect(nodes.find((n) => n.id === '__start__')).toBeDefined();
        expect(nodes.find((n) => n.id === '__end__')).toBeDefined();
    });

    it('creates a node for a single action step', () => {
        const def: WorkflowDefinition = {
            initial_step: 'send',
            steps: {
                send: { type: 'action', handler: 'send_email', to: 'admin@test.com' },
            },
            transitions: {
                send: 'completed',
            },
        };

        const { nodes, edges } = definitionToFlow(def, handlers);

        const sendNode = nodes.find((n) => n.id === 'send');
        expect(sendNode).toBeDefined();
        expect(sendNode!.type).toBe('action');
        expect(sendNode!.data.handler).toBe('send_email');
        expect(sendNode!.data.label).toBe('send_email');
        expect(sendNode!.data.config).toEqual({ to: 'admin@test.com' });
    });

    it('creates an edge from start to initial step', () => {
        const def: WorkflowDefinition = {
            initial_step: 'send',
            steps: {
                send: { type: 'action', handler: 'send_email' },
            },
            transitions: {
                send: 'completed',
            },
        };

        const { edges } = definitionToFlow(def, handlers);

        const startEdge = edges.find((e) => e.source === '__start__');
        expect(startEdge).toBeDefined();
        expect(startEdge!.target).toBe('send');
    });

    it('maps "completed" transitions to the end node', () => {
        const def: WorkflowDefinition = {
            initial_step: 'send',
            steps: {
                send: { type: 'action', handler: 'send_email' },
            },
            transitions: {
                send: 'completed',
            },
        };

        const { edges } = definitionToFlow(def, handlers);

        const endEdge = edges.find((e) => e.target === '__end__');
        expect(endEdge).toBeDefined();
        expect(endEdge!.source).toBe('send');
    });

    it('creates two edges with source handles for conditional branching', () => {
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

        const { edges } = definitionToFlow(def, handlers);

        const trueEdge = edges.find((e) => e.source === 'check' && e.data?.condition === 'true');
        const falseEdge = edges.find((e) => e.source === 'check' && e.data?.condition === 'false');

        expect(trueEdge).toBeDefined();
        expect(trueEdge!.target).toBe('high');
        expect(trueEdge!.sourceHandle).toBe('true');

        expect(falseEdge).toBeDefined();
        expect(falseEdge!.target).toBe('low');
        expect(falseEdge!.sourceHandle).toBe('false');
    });

    it('handles a wait step', () => {
        const def: WorkflowDefinition = {
            initial_step: 'pause',
            steps: {
                pause: { type: 'wait', handler: 'wait_5m' },
            },
            transitions: {
                pause: 'completed',
            },
        };

        const { nodes } = definitionToFlow(def, handlers);

        const waitNode = nodes.find((n) => n.id === 'pause');
        expect(waitNode).toBeDefined();
        expect(waitNode!.type).toBe('wait');
    });

    it('handles a multi-step workflow', () => {
        const def: WorkflowDefinition = {
            initial_step: 'check',
            steps: {
                check: { type: 'conditional', handler: 'check_amount', threshold: 50 },
                notify: { type: 'action', handler: 'send_email' },
                pause: { type: 'wait', handler: 'wait_5m' },
                followup: { type: 'action', handler: 'send_email' },
            },
            transitions: {
                check: { true: 'notify', false: 'completed' },
                notify: 'pause',
                pause: 'followup',
                followup: 'completed',
            },
        };

        const { nodes, edges } = definitionToFlow(def, handlers);

        // 4 steps + start + end
        expect(nodes).toHaveLength(6);
        // start->check, check->notify, check->end, notify->pause, pause->followup, followup->end
        expect(edges).toHaveLength(6);
    });

    it('uses handler name as label when handler is unknown', () => {
        const def: WorkflowDefinition = {
            initial_step: 'step1',
            steps: {
                step1: { type: 'action', handler: 'unknown_handler' },
            },
            transitions: {
                step1: 'completed',
            },
        };

        const { nodes } = definitionToFlow(def, {});

        const node = nodes.find((n) => n.id === 'step1');
        expect(node!.data.label).toBe('unknown_handler');
        expect(node!.data.parameters).toEqual([]);
    });

    it('handles custom step types defined by the consuming application', () => {
        const customHandlers: Record<string, WorkflowHandler> = {
            manager_approval: {
                name: 'manager_approval',
                description: 'Requires manager sign-off',
                parameters: [
                    { name: 'approver_role', type: 'text', label: 'Approver Role', required: true },
                    { name: 'timeout_hours', type: 'number', label: 'Timeout (hours)', required: false, default: 48 },
                ],
            },
            incoming_webhook: {
                name: 'incoming_webhook',
                description: 'Wait for external webhook callback',
                parameters: [
                    { name: 'webhook_url', type: 'text', label: 'Webhook URL', required: true },
                    { name: 'secret', type: 'text', label: 'Signing Secret', required: true },
                ],
            },
        };

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
                approve: { true: 'hook', false: 'completed' },
                hook: 'completed',
            },
        };

        const { nodes, edges } = definitionToFlow(def, customHandlers);

        const approveNode = nodes.find((n) => n.id === 'approve');
        expect(approveNode).toBeDefined();
        expect(approveNode!.type).toBe('approval');
        expect(approveNode!.data.handler).toBe('manager_approval');
        expect(approveNode!.data.parameters).toHaveLength(2);
        expect(approveNode!.data.config).toEqual({
            approver_role: 'finance_manager',
            timeout_hours: 24,
        });

        const hookNode = nodes.find((n) => n.id === 'hook');
        expect(hookNode).toBeDefined();
        expect(hookNode!.type).toBe('webhook');
        expect(hookNode!.data.handler).toBe('incoming_webhook');
        expect(hookNode!.data.config).toEqual({
            webhook_url: 'https://example.com/hook',
            secret: 'abc123',
        });

        // Conditional edges still work on custom types
        const trueEdge = edges.find((e) => e.source === 'approve' && e.data?.condition === 'true');
        expect(trueEdge!.target).toBe('hook');
    });

    it('handles custom parameter types defined by the consuming application', () => {
        const customHandlers: Record<string, WorkflowHandler> = {
            styled_email: {
                name: 'styled_email',
                description: 'Send a styled email',
                parameters: [
                    { name: 'to', type: 'text', label: 'Recipient', required: true },
                    { name: 'body', type: 'rich_text', label: 'Email Body', required: true },
                    { name: 'brand_color', type: 'color_picker', label: 'Brand Color', required: false, default: '#000000' },
                    { name: 'template', type: 'template_selector', label: 'Template', required: true },
                ],
            },
        };

        const def: WorkflowDefinition = {
            initial_step: 'send',
            steps: {
                send: { type: 'action', handler: 'styled_email', to: 'user@test.com' },
            },
            transitions: {
                send: 'completed',
            },
        };

        const { nodes } = definitionToFlow(def, customHandlers);

        const sendNode = nodes.find((n) => n.id === 'send');
        expect(sendNode!.data.parameters).toHaveLength(4);
        expect(sendNode!.data.parameters.map((p) => p.type)).toEqual([
            'text',
            'rich_text',
            'color_picker',
            'template_selector',
        ]);
    });

    it('assigns positions to all nodes (no zero/zero stacking)', () => {
        const def: WorkflowDefinition = {
            initial_step: 'a',
            steps: {
                a: { type: 'action', handler: 'send_email' },
                b: { type: 'action', handler: 'send_email' },
            },
            transitions: {
                a: 'b',
                b: 'completed',
            },
        };

        const { nodes } = definitionToFlow(def, handlers);

        const positions = nodes.map((n) => n.position);
        const unique = new Set(positions.map((p) => `${p.x},${p.y}`));
        expect(unique.size).toBe(nodes.length);
    });
});
