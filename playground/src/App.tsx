import { useMemo, useState } from 'react';
import {
  InfiniteMap,
  InfiniteMapThemeProvider,
  computeLayout,
  createDefaultEditorPlugins,
  makeDemoNodes,
  type NodeData,
} from '@qiuyulc/infinite-map';

export default function App() {
  const [themeBase, setThemeBase] = useState<'light' | 'dark'>('light');
  const [backgroundMode, setBackgroundMode] = useState<'dots' | 'grid'>('grid');
  const [rulersEnabled, setRulersEnabled] = useState(true);
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [toolbarEnabled, setToolbarEnabled] = useState(true);
  const [contextMenuEnabled, setContextMenuEnabled] = useState(true);

  const [nodes, setNodes] = useState<NodeData[]>(() => {
    const base = makeDemoNodes(30);
    return computeLayout(base, 'grid', { seed: 1 });
  });

  const plugins = useMemo(() => {
    return createDefaultEditorPlugins({
      rulersEnabled,
      minimapEnabled,
      toolbarEnabled,
      contextMenuEnabled,
      marqueeEnabled: true,
      marqueeRequireShift: false,
    });
  }, [contextMenuEnabled, minimapEnabled, rulersEnabled, toolbarEnabled]);

  return (
    <InfiniteMapThemeProvider base={themeBase}>
      <div style={{ height: '100vh', display: 'flex' }}>
        <aside
          style={{
            width: 280,
            padding: 14,
            borderRight: '1px solid rgba(15,23,42,0.12)',
            background: themeBase === 'dark' ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.78)',
            color: themeBase === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.9)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 10 }}>本地测试面板</div>

          <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span>主题</span>
              <select value={themeBase} onChange={(e) => setThemeBase(e.target.value as any)}>
                <option value="light">亮色</option>
                <option value="dark">暗色</option>
              </select>
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span>背景</span>
              <select value={backgroundMode} onChange={(e) => setBackgroundMode(e.target.value as any)}>
                <option value="grid">网格</option>
                <option value="dots">点阵</option>
              </select>
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span>标尺</span>
              <input type="checkbox" checked={rulersEnabled} onChange={(e) => setRulersEnabled(e.target.checked)} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span>Minimap</span>
              <input type="checkbox" checked={minimapEnabled} onChange={(e) => setMinimapEnabled(e.target.checked)} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span>工具栏</span>
              <input type="checkbox" checked={toolbarEnabled} onChange={(e) => setToolbarEnabled(e.target.checked)} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span>右键菜单</span>
              <input
                type="checkbox"
                checked={contextMenuEnabled}
                onChange={(e) => setContextMenuEnabled(e.target.checked)}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                const base = makeDemoNodes(30);
                setNodes(computeLayout(base, 'random', { seed: Math.floor(Math.random() * 10000) }));
              }}
            >
              随机重排
            </button>
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          <InfiniteMap
            nodes={nodes}
            onNodesChange={(next) => setNodes(next)}
            plugins={plugins}
            themeBase={themeBase}
            backgroundMode={backgroundMode}
            gridSpacing="auto"
            dotSpacing="auto"
          />
        </main>
      </div>
    </InfiniteMapThemeProvider>
  );
}
