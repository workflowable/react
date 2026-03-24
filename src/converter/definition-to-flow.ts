import type { WorkflowDefinition } from '../types/definition';
import type { WorkflowHandler } from '../types/workflow-event';
import type { FlowNode, FlowEdge, FlowGraph, FlowNodeData } from './types';
import { layoutNodes } from './layout';

const START_NODE_ID = '__start__';
const END_NODE_ID = '__end__';
const COMPLETED_STEP = 'completed';

export function definitionToFlow(
    definition: WorkflowDefinition,
    handlers: Record<string, WorkflowHandler>,
): FlowGraph {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    // Start node
    nodes.push({
        id: START_NODE_ID,
        type: 'start',
        position: { x: 0, y: 0 },
        data: {
            stepName: START_NODE_ID,
            type: 'start',
            handler: '',
            label: 'Start',
            description: '',
            parameters: [],
            config: {},
        },
        deletable: false,
    });

    // End node
    nodes.push({
        id: END_NODE_ID,
        type: 'end',
        position: { x: 0, y: 0 },
        data: {
            stepName: END_NODE_ID,
            type: 'end',
            handler: '',
            label: 'End',
            description: '',
            parameters: [],
            config: {},
        },
        deletable: false,
    });

    // Edge from start to initial step
    if (definition.initial_step) {
        edges.push({
            id: `${START_NODE_ID}->${definition.initial_step}`,
            source: START_NODE_ID,
            target: definition.initial_step,
        });
    }

    // Step nodes
    for (const [stepName, step] of Object.entries(definition.steps)) {
        const handler = handlers[step.handler];
        const { type, handler: handlerName, ...config } = step;

        const data: FlowNodeData = {
            stepName,
            type: step.type,
            handler: handlerName,
            label: handler?.name ?? handlerName,
            description: handler?.description ?? '',
            parameters: handler?.parameters ?? [],
            config,
        };

        nodes.push({
            id: stepName,
            type: step.type as FlowNode['type'],
            position: { x: 0, y: 0 },
            data,
        });
    }

    // Transition edges
    for (const [fromStep, destinations] of Object.entries(definition.transitions)) {
        if (typeof destinations === 'string') {
            const target = destinations === COMPLETED_STEP ? END_NODE_ID : destinations;
            edges.push({
                id: `${fromStep}->${target}`,
                source: fromStep,
                target,
            });
        } else {
            for (const [condition, toStep] of Object.entries(destinations)) {
                const target = toStep === COMPLETED_STEP ? END_NODE_ID : toStep;
                edges.push({
                    id: `${fromStep}->${target}:${condition}`,
                    source: fromStep,
                    sourceHandle: condition,
                    target,
                    data: { condition: condition as 'true' | 'false' },
                });
            }
        }
    }

    return layoutNodes({ nodes, edges });
}
