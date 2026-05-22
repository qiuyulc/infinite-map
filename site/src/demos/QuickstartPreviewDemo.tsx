import React from 'react';
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map';

export function QuickstartPreviewDemo() {
  const nodes: NodeData[] = [
    { id: '1', x: -100, y: -50, width: 200, height: 120, label: 'Hello' },
  ];
  return (
    <div style={{ height: 380, border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 8, overflow: 'hidden' }}>
      <InfiniteMap
        nodes={nodes}
        backgroundMode="dots"
        initialCamera={{ x: 0, y: 0, zoom: 0.85 }}
      />
    </div>
  );
}
export default QuickstartPreviewDemo;
