# @qiuyulc/infinite-map-editor

Editor plugins & UI kit for [`@qiuyulc/infinite-map`](https://www.npmjs.com/package/@qiuyulc/infinite-map). Batteries-included editing experience: selection, drag, resize, rotate, history, minimap, toolbar, rulers, clipboard, and more.

## Features

- **30+ built-in plugins** — selection, drag, resize, rotate, marquee, history, clipboard, grouping, z-index, lock/hide, snap guides, alignment, nudge, keyboard shortcuts, export PNG, hover highlight, drop-to-create, and more
- **HUD/UI overlays** — toolbar, context menu, minimap, rulers, zoom dock
- **`composePlugins()`** — automatic dependency resolution via `requires`/`provides` and topological sort
- **Two assembly presets**:
  - `createDefaultEditorPlugins(opts)` — core editing plugins only (no UI)
  - `createDefaultEditorPluginsWithUI(opts)` — core + HUD/UI plugins with per-plugin enable/disable
- **Plugin contract** — follows Scheme C input pipeline from `@qiuyulc/infinite-map`
- **Tree-shakeable** — import individual plugins via deep imports
- **TypeScript-first** — full type exports for all plugin options

## Installation

```bash
npm install @qiuyulc/infinite-map-editor @qiuyulc/infinite-map
# or
pnpm add @qiuyulc/infinite-map-editor @qiuyulc/infinite-map
```

> Requires `@qiuyulc/infinite-map`, `react`, and `react-dom` ≥ 18 as peer dependencies.

## Quick Start

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

## Configuration

### Core-only plugins (no HUD)

```ts
import { createDefaultEditorPlugins } from '@qiuyulc/infinite-map-editor';

const plugins = createDefaultEditorPlugins({
  // Per-plugin options
  selection: { multiSelect: true },
  drag: { constrainToCanvas: false },
  history: { maxUndo: 100 },
  snap: { enabled: true, threshold: 5 },
});
```

### Full UI assembly with per-plugin toggles

```ts
import { createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map-editor';

const plugins = createDefaultEditorPluginsWithUI({
  // Core editing plugins
  selection: { multiSelect: true },
  drag: { constrainToCanvas: false },
  history: { maxUndo: 100 },

  // HUD/UI plugins (default: most are enabled)
  toolbar: { enabled: true, position: 'top' },
  zoomDock: { enabled: true },
  contextMenu: { enabled: true },
  minimap: { enabled: true },
  rulers: { enabled: true },
});
```

## Plugin Catalog

### Core Editing

| Plugin | Description |
|--------|-------------|
| `createSelectionPlugin` | Click-to-select, multi-select, selection rectangle |
| `createDragPlugin` | Drag nodes with constraint options |
| `createResizePlugin` | 8-point resize handles |
| `createRotatePlugin` | Rotation handle (2D) |
| `createRotate3DPlugin` | 3D perspective rotation |
| `createMarqueeSelectPlugin` | Marquee/box selection |
| `createGroupPlugin` | Group/ungroup nodes |
| `createZIndexPlugin` | Bring forward / send backward |
| `createLockHidePlugin` | Lock and hide nodes |
| `createAlignDistributePlugin` | Align and distribute selected nodes |
| `createNudgePlugin` | Arrow key nudge |
| `createSnapGuidesPlugin` | Snap-to-grid and snap-to-object guides |

### History & Clipboard

| Plugin | Description |
|--------|-------------|
| `createHistoryPlugin` | Undo/redo with configurable depth |
| `createClipboardPlugin` | Copy/paste/duplicate with keyboard shortcuts |
| `createShortcutsPlugin` | Keyboard shortcut registry |

### Input & View

| Plugin | Description |
|--------|-------------|
| `createKeyboardStatePlugin` | Track modifier key state (Shift, Ctrl, etc.) |
| `createViewCommandsPlugin` | Zoom in/out, fit-to-screen, reset view |
| `createCommandRunnerPlugin` | Command dispatch and execution |
| `createCoreServicesPlugin` | Runtime services (bus, store, patch engine) |
| `createHoverHighlightPlugin` | Hover highlight overlay |

### Export

| Plugin | Description |
|--------|-------------|
| `createExportPngPlugin` | Export canvas area as PNG |

### HUD / UI Overlays

| Plugin | Description |
|--------|-------------|
| `createToolbarPlugin` | Configurable toolbar |
| `createContextMenuPlugin` | Context menu framework |
| `createDefaultContextMenuPlugin` | Default right-click context menu |
| `createMinimapPlugin` | Minimap overlay |
| `createRulersPlugin` | Canvas rulers |
| `createZoomDockPlugin` | Zoom percentage display and controls |
| `createDropToCreatePlugin` | Drag & drop to create nodes |

## composePlugins()

Orchestrate plugins with automatic dependency resolution:

```ts
import { composePlugins } from '@qiuyulc/infinite-map-editor';
import {
  createSelectionPlugin,
  createDragPlugin,
  createHistoryPlugin,
  createToolbarPlugin,
} from '@qiuyulc/infinite-map-editor';

const plugins = composePlugins([
  createHistoryPlugin(),
  createSelectionPlugin(),
  createDragPlugin(),
  createToolbarPlugin(),
]);
```

Each plugin declares `requires` and `provides` — `composePlugins()` topologically sorts and validates the graph, detecting missing dependencies and circular references.

## Custom Plugin Development

Plugins follow the `InfiniteMapPlugin` contract from `@qiuyulc/infinite-map`:

```ts
import type { InfiniteMapPlugin } from '@qiuyulc/infinite-map';

const myPlugin: InfiniteMapPlugin = {
  id: 'my-plugin',
  version: '0.1.0',
  requires: ['core-services'],   // dependencies
  provides: ['my-feature'],       // what this plugin offers
  priority: 100,                  // higher = earlier in pipeline

  // Scheme C input pipeline hooks
  hitTest(ctx, next) { /* ... */ },
  pointerDownProcessors(ctx, next) { /* ... */ },
  gestures(ctx, next) { /* ... */ },

  // Lifecycle
  onSetup(ctx) { /* ... */ },
  onDestroy(ctx) { /* ... */ },

  // Render overlays
  overlay(ctx) { /* return ReactNode */ },
  hud(ctx) { /* return ReactNode */ },
};
```

See the [plugin development guide](https://github.com/qiuyulc/infinite-map) for full details.

## Tree-shakeable Deep Imports

Import individual plugins for smaller bundles:

```ts
// ESM deep imports
import { createDragPlugin } from '@qiuyulc/infinite-map-editor/es/plugins/createDragPlugin';
import { createSelectionPlugin } from '@qiuyulc/infinite-map-editor/es/plugins/createSelectionPlugin';
import { composePlugins } from '@qiuyulc/infinite-map-editor/es/editor/composePlugins';

// CJS deep imports
import { createDragPlugin } from '@qiuyulc/infinite-map-editor/lib/plugins/createDragPlugin';
```

## Types Exported

All plugin option types are exported for TypeScript users:

```ts
import type {
  DragPluginOptions,
  SelectionPluginOptions,
  HistoryPluginOptions,
  SnapConfig,
  SnapGuidesPluginOptions,
  ToolbarItem,
  ToolbarPluginOptions,
  ContextMenuItem,
  DefaultContextMenuOptions,
  MinimapPluginOptions,
  RulersPluginOptions,
  ZoomDockPluginOptions,
  ClipboardPluginOptions,
  ShortcutsPluginOptions,
  MarqueeSelectPluginOptions,
  DropToCreatePluginOptions,
  DefaultEditorOptions,
  DefaultEditorWithUIOptions,
} from '@qiuyulc/infinite-map-editor';
```

## Peer Dependencies

- `@qiuyulc/infinite-map` ≥ 0.0.1
- `react` ≥ 18
- `react-dom` ≥ 18

## License

MIT
