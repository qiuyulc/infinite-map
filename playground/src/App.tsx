import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  InfiniteMap,
  applyPatchesToNodes,
  computeLayout,
  type InfiniteMapApi,
  type NodePatch,
  type ChangeMeta,
  type NodeData,
} from '@qiuyulc/infinite-map';
import { composePlugins, InfiniteMapThemeProvider, createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map-editor';
import { makeDemoNodes } from '@qiuyulc/infinite-map/demo';
import { createHudContributionExamplePlugin } from './plugins/createHudContributionExamplePlugin';
import { createDropToCreatePlugin } from '@qiuyulc/infinite-map-editor';
import './App.css';

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
  const [backgroundMode, setBackgroundMode] = useState<'none' | 'dots' | 'grid'>('grid');
  const [panEnabled, setPanEnabled] = useState(true);
  const [rulersEnabled, setRulersEnabled] = useState(true);
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [zoomDockEnabled, setZoomDockEnabled] = useState(true);
  const [toolbarEnabled, setToolbarEnabled] = useState(true);
  const [contextMenuEnabled, setContextMenuEnabled] = useState(true);
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(false);
  const [keepAliveEnabled, setKeepAliveEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [guidesEnabled, setGuidesEnabled] = useState(true);
  const [dropToCreateEnabled, setDropToCreateEnabled] = useState(true);

  // 编辑模式（用于验证 editable/editMode 与变更出口）
  const [editMode, setEditMode] = useState<'unset' | 'auto' | 'readonly' | 'controlled'>('auto');
  const [editable, setEditable] = useState<'unset' | 'true' | 'false'>('unset');
  const [changeOutput, setChangeOutput] = useState<'nodes' | 'patches' | 'both' | 'none'>('nodes');

  const [docText, setDocText] = useState<string>('');
  const [lastPatchesInfo, setLastPatchesInfo] = useState<{ count: number; meta: ChangeMeta } | null>(null);

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
    const genId2 = () => `drp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    return composePlugins([
      ...createDefaultEditorPluginsWithUI({
        rulers: { enabled: rulersEnabled },
        minimap: { enabled: minimapEnabled },
        // Playground 里用侧边栏做“吸附/辅助线”两个开关，避免与 ZoomDock 重复
        zoomDock: { enabled: zoomDockEnabled, },
        toolbar: { enabled: toolbarEnabled },
        contextMenu: { enabled: contextMenuEnabled },
        marquee: { enabled: true, requireShift: false },
        snap: { enabled: snapEnabled, guidesEnabled },
      }),
      // 演示：插件如何通过 registry 给 toolbar / 右键菜单贡献 item
      createHudContributionExamplePlugin(),
      ...(dropToCreateEnabled
        ? [
          createDropToCreatePlugin({
            resolveType: (e: DragEvent) => e.dataTransfer?.getData('application/x-node-type') ?? null,
            createNode: (type: string, pos: { x: number; y: number }) => ({
              id: genId2(),
              x: pos.x - 70,
              y: pos.y - 35,
              width: 140,
              height: 70,
              label: type,
            }),
          }),
        ]
        : []),
    ]);
  }, [contextMenuEnabled, guidesEnabled, minimapEnabled, rulersEnabled, snapEnabled, toolbarEnabled, zoomDockEnabled, dropToCreateEnabled]);

  const apiRef = useRef<InfiniteMapApi | null>(null);

  const resolvedEditModeText = useMemo(() => {
    const em = editMode === 'unset' ? undefined : editMode;
    const ed = editable === 'unset' ? undefined : editable === 'true';
    if (em) return em;
    if (ed === false) return 'readonly';
    if (ed === true) return 'controlled';
    return 'auto';
  }, [editMode, editable]);

  const onNodesChange =
    changeOutput === 'nodes' || changeOutput === 'both'
      ? (next: NodeData[]) => {
        console.log('onNodesChange', next);
        setNodes(next);
      }
      : undefined;

  const onPatches =
    changeOutput === 'patches' || changeOutput === 'both'
      ? (patches: NodePatch[], meta: ChangeMeta) => {
        setLastPatchesInfo({ count: patches.length, meta });
        setNodes((prev) => applyPatchesToNodes(prev, patches));
      }
      : undefined;

  return (
    <InfiniteMapThemeProvider base={themeBase}>
      <div className="pg-shell" data-theme={themeBase}>
        <aside className="pg-sidebar">
          <div className="pg-title">
            <div className="pg-title__main">本地测试面板</div>
            <div className="pg-title__sub">Playground controls</div>
          </div>

          <div className="pg-section">
            <div className="pg-section__title">外观</div>
            <label className="pg-row">
              <span className="pg-row__label">主题</span>
              <select className="pg-control" value={themeBase} onChange={(e) => setThemeBase(e.target.value as any)}>
                <option value="light">亮色</option>
                <option value="dark">暗色</option>
              </select>
            </label>

            <label className="pg-row">
              <span className="pg-row__label">背景</span>
              <select className="pg-control" value={backgroundMode} onChange={(e) => setBackgroundMode(e.target.value as any)}>
                <option value="none">无</option>
                <option value="grid">网格</option>
                <option value="dots">点阵</option>
              </select>
            </label>

            <label className="pg-row">
              <span className="pg-row__label">画布可拖动</span>
              <input className="pg-check" type="checkbox" checked={panEnabled} onChange={(e) => setPanEnabled(e.target.checked)} />
            </label>
          </div>

          <div className="pg-section">
            <div className="pg-section__title">HUD / 功能</div>
            <label className="pg-row">
              <span className="pg-row__label">标尺</span>
              <input className="pg-check" type="checkbox" checked={rulersEnabled} onChange={(e) => setRulersEnabled(e.target.checked)} />
            </label>
            <label className="pg-row">
              <span className="pg-row__label">Minimap</span>
              <input className="pg-check" type="checkbox" checked={minimapEnabled} onChange={(e) => setMinimapEnabled(e.target.checked)} />
            </label>
            <label className="pg-row">
              <span className="pg-row__label">缩放条</span>
              <input className="pg-check" type="checkbox" checked={zoomDockEnabled} onChange={(e) => setZoomDockEnabled(e.target.checked)} />
            </label>
            <label className="pg-row">
              <span className="pg-row__label">工具栏</span>
              <input className="pg-check" type="checkbox" checked={toolbarEnabled} onChange={(e) => setToolbarEnabled(e.target.checked)} />
            </label>
            <label className="pg-row">
              <span className="pg-row__label">右键菜单</span>
              <input className="pg-check" type="checkbox" checked={contextMenuEnabled} onChange={(e) => setContextMenuEnabled(e.target.checked)} />
            </label>
            <label className="pg-row">
              <span className="pg-row__label">吸附</span>
              <input className="pg-check" type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
            </label>
            <label className="pg-row">
              <span className="pg-row__label">辅助线</span>
              <input className="pg-check" type="checkbox" checked={guidesEnabled} onChange={(e) => setGuidesEnabled(e.target.checked)} />
            </label>
            <label className="pg-row">
              <span className="pg-row__label">虚拟化</span>
              <input className="pg-check" type="checkbox" checked={virtualizationEnabled} onChange={(e) => setVirtualizationEnabled(e.target.checked)} />
            </label>
            <label className="pg-row">
              <span className="pg-row__label">keepAlive(图表)</span>
              <input className="pg-check" type="checkbox" checked={keepAliveEnabled} onChange={(e) => setKeepAliveEnabled(e.target.checked)} />
            </label>
            <label className="pg-row">
              <span className="pg-row__label">拖拽添加节点</span>
              <input className="pg-check" type="checkbox" checked={dropToCreateEnabled} onChange={(e) => setDropToCreateEnabled(e.target.checked)} />
            </label>
          </div>

          <div className="pg-section">
            <div className="pg-section__title">拖拽节点类型</div>
            <div className="pg-hint" style={{ marginBottom: 8 }}>
              拖拽下面的卡片到画布上可创建新节点（需开启"拖拽添加节点"）
            </div>
            {[
              { type: '矩形', emoji: '▬' },
              { type: '圆形', emoji: '●' },
              { type: '图片', emoji: '🖼' },
            ].map(({ type, emoji }) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-node-type', type)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                style={{
                  padding: '8px 12px',
                  marginBottom: 6,
                  background: 'var(--im-node-bg, rgba(255,255,255,0.8))',
                  border: '1px solid var(--im-toolbar-border, rgba(0,0,0,0.12))',
                  borderRadius: 6,
                  cursor: 'grab',
                  fontSize: 13,
                  userSelect: 'none',
                }}
              >
                {emoji} {type}
              </div>
            ))}
          </div>

          <div className="pg-section">
            <div className="pg-section__title">编辑模式</div>
            <label className="pg-row">
              <span className="pg-row__label">editMode</span>
              <select className="pg-control" value={editMode} onChange={(e) => setEditMode(e.target.value as any)}>
                <option value="unset">不传</option>
                <option value="auto">auto</option>
                <option value="readonly">readonly</option>
                <option value="controlled">controlled</option>
              </select>
            </label>
            <label className="pg-row">
              <span className="pg-row__label">editable</span>
              <select className="pg-control" value={editable} onChange={(e) => setEditable(e.target.value as any)}>
                <option value="unset">不传</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </label>
            <div className="pg-hint">resolved: {resolvedEditModeText}</div>

            <label className="pg-row">
              <span className="pg-row__label">变更出口</span>
              <select className="pg-control" value={changeOutput} onChange={(e) => setChangeOutput(e.target.value as any)}>
                <option value="nodes">onNodesChange</option>
                <option value="patches">onPatches</option>
                <option value="both">两者都要</option>
                <option value="none">都不传</option>
              </select>
            </label>
            <div className={lastPatchesInfo ? 'pg-hint' : 'pg-hint pg-hint--muted'}>
              last patches:{' '}
              {lastPatchesInfo
                ? `${lastPatchesInfo.count}（source: ${String((lastPatchesInfo.meta as any).source ?? '-')}, phase: ${String(
                  (lastPatchesInfo.meta as any).phase ?? '-'
                )}）`
                : '-'}
            </div>
          </div>

          <div className="pg-section">
            <div className="pg-section__title">Doc 导入/导出</div>
            <div className="pg-actions">
              <button
                className="pg-btn"
                type="button"
                onClick={() => {
                  const doc = apiRef.current?.serializeDoc();
                  if (!doc) return;
                  setDocText(JSON.stringify(doc, null, 2));
                }}
              >
                导出到文本框
              </button>
              <button
                className="pg-btn"
                type="button"
                onClick={() => {
                  if (!apiRef.current) return;
                  try {
                    const parsed = JSON.parse(docText);
                    apiRef.current.parseDoc(parsed, { immediate: true });
                  } catch (err) {
                    console.error(err);
                    alert('导入失败：JSON 解析错误（详情见 console）');
                  }
                }}
              >
                从文本框导入
              </button>
            </div>
            <textarea
              className="pg-textarea"
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
              rows={6}
              placeholder="导出的 doc JSON 会出现在这里；也可以粘贴 JSON 后点击导入。"
            />
          </div>

          <div className="pg-section">
            <div className="pg-section__title">操作</div>
            <div className="pg-actions">
              <button
                className="pg-btn"
                type="button"
                onClick={() => {
                  const id = chartNodeIds[0];
                  if (!id) return;
                  const next = (chartStore.get(id) ?? 0) + 5;
                  chartStore.set(id, next);
                }}
              >
                更新第一个图表节点数据
              </button>
              <button
                className="pg-btn"
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
          </div>
        </aside>

        <main className="pg-main">
          <InfiniteMap
            nodes={nodes}
            onNodesChange={onNodesChange}
            onPatches={onPatches}
            plugins={plugins}
            themeBase={themeBase}
            panEnabled={panEnabled}
            backgroundMode={backgroundMode}
            gridSpacing="auto"
            dotSpacing="auto"
            apiRef={apiRef}
            editMode={editMode === 'unset' ? undefined : editMode}
            editable={editable === 'unset' ? undefined : editable === 'true'}
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
