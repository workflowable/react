import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkflowPersistence } from '../../src/hooks/use-workflow-persistence';
import type { WorkflowVersion } from '../../src/types/workflow-version';
import type { WorkflowDefinition } from '../../src/types/definition';

const mockVersion: WorkflowVersion = {
    id: 1,
    workflow_id: 10,
    version: 1,
    status: 'draft',
    created_by: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const mockDefinition: WorkflowDefinition = {
    initial_step: 'send',
    steps: { send: { type: 'action', handler: 'send_email' } },
    transitions: { send: 'completed' },
};

describe('useWorkflowPersistence', () => {
    it('initialises with the provided version', () => {
        const { result } = renderHook(() =>
            useWorkflowPersistence({
                version: mockVersion,
                onSave: vi.fn(),
            }),
        );

        expect(result.current.version).toEqual(mockVersion);
        expect(result.current.isSaving).toBe(false);
        expect(result.current.isDirty).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('markDirty sets isDirty to true', () => {
        const { result } = renderHook(() =>
            useWorkflowPersistence({
                version: mockVersion,
                onSave: vi.fn(),
            }),
        );

        act(() => {
            result.current.markDirty();
        });

        expect(result.current.isDirty).toBe(true);
    });

    it('markClean sets isDirty to false', () => {
        const { result } = renderHook(() =>
            useWorkflowPersistence({
                version: mockVersion,
                onSave: vi.fn(),
            }),
        );

        act(() => {
            result.current.markDirty();
        });

        act(() => {
            result.current.markClean();
        });

        expect(result.current.isDirty).toBe(false);
    });

    it('save calls onSave and updates version on success', async () => {
        const updatedVersion: WorkflowVersion = {
            ...mockVersion,
            id: 2,
            version: 2,
            updated_at: '2026-01-02T00:00:00Z',
        };

        const onSave = vi.fn().mockResolvedValue(updatedVersion);

        const { result } = renderHook(() =>
            useWorkflowPersistence({ version: mockVersion, onSave }),
        );

        act(() => {
            result.current.markDirty();
        });

        let returned: WorkflowVersion;
        await act(async () => {
            returned = await result.current.save(mockDefinition);
        });

        expect(onSave).toHaveBeenCalledWith(mockDefinition);
        expect(result.current.version).toEqual(updatedVersion);
        expect(result.current.isDirty).toBe(false);
        expect(result.current.isSaving).toBe(false);
        expect(returned!).toEqual(updatedVersion);
    });

    it('save sets error and re-throws on failure', async () => {
        const error = new Error('Network error');
        const onSave = vi.fn().mockRejectedValue(error);

        const { result } = renderHook(() =>
            useWorkflowPersistence({ version: mockVersion, onSave }),
        );

        await act(async () => {
            await expect(result.current.save(mockDefinition)).rejects.toThrow('Network error');
        });

        expect(result.current.error).toBe(error);
        expect(result.current.isSaving).toBe(false);
        // Version should not change on failure
        expect(result.current.version).toEqual(mockVersion);
    });

    it('clearError resets the error state', async () => {
        const onSave = vi.fn().mockRejectedValue(new Error('fail'));

        const { result } = renderHook(() =>
            useWorkflowPersistence({ version: mockVersion, onSave }),
        );

        await act(async () => {
            await result.current.save(mockDefinition).catch(() => {});
        });

        expect(result.current.error).not.toBeNull();

        act(() => {
            result.current.clearError();
        });

        expect(result.current.error).toBeNull();
    });

    it('save clears previous error on new attempt', async () => {
        const error = new Error('first fail');
        const updatedVersion: WorkflowVersion = { ...mockVersion, version: 2 };

        const onSave = vi
            .fn()
            .mockRejectedValueOnce(error)
            .mockResolvedValueOnce(updatedVersion);

        const { result } = renderHook(() =>
            useWorkflowPersistence({ version: mockVersion, onSave }),
        );

        // First save fails
        await act(async () => {
            await result.current.save(mockDefinition).catch(() => {});
        });

        expect(result.current.error).toBe(error);

        // Second save succeeds — error should be cleared
        await act(async () => {
            await result.current.save(mockDefinition);
        });

        expect(result.current.error).toBeNull();
        expect(result.current.version).toEqual(updatedVersion);
    });
});
