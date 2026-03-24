export interface StepDefinition {
    type: 'action' | 'conditional' | 'wait' | (string & {});
    handler: string;
    [key: string]: unknown;
}

export type Transition = string | Record<string, string>;

export interface WorkflowDefinition {
    initial_step: string;
    steps: Record<string, StepDefinition>;
    transitions: Record<string, Transition>;
}
