import type { Parameter } from './parameter';

export interface WorkflowHandler {
    name: string;
    description: string;
    parameters: Parameter[];
}

export interface HandlerGroup {
    general: WorkflowHandler[];
    specific: WorkflowHandler[];
}

export interface WorkflowEvent {
    name: string;
    description: string;
    parameters: Parameter[];
    handlers?: {
        actions: HandlerGroup;
        conditionals: HandlerGroup;
        wait_handlers: HandlerGroup;
    };
}
