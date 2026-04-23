import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  composePlugins,
  InfiniteMap,
  computeLayout,
  type NodeData,
} from '@qiuyulc/infinite-map';
import { InfiniteMapThemeProvider, createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map/ui';
import { makeDemoNodes } from '@qiuyulc/infinite-map/demo';
import { createHudContributionExamplePlugin } from './plugins/createHudContributionExamplePlugin';

type ResourceStore<T> = {
  get: (id: string) => T | undefined;
  set: (id: string, next: T) => void;
  subscribe: (listener: () => void) => () => void;
};

function createResourceStore<T>(initial: Record<string, T>): ResourceStore<T> {
  const map = new Map<string, T>(Object.entries(initial));
  const listeners = new Set<() => void>();
  return {
    get: (id) => map.get(id),
    set: (id, next) => {
      map.set(id, next);
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function ChartLikeNode({ store, nodeId }: { store: ResourceStore<number>; nodeId: string }) {
  // 外置数据订阅：只要 store 里对应 id 的数据变化，组件就会更新
  const value = useSyncExternalStore(store.subscribe, () => store.get(nodeId) ?? 0);

  // 模拟“图表实例只初始化一次”（避免频繁重建）
  const mountedAt = useRef(Date.now());

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 700 }}>图表节点（示例）</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>nodeId: {nodeId}</div>
      <div style={{ fontSize: 12, opacity: 0.75 }}>mountedAt: {mountedAt.current}</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            height: 14,
            width: Math.max(6, Math.min(240, value * 6)),
            background: 'linear-gradient(90deg, rgba(56,189,248,0.9), rgba(99,102,241,0.9))',
            borderRadius: 999,
          }}
        />
        <div style={{ fontSize: 12 }}>value: {value}</div>
      </div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        说明：这个 value 不存在 nodes 里，而是存在外部 store；更新 store 就能更新节点内容。
      </div>
    </div>
  );
}

export default function App() {
  const [themeBase, setThemeBase] = useState<'light' | 'dark'>('light');
  const [backgroundMode, setBackgroundMode] = useState<'dots' | 'grid'>('grid');
  const [rulersEnabled, setRulersEnabled] = useState(true);
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [zoomDockEnabled, setZoomDockEnabled] = useState(true);
  const [toolbarEnabled, setToolbarEnabled] = useState(true);
  const [contextMenuEnabled, setContextMenuEnabled] = useState(true);
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(true);
  const [keepAliveEnabled, setKeepAliveEnabled] = useState(true);

  const [nodes, setNodes] = useState<NodeData[]>(() => {
    const base = makeDemoNodes(30);
    const laid = computeLayout(base, 'grid', { seed: 1 });
    // 将前 3 个节点作为 “图表节点”（重组件节点示例）
    return laid.map((n: NodeData, i: number) => (i < 3 ? { ...n, label: `Chart ${i}`, color: '#60a5fa' } : n));
  });

  const chartNodeIds = useMemo(() => nodes.slice(0, 3).map((n: NodeData) => n.id), [nodes]);
  const chartNodeIdSet = useMemo(() => new Set(chartNodeIds), [chartNodeIds]);

  // 外置数据仓库（示例）：key=dataRefId, value=number
  const chartStore = useMemo(() => {
    const initial: Record<string, number> = {};
    // 初始值按 nodeId 存（模拟“把大数据外置到仓库”，nodes 里只保留定位信息）
    // 注意：这里用 placeholder，后面第一次渲染会根据真实 nodeId 写入
    for (let i = 0; i < 3; i++) initial[`placeholder-${i}`] = i + 10;
    return createResourceStore(initial);
  }, []);

  const plugins = useMemo(() => {
    return composePlugins([
      ...createDefaultEditorPluginsWithUI({
        rulersEnabled,
        minimapEnabled,
        zoomDockEnabled,
        toolbarEnabled,
        contextMenuEnabled,
        marqueeEnabled: true,
        marqueeRequireShift: false,
      }),
      // 演示：插件如何通过 registry 给 toolbar / 右键菜单贡献 item
      createHudContributionExamplePlugin(),
    ]);
  }, [contextMenuEnabled, minimapEnabled, rulersEnabled, toolbarEnabled, zoomDockEnabled]);

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
              <span>缩放条</span>
              <input type="checkbox" checked={zoomDockEnabled} onChange={(e) => setZoomDockEnabled(e.target.checked)} />
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
            <label style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span>虚拟化</span>
              <input type="checkbox" checked={virtualizationEnabled} onChange={(e) => setVirtualizationEnabled(e.target.checked)} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <span>keepAlive(图表)</span>
              <input type="checkbox" checked={keepAliveEnabled} onChange={(e) => setKeepAliveEnabled(e.target.checked)} />
            </label>

            <button
              type="button"
              onClick={() => {
                // 更新外置数据：只会影响对应 dataRefId 的节点内容
                const id = chartNodeIds[0];
                if (!id) return;
                const next = (chartStore.get(id) ?? 0) + 5;
                chartStore.set(id, next);
              }}
            >
              更新第一个图表节点数据
            </button>

            <button
              type="button"
              onClick={() => {
                const base = makeDemoNodes(30);
                const laid = computeLayout(base, 'random', { seed: Math.floor(Math.random() * 10000) });
                setNodes(laid.map((n, i) => (i < 3 ? { ...n, label: `Chart ${i}`, color: '#60a5fa' } : n)));
              }}
            >
              随机重排
            </button>
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          <InfiniteMap
            nodes={nodes}
            onNodesChange={(next: NodeData[]) => setNodes(next)}
            plugins={plugins}
            themeBase={themeBase}
            backgroundMode={backgroundMode}
            gridSpacing="auto"
            dotSpacing="auto"
            virtualization={{
              enabled: virtualizationEnabled,
              // 图表节点：即使被虚拟化裁掉，也不卸载（避免图表重建）
              keepAlive: keepAliveEnabled ? (n: NodeData) => chartNodeIdSet.has(n.id) : undefined,
            }}
            renderNodeContent={(n: NodeData) => {
              if (!chartNodeIdSet.has(n.id)) return null;
              // 初始化外置 store 的 key（首次渲染时把 placeholder 替换为真实 nodeId）
              if (chartStore.get(n.id) == null) chartStore.set(n.id, 10);
              return <ChartLikeNode store={chartStore} nodeId={n.id} />;
            }}
          />
        </main>
      </div>
    </InfiniteMapThemeProvider>
  );
}
