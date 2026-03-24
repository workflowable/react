import type { WorkflowDefinition, StepDefinition, Transition } from '../types/definition';
import type { FlowNode, FlowEdge } from './types';

const START_NODE_ID = '__start__';
const END_NODE_ID = '__end__';
const COMPLETED_STEP = 'completed';

export function flowToDefinition(nodes: FlowNode[], edges: FlowEdge[]): WorkflowDefinition {
    const stepNodes = nodes.filter(
        (n) => n.id !== START_NODE_ID && n.id !== END_NODE_ID,
    );

    // Find initial step: the target of the edge from the start node
    const startEdge = edges.find((e) => e.source === START_NODE_ID);
    const initialStep = startEdge?.target ?? '';

    // Build steps
    const steps: Record<string, StepDefinition> = {};
    for (const node of stepNodes) {
        steps[node.data.stepName] = {
            type: node.data.type,
            handler: node.data.handler,
            ...node.data.config,
        };
    }

    // Build transitions
    const transitions: Record<string, Transition> = {};
    for (const edge of edges) {
        if (edge.source === START_NODE_ID) continue;

        const target = edge.target === END_NODE_ID ? COMPLETED_STEP : edge.target;

        if (edge.data?.condition) {
            if (!transitions[edge.source]) {
                transitions[edge.source] = {};
            }
            (transitions[edge.source] as Record<string, string>)[edge.data.condition] = target;
        } else {
            transitions[edge.source] = target;
        }
    }

    return {
        initial_step: initialStep,
        steps,
        transitions,
    };
}
