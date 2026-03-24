import type { WorkflowDefinition } from './definition';

export type WorkflowVersionStatus = 'draft' | 'published' | 'draining' | 'archived';

export interface WorkflowVersion {
    id: number;
    workflow_id: number;
    version: number;
    status: WorkflowVersionStatus;
    definition?: WorkflowDefinition;
    created_by: number | null;
    created_at: string;
    updated_at: string;
}
