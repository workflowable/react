import type { ComponentType } from 'react';
import type { Parameter } from './parameter';

export interface ParameterRendererProps {
    parameter: Parameter;
    value: unknown;
    onChange: (value: unknown) => void;
    error?: string;
}

export type ParameterRenderer = ComponentType<ParameterRendererProps>;

export type ParameterRendererRegistry = Record<string, ParameterRenderer>;
