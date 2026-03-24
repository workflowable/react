import { useCallback, useState } from 'react';
import type { WorkflowDefinition } from '../types/definition';
import type { WorkflowVersion } from '../types/workflow-version';

export interface UseWorkflowPersistenceOptions {
    version?: WorkflowVersion;
    onSave: (definition: WorkflowDefinition) => Promise<WorkflowVersion>;
}

export interface UseWorkflowPersistenceReturn {
    version: WorkflowVersion | undefined;
    isSaving: boolean;
    isDirty: boolean;
    error: unknown;
    save: (definition: WorkflowDefinition) => Promise<WorkflowVersion>;
    markDirty: () => void;
    markClean: () => void;
    clearError: () => void;
}

export function useWorkflowPersistence({
    version: initialVersion,
    onSave,
}: UseWorkflowPersistenceOptions): UseWorkflowPersistenceReturn {
    const [version, setVersion] = useState<WorkflowVersion | undefined>(initialVersion);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const save = useCallback(
        async (definition: WorkflowDefinition): Promise<WorkflowVersion> => {
            setIsSaving(true);
            setError(null);

            try {
                const updated = await onSave(definition);
                setVersion(updated);
                setIsDirty(false);
                return updated;
            } catch (err) {
                setError(err);
                throw err;
            } finally {
                setIsSaving(false);
            }
        },
        [onSave],
    );

    const markDirty = useCallback(() => setIsDirty(true), []);
    const markClean = useCallback(() => setIsDirty(false), []);
    const clearError = useCallback(() => setError(null), []);

    return {
        version,
        isSaving,
        isDirty,
        error,
        save,
        markDirty,
        markClean,
        clearError,
    };
}
