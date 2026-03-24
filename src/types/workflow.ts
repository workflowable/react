import type { WorkflowVersion } from './workflow-version';

export interface Workflow {
    id: number;
    name: string;
    description: string | null;
    event_name: string;
    current_version: WorkflowVersion | null;
    versions_count: number;
    created_at: string;
    updated_at: string;
}
