export type ParameterType =
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'date'
    | 'time'
    | 'datetime'
    | 'timezone'
    | 'cron'
    | 'model'
    | (string & {});

interface BaseParameter {
    name: string;
    type: ParameterType;
    label: string;
    required: boolean;
    default?: unknown;
    description?: string;
}

export interface TextParameter extends BaseParameter {
    type: 'text';
    placeholder?: string;
    multiline?: boolean;
}

export interface NumberParameter extends BaseParameter {
    type: 'number';
    min?: number;
    max?: number;
    step?: number;
}

export interface BooleanParameter extends BaseParameter {
    type: 'boolean';
}

export interface SelectParameter extends BaseParameter {
    type: 'select' | 'timezone';
    options: Record<string, string>;
    multiple?: boolean;
}

export interface DateParameter extends BaseParameter {
    type: 'date';
    with_time?: boolean;
    min_date?: string;
    max_date?: string;
}

export interface TimeParameter extends BaseParameter {
    type: 'time';
    min_time?: string;
    max_time?: string;
    step?: number;
}

export interface DateTimeParameter extends BaseParameter {
    type: 'datetime';
    min_datetime?: string;
    max_datetime?: string;
}

export interface CronParameter extends BaseParameter {
    type: 'cron';
    placeholder?: string;
}

export interface ModelParameter extends BaseParameter {
    type: 'model';
    data_source: {
        value_key: string;
        label_key: string;
        search_param: string;
        endpoint: string;
    };
    multiple?: boolean;
}

export type Parameter =
    | TextParameter
    | NumberParameter
    | BooleanParameter
    | SelectParameter
    | DateParameter
    | TimeParameter
    | DateTimeParameter
    | CronParameter
    | ModelParameter
    | BaseParameter;
