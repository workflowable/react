# @workflowable/react

Headless React library for building visual workflow editors. Provides types, state management, and bidirectional conversion between workflow definitions and [React Flow](https://reactflow.dev/) graphs.

Designed to pair with the [workflowable/workflowable](https://github.com/workflowable/workflowable) Laravel package.

## Installation

```bash
npm install @workflowable/react
```

### Peer Dependencies

- `react` ^19.0.0
- `react-dom` ^19.0.0
- `@xyflow/react` ^12.10.1

## Quick Start

```tsx
import {
    WorkflowableProvider,
    useWorkflowBuilder,
    useWorkflowPersistence,
} from '@workflowable/react';
import { ReactFlow } from '@xyflow/react';

function WorkflowEditor({ version, handlers, onSave }) {
    const builder = useWorkflowBuilder({
        definition: version.definition,
        handlers,
    });

    const persistence = useWorkflowPersistence({
        version,
        onSave,
    });

    const handleSave = async () => {
        const definition = builder.getDefinition();
        await persistence.save(definition);
    };

    return (
        <div style={{ height: '100vh' }}>
            <button onClick={handleSave} disabled={persistence.isSaving}>
                {persistence.isSaving ? 'Saving...' : 'Save'}
            </button>
            <ReactFlow
                nodes={builder.nodes}
                edges={builder.edges}
                onNodesChange={builder.onNodesChange}
                onEdgesChange={builder.onEdgesChange}
                onConnect={builder.onConnect}
            />
        </div>
    );
}

function App() {
    return (
        <WorkflowableProvider>
            <WorkflowEditor
                version={version}
                handlers={handlers}
                onSave={(definition) =>
                    fetch(`/api/versions/${version.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ definition }),
                    }).then((r) => r.json())
                }
            />
        </WorkflowableProvider>
    );
}
```

## API

### Context

#### `WorkflowableProvider`

Wraps your app to provide custom parameter renderer registration.

```tsx
<WorkflowableProvider parameterRenderers={{ color_picker: ColorPickerField }}>
    {children}
</WorkflowableProvider>
```

#### `useWorkflowable()`

Access the context value (e.g. `parameterRenderers`) from within the provider.

### Hooks

#### `useWorkflowBuilder(options?)`

Core hook for managing the React Flow graph state of a workflow.

**Options:**

| Option       | Type                              | Description                                          |
| ------------ | --------------------------------- | ---------------------------------------------------- |
| `definition` | `WorkflowDefinition`             | Initial workflow definition to load                   |
| `handlers`   | `Record<string, WorkflowHandler>` | Handler metadata (name, description, parameters)     |
| `readonly`   | `boolean`                         | Disables all mutations when `true`                   |

**Returns:**

| Property           | Type                                                       | Description                              |
| ------------------ | ---------------------------------------------------------- | ---------------------------------------- |
| `nodes`            | `FlowNode[]`                                               | Current React Flow nodes                 |
| `edges`            | `FlowEdge[]`                                               | Current React Flow edges                 |
| `onNodesChange`    | `OnNodesChange<FlowNode>`                                  | Pass to `<ReactFlow>`                    |
| `onEdgesChange`    | `OnEdgesChange<FlowEdge>`                                  | Pass to `<ReactFlow>`                    |
| `onConnect`        | `OnConnect`                                                | Pass to `<ReactFlow>`                    |
| `addStep`          | `(type, handler, position) => void`                        | Add a new step node                      |
| `removeStep`       | `(id: string) => void`                                     | Remove a step and its edges              |
| `updateStepConfig` | `(id: string, config: Record<string, unknown>) => void`    | Update a step's configuration            |
| `getDefinition`    | `() => WorkflowDefinition`                                 | Convert current graph to a definition    |
| `setDefinition`    | `(definition: WorkflowDefinition) => void`                 | Load a definition into the graph         |
| `autoLayout`       | `() => void`                                               | Re-layout nodes using dagre              |
| `undo` / `redo`    | `() => void`                                               | Undo/redo graph changes (50-entry stack) |
| `canUndo`/`canRedo`| `boolean`                                                  | Whether undo/redo is available           |

#### `useWorkflowPersistence(options)`

Tracks save state without making API calls — your app provides the `onSave` callback.

**Options:**

| Option    | Type                                                      | Description                                |
| --------- | --------------------------------------------------------- | ------------------------------------------ |
| `version` | `WorkflowVersion`                                         | Initial version object                     |
| `onSave`  | `(definition: WorkflowDefinition) => Promise<WorkflowVersion>` | Your save function (API call, Inertia, etc.) |

**Returns:**

| Property     | Type                                                      | Description                      |
| ------------ | --------------------------------------------------------- | -------------------------------- |
| `version`    | `WorkflowVersion`                                         | Current version (updated on save)|
| `isSaving`   | `boolean`                                                 | Whether a save is in progress    |
| `isDirty`    | `boolean`                                                 | Whether unsaved changes exist    |
| `error`      | `unknown`                                                 | Last save error, if any          |
| `save`       | `(definition: WorkflowDefinition) => Promise<WorkflowVersion>` | Trigger a save                   |
| `markDirty`  | `() => void`                                              | Manually mark as dirty           |
| `markClean`  | `() => void`                                              | Manually mark as clean           |
| `clearError` | `() => void`                                              | Clear the error state            |

### Converters

#### `definitionToFlow(definition, handlers)`

Converts a `WorkflowDefinition` to a `FlowGraph` (`{ nodes, edges }`). Adds synthetic `__start__` and `__end__` nodes and applies dagre auto-layout.

#### `flowToDefinition(nodes, edges)`

Converts React Flow nodes/edges back to a `WorkflowDefinition`. Strips synthetic nodes, maps end node connections to `"completed"` transitions.

#### `layoutNodes(graph)`

Applies dagre top-to-bottom layout to a `FlowGraph`. Used internally by `definitionToFlow` and `autoLayout()`.

### Types

#### Workflow Domain

```typescript
// Core definition format (matches backend JSON)
interface WorkflowDefinition {
    initial_step: string;
    steps: Record<string, StepDefinition>;
    transitions: Record<string, Transition>;
}

