import type { Node, Edge } from '@xyflow/react';
import type { Parameter } from '../types/parameter';

export type FlowNodeType = 'action' | 'conditional' | 'wait' | 'start' | 'end';

export type FlowNodeData = {
    stepName: string;
    type: string;
    handler: string;
    label: string;
    description: string;
    parameters: Parameter[];
    config: Record<string, unknown>;
    [key: string]: unknown;
};

export type FlowNode = Node<FlowNodeData, FlowNodeType>;

export type FlowEdgeData = {
    condition?: 'true' | 'false';
    [key: string]: unknown;
};

export type FlowEdge = Edge<FlowEdgeData>;

export interface FlowGraph {
    nodes: FlowNode[];
    edges: FlowEdge[];
}
