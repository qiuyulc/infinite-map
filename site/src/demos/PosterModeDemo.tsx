import { useState } from 'react';
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map';

export function PosterModeDemo() {
    const CANVAS_W = 760;
    const CANVAS_H = 600;

    const [nodes, setNodes] = useState<NodeData[]>([
        { id: 'bg', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, locked: true, label: '', color: '#f8f9fa' },
        { id: 'title', x: 30, y: 20, width: 200, height: 40, label: '标题文字' },
        { id: 'img', x: 30, y: 80, width: 300, height: 180, label: '图片区域', color: '#e0e7ff' },
    ])

    return (
        <div style={{ height: 460, border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: 8, overflow: 'hidden' }}>
            <InfiniteMap
                nodes={nodes}
                origin="top-left"
                panEnabled={false}
                zoomSpeed={0}
                backgroundMode="dots"
                onReady={(api) => {
                    console.log('camera:', api.getCamera());
                    console.log('topLeft:', api.getContainerTopLeft());
                }}
            />
        </div>
    );
}
export default PosterModeDemo;
