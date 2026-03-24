export type StepExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'waiting';

export interface StepExecution {
    id: number;
    step_name: string;
    status: StepExecutionStatus;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    error: string | null;
    attempts: number;
    started_at: string | null;
    completed_at: string | null;
    duration: number | null;
}
