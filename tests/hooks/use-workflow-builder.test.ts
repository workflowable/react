import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkflowBuilder } from '../../src/hooks/use-workflow-builder';
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
        description: 'Check amount',
        parameters: [],
    },
};

const simpleDef: WorkflowDefinition = {
    initial_step: 'send',
    steps: {
        send: { type: 'action', handler: 'send_email', to: 'admin@test.com' },
    },
    transitions: {
        send: 'completed',
    },
};

describe('useWorkflowBuilder', () => {
    it('initialises with start and end nodes when no definition given', () => {
        const { result } = renderHook(() => useWorkflowBuilder());

        expect(result.current.nodes).toHaveLength(2);
        expect(result.current.nodes.map((n) => n.id)).toEqual(['__start__', '__end__']);
        expect(result.current.edges).toEqual([]);
    });

    it('loads a definition into nodes and edges', () => {
        const { result } = renderHook(() =>
            useWorkflowBuilder({ definition: simpleDef, handlers }),
        );

        // __start__, send, __end__
        expect(result.current.nodes).toHaveLength(3);
        // __start__->send, send->__end__
        expect(result.current.edges).toHaveLength(2);
    });

    it('addStep creates a new node', () => {
        const { result } = renderHook(() => useWorkflowBuilder({ handlers }));

        act(() => {
            result.current.addStep('action', handlers.send_email, { x: 100, y: 200 });
        });

        // 2 sentinel nodes + 1 added step
        expect(result.current.nodes).toHaveLength(3);
        const node = result.current.nodes.find((n) => n.id !== '__start__' && n.id !== '__end__')!;
        expect(node.data.handler).toBe('send_email');
        expect(node.data.description).toBe('Send an email');
        expect(node.data.parameters).toHaveLength(1);
        expect(node.position).toEqual({ x: 100, y: 200 });
    });

    it('removeStep removes the node and connected edges', () => {
        const { result } = renderHook(() =>
            useWorkflowBuilder({ definition: simpleDef, handlers }),
        );

        const sendNode = result.current.nodes.find((n) => n.id === 'send')!;
        expect(sendNode).toBeDefined();

        act(() => {
            result.current.removeStep('send');
        });

        expect(result.current.nodes.find((n) => n.id === 'send')).toBeUndefined();
        // Edges referencing 'send' should be gone
        const sendEdges = result.current.edges.filter(
            (e) => e.source === 'send' || e.target === 'send',
        );
        expect(sendEdges).toHaveLength(0);
    });

    it('updateStepConfig updates node data config', () => {
        const { result } = renderHook(() =>
            useWorkflowBuilder({ definition: simpleDef, handlers }),
        );

        act(() => {
            result.current.updateStepConfig('send', { to: 'new@test.com', subject: 'Hello' });
        });

        const sendNode = result.current.nodes.find((n) => n.id === 'send')!;
        expect(sendNode.data.config).toEqual({ to: 'new@test.com', subject: 'Hello' });
    });

    it('getDefinition round-trips back to a valid definition', () => {
        const { result } = renderHook(() =>
            useWorkflowBuilder({ definition: simpleDef, handlers }),
        );

        const def = result.current.getDefinition();
        expect(def.initial_step).toBe('send');
        expect(def.steps.send.handler).toBe('send_email');
        expect(def.transitions.send).toBe('completed');
    });

    it('setDefinition replaces the graph and resets undo history', () => {
        const { result } = renderHook(() =>
            useWorkflowBuilder({ definition: simpleDef, handlers }),
        );

        const newDef: WorkflowDefinition = {
            initial_step: 'check',
            steps: {
                check: { type: 'conditional', handler: 'check_amount' },
            },
            transitions: {
                check: 'completed',
            },
        };

        act(() => {
            result.current.setDefinition(newDef);
        });

        expect(result.current.nodes.find((n) => n.id === 'check')).toBeDefined();
        expect(result.current.nodes.find((n) => n.id === 'send')).toBeUndefined();
        expect(result.current.canUndo).toBe(false);
    });

    it('autoLayout repositions nodes', () => {
        const { result } = renderHook(() =>
            useWorkflowBuilder({ definition: simpleDef, handlers }),
        );

        const positionsBefore = result.current.nodes.map((n) => ({ ...n.position }));

        act(() => {
            result.current.autoLayout();
        });

        // Positions should be valid numbers (dagre ran)
        for (const node of result.current.nodes) {
            expect(Number.isFinite(node.position.x)).toBe(true);
            expect(Number.isFinite(node.position.y)).toBe(true);
        }
    });

    describe('readonly mode', () => {
        it('addStep is a no-op in readonly mode', () => {
            const { result } = renderHook(() =>
                useWorkflowBuilder({ definition: simpleDef, handlers, readonly: true }),
            );

            const nodeCountBefore = result.current.nodes.length;

            act(() => {
                result.current.addStep('action', handlers.send_email, { x: 0, y: 0 });
            });

            expect(result.current.nodes).toHaveLength(nodeCountBefore);
        });

        it('removeStep is a no-op in readonly mode', () => {
            const { result } = renderHook(() =>
                useWorkflowBuilder({ definition: simpleDef, handlers, readonly: true }),
            );

            const nodeCountBefore = result.current.nodes.length;

            act(() => {
                result.current.removeStep('send');
            });

            expect(result.current.nodes).toHaveLength(nodeCountBefore);
        });

        it('onConnect is a no-op in readonly mode', () => {
            const { result } = renderHook(() =>
                useWorkflowBuilder({ definition: simpleDef, handlers, readonly: true }),
            );

            const edgeCountBefore = result.current.edges.length;

            act(() => {
                result.current.onConnect({
                    source: '__start__',
                    target: '__end__',
                    sourceHandle: null,
                    targetHandle: null,
                });
            });

            expect(result.current.edges).toHaveLength(edgeCountBefore);
        });
    });

    describe('undo/redo', () => {
        it('starts with canUndo and canRedo as false', () => {
            const { result } = renderHook(() => useWorkflowBuilder({ handlers }));

            expect(result.current.canUndo).toBe(false);
            expect(result.current.canRedo).toBe(false);
        });

        it('can undo after addStep', () => {
            const { result } = renderHook(() => useWorkflowBuilder({ handlers }));

            act(() => {
                result.current.addStep('action', handlers.send_email, { x: 0, y: 0 });
            });

            expect(result.current.nodes).toHaveLength(3);
            expect(result.current.canUndo).toBe(true);

            act(() => {
                result.current.undo();
            });

            expect(result.current.nodes).toHaveLength(2);
            expect(result.current.canUndo).toBe(false);
            expect(result.current.canRedo).toBe(true);
        });

        it('can redo after undo', () => {
            const { result } = renderHook(() => useWorkflowBuilder({ handlers }));

            act(() => {
                result.current.addStep('action', handlers.send_email, { x: 0, y: 0 });
            });

            act(() => {
                result.current.undo();
            });

            expect(result.current.nodes).toHaveLength(2);

            act(() => {
                result.current.redo();
            });

            expect(result.current.nodes).toHaveLength(3);
            expect(result.current.canRedo).toBe(false);
        });

        it('undo is a no-op when stack is empty', () => {
            const { result } = renderHook(() => useWorkflowBuilder({ handlers }));

            act(() => {
                result.current.undo();
            });

            expect(result.current.nodes).toHaveLength(2);
        });

        it('redo is a no-op when stack is empty', () => {
            const { result } = renderHook(() => useWorkflowBuilder({ handlers }));

            act(() => {
                result.current.redo();
            });

            expect(result.current.nodes).toHaveLength(2);
        });
    });
});
