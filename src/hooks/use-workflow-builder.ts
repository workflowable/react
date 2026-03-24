import { useCallback, useRef, useState } from 'react';
import {
    useNodesState,
    useEdgesState,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    addEdge,
    type Connection,
} from '@xyflow/react';
import type { FlowNode, FlowEdge, FlowNodeData, FlowNodeType } from '../converter/types';
import type { WorkflowDefinition } from '../types/definition';
import type { WorkflowHandler } from '../types/workflow-event';
import { definitionToFlow } from '../converter/definition-to-flow';
import { flowToDefinition } from '../converter/flow-to-definition';
import { layoutNodes } from '../converter/layout';

interface HistoryEntry {
    nodes: FlowNode[];
    edges: FlowEdge[];
}

const MAX_HISTORY = 50;

export interface UseWorkflowBuilderOptions {
    definition?: WorkflowDefinition;
    handlers?: Record<string, WorkflowHandler>;
    readonly?: boolean;
}

export interface UseWorkflowBuilderReturn {
    nodes: FlowNode[];
    edges: FlowEdge[];
    onNodesChange: OnNodesChange<FlowNode>;
    onEdgesChange: OnEdgesChange<FlowEdge>;
    onConnect: OnConnect;
    addStep: (type: FlowNodeType, handler: WorkflowHandler, position: { x: number; y: number }) => void;
    removeStep: (id: string) => void;
    updateStepConfig: (id: string, config: Record<string, unknown>) => void;
    getDefinition: () => WorkflowDefinition;
    setDefinition: (definition: WorkflowDefinition) => void;
    autoLayout: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export function useWorkflowBuilder({
    definition,
    handlers = {},
    readonly = false,
}: UseWorkflowBuilderOptions = {}): UseWorkflowBuilderReturn {
    const emptyDefinition: WorkflowDefinition = { initial_step: '', steps: {}, transitions: {} };
    const initial = definitionToFlow(definition ?? emptyDefinition, handlers);

    const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initial.edges);

    const undoStack = useRef<HistoryEntry[]>([]);
    const redoStack = useRef<HistoryEntry[]>([]);
    const [historyVersion, setHistoryVersion] = useState(0);

    const pushHistory = useCallback(() => {
        undoStack.current.push({ nodes, edges });
        if (undoStack.current.length > MAX_HISTORY) {
            undoStack.current.shift();
        }
        redoStack.current = [];
        setHistoryVersion((v) => v + 1);
    }, [nodes, edges]);

    const undo = useCallback(() => {
        const prev = undoStack.current.pop();
        if (!prev) return;
        redoStack.current.push({ nodes, edges });
        setNodes(prev.nodes);
        setEdges(prev.edges);
        setHistoryVersion((v) => v + 1);
    }, [nodes, edges, setNodes, setEdges]);

    const redo = useCallback(() => {
        const next = redoStack.current.pop();
        if (!next) return;
        undoStack.current.push({ nodes, edges });
        setNodes(next.nodes);
        setEdges(next.edges);
        setHistoryVersion((v) => v + 1);
    }, [nodes, edges, setNodes, setEdges]);

    const onConnect = useCallback(
        (connection: Connection) => {
            if (readonly) return;
            pushHistory();
            setEdges((eds) => addEdge(connection, eds));
        },
        [readonly, pushHistory, setEdges],
    );

    const addStep = useCallback(
        (type: FlowNodeType, handler: WorkflowHandler, position: { x: number; y: number }) => {
            if (readonly) return;
            pushHistory();

            const id = `${handler.name}_${Date.now()}`;
            const data: FlowNodeData = {
                stepName: id,
                type,
                handler: handler.name,
                label: handler.name,
                description: handler.description,
                parameters: handler.parameters,
                config: {},
            };

            const newNode: FlowNode = { id, type, position, data };
            setNodes((nds) => [...nds, newNode]);
        },
        [readonly, pushHistory, setNodes],
    );

    const removeStep = useCallback(
        (id: string) => {
            if (readonly) return;
            pushHistory();
            setNodes((nds) => nds.filter((n) => n.id !== id));
            setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        },
        [readonly, pushHistory, setNodes, setEdges],
    );

    const updateStepConfig = useCallback(
        (id: string, config: Record<string, unknown>) => {
            pushHistory();
            setNodes((nds) =>
                nds.map((n) =>
                    n.id === id ? { ...n, data: { ...n.data, config } } : n,
                ),
            );
        },
        [pushHistory, setNodes],
    );

    const getDefinition = useCallback(
        () => flowToDefinition(nodes, edges),
        [nodes, edges],
    );

    const setDefinition = useCallback(
        (def: WorkflowDefinition) => {
            const graph = definitionToFlow(def, handlers);
            setNodes(graph.nodes);
            setEdges(graph.edges);
            undoStack.current = [];
            redoStack.current = [];
            setHistoryVersion((v) => v + 1);
        },
        [handlers, setNodes, setEdges],
    );

    const autoLayout = useCallback(() => {
        pushHistory();
        const laid = layoutNodes({ nodes, edges });
        setNodes(laid.nodes);
    }, [nodes, edges, pushHistory, setNodes]);

    return {
        nodes,
        edges,
        onNodesChange: readonly ? (() => {}) as OnNodesChange<FlowNode> : onNodesChange,
        onEdgesChange: readonly ? (() => {}) as OnEdgesChange<FlowEdge> : onEdgesChange,
        onConnect,
        addStep,
        removeStep,
        updateStepConfig,
        getDefinition,
        setDefinition,
        autoLayout,
        undo,
        redo,
        canUndo: undoStack.current.length > 0,
        canRedo: redoStack.current.length > 0,
    };
}
