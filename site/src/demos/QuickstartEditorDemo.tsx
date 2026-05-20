import React, { useState, useMemo } from 'react';
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map';
import { createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map-editor';

export function QuickstartEditorDemo() {
  const [nodes, setNodes] = useState<NodeData[]>([
    { id: '1', x: -120, y: -60, width: 180, height: 100, label: '拖我试试' },
    { id: '2', x: 100, y: 40, width: 180, height: 100, label: 'World', color: '#4f46e5' },
  ]);
  const plugins = useMemo(() => createDefaultEditorPluginsWithUI(), []);

  return (
    <div style={{ height: 460, border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 8, overflow: 'hidden' }}>
      <InfiniteMap
        nodes={nodes}
        plugins={plugins}
        onNodesChange={setNodes}
        backgroundMode="dots"
        initialCamera={{ x: -280, y: -180, zoom: 0.8 }}
      />
    </div>
  );
}
export default QuickstartEditorDemo;
