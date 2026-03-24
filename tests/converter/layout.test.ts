import { describe, it, expect } from 'vitest';
import { layoutNodes } from '../../src/converter/layout';
import type { FlowNode, FlowEdge, FlowGraph } from '../../src/converter/types';

function makeNode(id: string): FlowNode {
    return {
        id,
        type: 'action',
        position: { x: 0, y: 0 },
        data: {
            stepName: id,
            type: 'action',
            handler: 'test',
            label: 'Test',
            description: '',
            parameters: [],
            config: {},
        },
    };
}

describe('layoutNodes', () => {
    it('assigns valid positions to all nodes', () => {
        const graph: FlowGraph = {
            nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
            edges: [
                { id: 'e1', source: 'a', target: 'b' },
                { id: 'e2', source: 'b', target: 'c' },
            ],
        };

        const result = layoutNodes(graph);

        for (const node of result.nodes) {
            expect(node.position.x).toEqual(expect.any(Number));
            expect(node.position.y).toEqual(expect.any(Number));
            expect(Number.isFinite(node.position.x)).toBe(true);
            expect(Number.isFinite(node.position.y)).toBe(true);
        }
    });

    it('produces no overlapping nodes', () => {
        const graph: FlowGraph = {
            nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
            edges: [
                { id: 'e1', source: 'a', target: 'b' },
                { id: 'e2', source: 'a', target: 'c' },
            ],
        };

        const result = layoutNodes(graph);
        const positions = result.nodes.map((n) => `${n.position.x},${n.position.y}`);
        const unique = new Set(positions);

        expect(unique.size).toBe(result.nodes.length);
    });

    it('handles a single node', () => {
        const graph: FlowGraph = {
            nodes: [makeNode('a')],
            edges: [],
        };

        const result = layoutNodes(graph);
        expect(result.nodes).toHaveLength(1);
        expect(Number.isFinite(result.nodes[0].position.x)).toBe(true);
    });

    it('handles branching graphs', () => {
        const graph: FlowGraph = {
            nodes: [
                makeNode('root'),
                makeNode('left'),
                makeNode('right'),
                makeNode('merge'),
            ],
            edges: [
                { id: 'e1', source: 'root', target: 'left' },
                { id: 'e2', source: 'root', target: 'right' },
                { id: 'e3', source: 'left', target: 'merge' },
                { id: 'e4', source: 'right', target: 'merge' },
            ],
        };

        const result = layoutNodes(graph);

        // root should be above left/right
        const root = result.nodes.find((n) => n.id === 'root')!;
        const left = result.nodes.find((n) => n.id === 'left')!;
        const right = result.nodes.find((n) => n.id === 'right')!;
        const merge = result.nodes.find((n) => n.id === 'merge')!;

        expect(root.position.y).toBeLessThan(left.position.y);
        expect(root.position.y).toBeLessThan(right.position.y);
        expect(left.position.y).toBeLessThan(merge.position.y);
    });

    it('preserves edges unchanged', () => {
        const edges: FlowEdge[] = [
            { id: 'e1', source: 'a', target: 'b', data: { condition: 'true' } },
        ];
        const graph: FlowGraph = {
            nodes: [makeNode('a'), makeNode('b')],
            edges,
        };

        const result = layoutNodes(graph);
        expect(result.edges).toBe(edges);
    });
});
