import React, { useMemo, useState } from 'react';
import { InfiniteMap } from '@qiuyulc/infinite-map';
import {
  composePlugins,
  createDefaultEditorPluginsWithUI,
} from "@qiuyulc/infinite-map-editor";

export function HomeDemo() {
  const [nodes, setNodes] = useState([
    { id: 'a', x: -140, y: -60, width: 160, height: 80, label: 'Hello 👋' },
    { id: 'b', x: 80, y: 40, width: 160, height: 80, label: 'World 🌍', color: '#4f46e5' },
    { id: 'c', x: -40, y: 180, width: 200, height: 80, label: 'Infinite Map', color: '#059669' },
  ]);
  const onNodesChange = (data: any) => {
    setNodes(data);
  }

  const plugins = useMemo(() => {
    return composePlugins([
      ...createDefaultEditorPluginsWithUI({
        rulers: { enabled: true },
        minimap: { enabled: true },
        zoomDock: { enabled: true },
        drag: {}
      }),
    ]);
  }, []);
  return (
    <div style={{ height: 420, border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 8, overflow: 'hidden' }}>
      <InfiniteMap
        onNodesChange={onNodesChange}
        nodes={nodes}
        backgroundMode="dots"
        // gridSpacing="auto"
        // dotSpacing="auto"
        dotAlpha={1}
        plugins={plugins}
        initialCamera={{ x: -340, y: -140, zoom: 0.85 }}
      />
    </div>
  );
}
export default HomeDemo;