interface StepDefinition {
    type: 'action' | 'conditional' | 'wait' | (string & {}); // extensible
    handler: string;
    [key: string]: unknown; // arbitrary step config
}

type Transition = string | Record<string, string>;
```

#### Resources

- `Workflow` — mirrors the Laravel WorkflowResource
- `WorkflowVersion` — with `WorkflowVersionStatus` (`'draft' | 'published' | 'draining' | 'archived'`)
- `WorkflowInstance` — with `WorkflowInstanceStatus`
- `StepExecution` — with `StepExecutionStatus`

#### Parameters

Built-in parameter types: `text`, `number`, `boolean`, `select`, `date`, `time`, `datetime`, `timezone`, `cron`, `model`.

Custom types are supported via the `(string & {})` pattern — register renderers for them through the `WorkflowableProvider`.

#### Events & Handlers

```typescript
interface WorkflowHandler {
    name: string;
    description: string;
    parameters: Parameter[];
}

interface WorkflowEvent {
    name: string;
    description: string;
    parameters: Parameter[];
    handlers?: {
        actions: HandlerGroup;
        conditionals: HandlerGroup;
        wait_handlers: HandlerGroup;
    };
}
```

## Custom Step Types

The `StepDefinition.type` field accepts any string, so you can define custom step types (e.g. `'approval'`, `'webhook'`) in your backend and they will round-trip through the converters without modification:

```typescript
const definition: WorkflowDefinition = {
    initial_step: 'approve',
    steps: {
        approve: {
            type: 'approval',
            handler: 'manager_approval',
            approver_role: 'finance_manager',
            timeout_hours: 24,
        },
    },
    transitions: { approve: 'completed' },
};
```

## Custom Parameter Renderers

Register renderers for custom parameter types via the provider:

```tsx
import type { ParameterRendererProps } from '@workflowable/react';

function ColorPickerField({ parameter, value, onChange, error }: ParameterRendererProps) {
    return <input type="color" value={value as string} onChange={(e) => onChange(e.target.value)} />;
}

<WorkflowableProvider parameterRenderers={{ color_picker: ColorPickerField }}>
    {children}
</WorkflowableProvider>
```

## Testing

```bash
npm test
```

## License

Private — not published to npm.
