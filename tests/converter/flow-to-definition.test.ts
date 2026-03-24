import { describe, it, expect } from 'vitest';
import { flowToDefinition } from '../../src/converter/flow-to-definition';
import type { FlowNode, FlowEdge } from '../../src/converter/types';

function makeNode(id: string, type: string, handler: string, config: Record<string, unknown> = {}): FlowNode {
    return {
        id,
        type: type as FlowNode['type'],
        position: { x: 0, y: 0 },
        data: {
            stepName: id,
            type,
            handler,
            label: handler,
            description: '',
            parameters: [],
            config,
        },
    };
}

describe('flowToDefinition', () => {
    it('strips synthetic start and end nodes', () => {
        const nodes: FlowNode[] = [
            makeNode('__start__', 'start', ''),
            makeNode('step1', 'action', 'send_email'),
            makeNode('__end__', 'end', ''),
        ];
        const edges: FlowEdge[] = [
            { id: 'e1', source: '__start__', target: 'step1' },
            { id: 'e2', source: 'step1', target: '__end__' },
        ];

        const def = flowToDefinition(nodes, edges);

        expect(Object.keys(def.steps)).toEqual(['step1']);
        expect(def.steps['step1']).not.toHaveProperty('__start__');
    });

    it('identifies initial_step from start node edge', () => {
        const nodes: FlowNode[] = [
            makeNode('__start__', 'start', ''),
            makeNode('first', 'action', 'send_email'),
            makeNode('__end__', 'end', ''),
        ];
        const edges: FlowEdge[] = [
            { id: 'e1', source: '__start__', target: 'first' },
            { id: 'e2', source: 'first', target: '__end__' },
        ];

        const def = flowToDefinition(nodes, edges);
        expect(def.initial_step).toBe('first');
    });

    it('preserves step config', () => {
        const nodes: FlowNode[] = [
            makeNode('__start__', 'start', ''),
            makeNode('send', 'action', 'send_email', { to: 'test@test.com', subject: 'Hello' }),
            makeNode('__end__', 'end', ''),
        ];
        const edges: FlowEdge[] = [
            { id: 'e1', source: '__start__', target: 'send' },
            { id: 'e2', source: 'send', target: '__end__' },
        ];

        const def = flowToDefinition(nodes, edges);

        expect(def.steps['send']).toEqual({
            type: 'action',
            handler: 'send_email',
            to: 'test@test.com',
            subject: 'Hello',
        });
    });

    it('maps end node edges to "completed" transition', () => {
        const nodes: FlowNode[] = [
            makeNode('__start__', 'start', ''),
            makeNode('step1', 'action', 'send_email'),
            makeNode('__end__', 'end', ''),
        ];
        const edges: FlowEdge[] = [
            { id: 'e1', source: '__start__', target: 'step1' },
            { id: 'e2', source: 'step1', target: '__end__' },
        ];

        const def = flowToDefinition(nodes, edges);
        expect(def.transitions['step1']).toBe('completed');
    });

    it('preserves conditional transitions as true/false map', () => {
        const nodes: FlowNode[] = [
            makeNode('__start__', 'start', ''),
            makeNode('check', 'conditional', 'check_amount'),
            makeNode('high', 'action', 'send_email'),
            makeNode('low', 'action', 'send_email'),
            makeNode('__end__', 'end', ''),
        ];
        const edges: FlowEdge[] = [
            { id: 'e1', source: '__start__', target: 'check' },
            { id: 'e2', source: 'check', target: 'high', sourceHandle: 'true', data: { condition: 'true' } },
            { id: 'e3', source: 'check', target: 'low', sourceHandle: 'false', data: { condition: 'false' } },
            { id: 'e4', source: 'high', target: '__end__' },
            { id: 'e5', source: 'low', target: '__end__' },
        ];

        const def = flowToDefinition(nodes, edges);

        expect(def.transitions['check']).toEqual({ true: 'high', false: 'low' });
        expect(def.transitions['high']).toBe('completed');
        expect(def.transitions['low']).toBe('completed');
    });

    it('handles step-to-step transitions', () => {
        const nodes: FlowNode[] = [
            makeNode('__start__', 'start', ''),
            makeNode('a', 'action', 'send_email'),
            makeNode('b', 'action', 'send_email'),
            makeNode('__end__', 'end', ''),
        ];
        const edges: FlowEdge[] = [
            { id: 'e1', source: '__start__', target: 'a' },
            { id: 'e2', source: 'a', target: 'b' },
            { id: 'e3', source: 'b', target: '__end__' },
        ];

        const def = flowToDefinition(nodes, edges);

        expect(def.transitions['a']).toBe('b');
        expect(def.transitions['b']).toBe('completed');
    });
});
