# @qiuyulc/infinite-map

Infinite canvas renderer for React — world-coordinate rendering, spatial index, plugin protocol, and document serialization.

## Features

- **World-coordinate rendering** — pan/zoom with a high-performance engine (vanilla store + subscribe, not React-driven)
- **Plugin protocol (Scheme C)** — `hitTest → pointerDownProcessors → gestures` input pipeline
- **Document persistence** — `serializeDoc` / `parseDoc` with `schemaVersion=1`
- **Spatial index** — efficient hit-testing for large node counts
- **Theme system** — CSS custom properties + `InfiniteMapThemeProvider` for light/dark theming
- **ESM / CJS / TypeScript** — dual format with `exports` field, tree-shakeable deep imports
- **Zero CSS configuration** — styles are bundled and declared via `sideEffects`, no manual imports needed

## Installation

```bash
npm install @qiuyulc/infinite-map
# or
pnpm add @qiuyulc/infinite-map
# or
yarn add @qiuyulc/infinite-map
```

> Requires `react` and `react-dom` ≥ 18 as peer dependencies.

## Quick Start

### Read-only viewer

```tsx
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map';

const nodes: NodeData[] = [
  { id: 'a', x: 0, y: 0, width: 120, height: 60, label: 'Hello' },
  { id: 'b', x: 200, y: 100, width: 160, height: 80, label: 'World' },
];

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <InfiniteMap nodes={nodes} />
    </div>
  );
}
```

### With editor plugins

Combine with [`@qiuyulc/infinite-map-editor`](https://www.npmjs.com/package/@qiuyulc/infinite-map-editor):

```tsx
import { useState, useMemo } from 'react';
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map';
import { createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map-editor';

export default function EditorApp() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const plugins = useMemo(() => createDefaultEditorPluginsWithUI(), []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <InfiniteMap
        nodes={nodes}
        plugins={plugins}
        editMode="controlled"
        onNodesChange={(next) => setNodes(next)}
      />
    </div>
  );
}
```

> **Important**: When using plugins, you must provide `onNodesChange` or `onPatches` as a change outlet with `editMode="controlled"`, otherwise the editor will fall back to read-only mode.

## API Overview

### `<InfiniteMap>` Props

| Prop | Type | Description |
|------|------|-------------|
| `nodes` | `NodeData[]` | Array of nodes to render |
| `plugins` | `InfiniteMapPlugin[]` | Optional plugin array (order = priority) |
| `editMode` | `'auto' \| 'readonly' \| 'controlled'` | Editing mode (default: `'auto'`) |
| `editable` | `boolean` | Shorthand: `false` = readonly, `true` = controlled |
| `onNodesChange` | `(nextNodes: NodeData[], meta: ChangeMeta) => void` | Change outlet (sugar) |
| `onPatches` | `(patches: NodePatch[], meta: ChangeMeta) => void` | Change outlet (advanced) |
| `renderNode` | `(node: NodeData) => ReactNode` | Custom node renderer |
| `renderNodeContent` | `(node: NodeData) => ReactNode` | Custom content inside `DefaultNode` |
| `getDefaultNodeProps` | `(node: NodeData) => { className?, style? }` | Customize `DefaultNode` container |
| `initialCamera` | `Camera` | Initial camera position & zoom |
| `apiRef` | `RefObject<InfiniteMapApi>` | Ref to imperative API |
| `commandConflictPolicy` | `'keep-first' \| 'override' \| 'error'` | Command conflict resolution |
| `hookMode` | `'observe' \| 'intercept'` | Hook execution mode |
| `editorHooks` | `{ onBeforeCommand?, onAfterCommand?, onBeforeApplyPatches?, onAfterApplyPatches? }` | Lifecycle hooks |
| `onEditorError` | `(error: EditorErrorInfo) => void` | Structured error callback |

### `InfiniteMapApi` (via `apiRef`)

```tsx
const apiRef = useRef<InfiniteMapApi | null>(null);

// Save
const doc = apiRef.current?.serializeDoc();
localStorage.setItem('doc', JSON.stringify(doc));

// Load
const raw = localStorage.getItem('doc');
if (raw) apiRef.current?.parseDoc(JSON.parse(raw), { immediate: true });

// Subscribe to events
apiRef.current?.subscribe('selection:change', (ids) => {
  console.log('Selected:', ids);
});

// Get/set selection
apiRef.current?.setSelectionIds(['a', 'b']);
const selected = apiRef.current?.getSelectionIds();

// Get node rect (world coordinates)
const rect = apiRef.current?.getNodeRect('a');
```

## Sub-path Exports

Tree-shakeable deep imports for smaller bundles:

```ts
// UI components and theme
import { DefaultNode, InfiniteMapThemeProvider } from '@qiuyulc/infinite-map/ui';

// Demo helpers (playground / docs only)
import { makeDemoNodes } from '@qiuyulc/infinite-map/demo';

// Individual modules (ESM)
import { createEngineStore } from '@qiuyulc/infinite-map/es/engine';
import { computeLayout } from '@qiuyulc/infinite-map/es/layout/layoutPresets';
```

## Document Schema

```ts
import { serializeDoc, parseDoc, type InfiniteMapDoc } from '@qiuyulc/infinite-map';

// Save
const doc: InfiniteMapDoc = apiRef.current?.serializeDoc();
// {
//   schemaVersion: 1,
//   nodes: [...],
//   camera: { x, y, zoom },
//   ...
// }

// Load (only accepts schemaVersion=1)
apiRef.current?.parseDoc(doc, { immediate: true });
```

> `schemaVersion` is decoupled from the npm package version. Backward-compatible schema fixes happen within the same `schemaVersion` via migrations.

## Theme System

```tsx
import { InfiniteMapThemeProvider, type InfiniteMapTheme } from '@qiuyulc/infinite-map';

const customTheme: InfiniteMapTheme = {
  mapBg: '#1e1e2e',
  nodeBg: '#313244',
  nodeBorder: '#45475a',
  nodeText: '#cdd6f4',
  selectionStroke: '#89b4fa',
};

<InfiniteMapThemeProvider theme={customTheme}>
  <InfiniteMap nodes={nodes} />
</InfiniteMapThemeProvider>
```

Built-in themes are available from the editor package.

## Engine (Advanced)

The rendering layer uses a vanilla store + subscription model for performance:

```ts
import { createEngineStore, useEngineSelector } from '@qiuyulc/infinite-map';

const store = createEngineStore();
store.subscribe((state) => {
  console.log('Camera:', state.camera);
});
```

## Peer Dependencies

- `react` ≥ 18
- `react-dom` ≥ 18

## License

MIT
