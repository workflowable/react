import Dagre from '@dagrejs/dagre';
import type { FlowGraph } from './types';

const NODE_WIDTH = 250;
const NODE_HEIGHT = 80;

const START_NODE_ID = '__start__';
const END_NODE_ID = '__end__';

export function layoutNodes(graph: FlowGraph): FlowGraph {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

    g.setGraph({
        rankdir: 'TB',
        nodesep: 50,
        ranksep: 80,
    });

    for (const node of graph.nodes) {
        g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }

    // Add a temporary edge from start to end so Dagre always places end below start
    const hasStartToEndEdge = graph.edges.some(
        (e) => e.source === START_NODE_ID && e.target === END_NODE_ID,
    );
    if (!hasStartToEndEdge) {
        g.setEdge(START_NODE_ID, END_NODE_ID);
    }

    for (const edge of graph.edges) {
        g.setEdge(edge.source, edge.target);
    }

    Dagre.layout(g);

    const nodes = graph.nodes.map((node) => {
        const pos = g.node(node.id);
        return {
            ...node,
            position: {
                x: pos.x - NODE_WIDTH / 2,
                y: pos.y - NODE_HEIGHT / 2,
            },
        };
    });

    return { nodes, edges: graph.edges };
}
