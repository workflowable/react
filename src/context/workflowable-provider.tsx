import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ParameterRendererRegistry } from '../types/parameter-renderer';

export interface WorkflowableContextValue {
    parameterRenderers: ParameterRendererRegistry;
}

export const WorkflowableContext = createContext<WorkflowableContextValue | null>(null);

export interface WorkflowableProviderProps {
    parameterRenderers?: ParameterRendererRegistry;
    children: ReactNode;
}

export function WorkflowableProvider({
    parameterRenderers = {},
    children,
}: WorkflowableProviderProps) {
    const value = useMemo<WorkflowableContextValue>(
        () => ({ parameterRenderers }),
        [parameterRenderers],
    );

    return <WorkflowableContext.Provider value={value}>{children}</WorkflowableContext.Provider>;
}

export function useWorkflowable(): WorkflowableContextValue {
    const context = useContext(WorkflowableContext);

    if (!context) {
        throw new Error('useWorkflowable must be used within a <WorkflowableProvider>');
    }

    return context;
}
