import type { StepExecution } from './step-execution';
import type { Workflow } from './workflow';
import type { WorkflowVersion } from './workflow-version';

export type WorkflowInstanceStatus = 'pending' | 'in_progress' | 'waiting' | 'completed' | 'failed';

export interface WorkflowInstance {
    id: number;
    uuid: string;
    workflow_version_id: number;
    workflow?: Workflow;
    workflow_version?: WorkflowVersion;
    current_step: string | null;
    status: WorkflowInstanceStatus;
    state: Record<string, unknown>;
    error_message: string | null;
    created_by: number | null;
    next_attempt_at: string | null;
    completed_at: string | null;
    step_executions?: StepExecution[];
    created_at: string;
    updated_at: string;
}
