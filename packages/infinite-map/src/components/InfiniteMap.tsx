import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type MutableRefObject,
} from 'react';
import { rectIntersects, type Camera, type NodeData, type Rect } from '../core/types';
import { buildSpatialIndex } from '../core/spatialIndex';
import { EngineBackgroundLayer } from './EngineBackgroundLayer';
import { RenderPluginOverlays } from './RenderPluginOverlays';
import { EngineDomNodesLayer } from './EngineDomNodesLayer';
import { createEngineStore } from '../engine';
import type { InfiniteMapDoc } from '../editor/document';
import type { EventKey, EventMap } from '../editor/types';
import { STORE_KEYS } from '../editor/keys';
import type { InfiniteMapTheme } from '../theme';
import '../theme-base.css';
// pan 已纳入 Scheme C gestures（不再使用独立 hook）
import { useViewportSize } from '../hooks/useViewportSize';
import { useCommandRegistry } from '../hooks/useCommandRegistry';
import { usePatchEngine } from '../hooks/usePatchEngine';
import { usePluginInputDispatch } from '../hooks/usePluginInputDispatch';
import { useRunCommandWithHooks } from '../hooks/useRunCommandWithHooks';
import { useAttachApiRef } from '../hooks/useAttachApiRef';
import { useMapRuntimeEffects } from '../hooks/useMapRuntimeEffects';
import { usePluginLifecycle } from '../hooks/usePluginLifecycle';
import { useMapContext } from '../hooks/useMapContext';
import { useCoordinateTransforms } from '../hooks/useCoordinateTransforms';
import { useSyncedRef } from '../hooks/useSyncedRef';
import { useOriginSync } from '../hooks/useOriginSync';
import { useLifecycleCallbacks } from '../hooks/useLifecycleCallbacks';
import { usePanKeepAlive } from '../hooks/usePanKeepAlive';
import { useInjectedThemeVars } from '../hooks/useInjectedThemeVars';
import type { ChangeMeta, Command, EditorErrorInfo, HitTestTarget, InfiniteMapPlugin, MapContext, NodePatch } from '../editor/types';
import { createEventBus, createStore } from '../editor/runtime';

export type InfiniteMapProps = {
  nodes: NodeData[];

  /**
   * 可选：插件系统（默认不传=纯预览）
   * - 插件数组顺序=优先级
   */
  plugins?: InfiniteMapPlugin[];

  /**
   * 是否允许编辑（语法糖）
   * - false：强制只读（阻止 applyPatches）
   * - true：允许编辑（等价于 editMode='controlled'）
   */
  editable?: boolean;
  /**
   * 编辑模式（推荐：显式设置，避免“看起来编辑无效”的隐式依赖）
   * - auto（默认，向后兼容）：允许插件产生 patches；若未提供 onNodesChange/onPatches，则仅在 DEV 下 warn
   * - readonly：强制只读（丢弃所有 patches）
   * - controlled：受控编辑，必须提供 onNodesChange 或 onPatches 作为变更出口（否则在 DEV 下抛错）
   */
  editMode?: 'auto' | 'readonly' | 'controlled';

  /**
   * 变更出口（糖）：返回 nextNodes（内部由 patches 应用得到）
   * - 不传则不允许编辑类插件生效（建议）
   */
  onNodesChange?: (nextNodes: NodeData[], meta: ChangeMeta) => void;

  /**
   * 变更出口（高级）：返回 patches（适合协作/历史/性能优化）
   */
  onPatches?: (patches: NodePatch[], meta: ChangeMeta) => void;

  /** 可选：自定义节点渲染（返回一个绝对定位的内容即可） */
  renderNode?: (node: NodeData) => ReactNode;
  /**
   * 自定义节点“内容区域”（推荐）
   * - 仍然使用内置节点容器（DefaultNode 的外观/阴影/圆角等）
   * - 你的内容会被渲染在 DefaultNode 内部
   */
  renderNodeContent?: (node: NodeData) => ReactNode;
  /**
   * 自定义内置节点容器的 className/style（推荐）
   * - 只作用于 DefaultNode（不会影响定位/旋转等外层 wrapper）
   */
  getDefaultNodeProps?: (node: NodeData) => { className?: string; style?: CSSProperties };
  /**
   * 是否显示 DefaultNode 内置的 meta（例如坐标）
   * - 默认 false：组件库更干净
   */
  defaultNodeShowMeta?: boolean;
  /** 可选：节点拖动时回调（世界坐标） */
  onNodeDrag?: (id: string, pos: { x: number; y: number }, phase: 'move' | 'end') => void;
  /** 初始相机 */
  initialCamera?: Camera;

  /**
   * 坐标原点模式
   * - 'center'（默认）：原点在容器中心
   * - 'top-left'：原点在容器左上角，viewport resize 自动跟随
   */
  origin?: 'center' | 'top-left';

  /**
   * 地图首次就绪回调
   * - viewport 取得有效尺寸后触发（仅一次）
   * - 参数提供相机相关方法，不依赖插件
   */
  onReady?: (api: {
    getCamera: () => Camera;
    setCamera: (next: Camera) => void;
    moveOriginToTopLeft: () => void;
    getContainerTopLeft: () => { x: number; y: number };
  }) => void;

  /** 相机变化回调（x/y/zoom 变化时触发） */
  onCameraChange?: (camera: Camera) => void;
  /** 视口尺寸变化回调 */
  onViewportResize?: (viewport: { w: number; h: number }) => void;
  /** 组件销毁回调 */
  onDestroy?: () => void;

  // 说明：InfiniteMap 已切换为 engine-only 实现（不再提供旧的 React 相机驱动渲染路径）。

  /**
   * 命令冲突策略（当多个 plugin 提供同名 commandId）
   * - keep-first：保留第一个（默认，兼容现状）
   * - override：后者覆盖前者（更适合开放生态）
   * - error：直接抛错（开发时强约束）
   */
  commandConflictPolicy?: 'keep-first' | 'override' | 'error';
  /**
   * 命令冲突时是否打印告警（仅在 DEV 下生效）
   */
  warnOnCommandConflict?: boolean;

  /**
   * hooks 模式
   * - observe（默认）：hooks 只观察/记录，不影响执行流程
   * - intercept：允许 onBeforeCommand 返回 false 阻止执行；允许 onBeforeApplyPatches 返回 patches 覆盖
   */
  hookMode?: 'observe' | 'intercept';
  editorHooks?: {
    onBeforeCommand?: (id: string, info: { source: 'keyboard' | 'toolbar' | 'menu' | 'api'; payload?: unknown }) => boolean | void;
    onAfterCommand?: (id: string, info: { ok: boolean; source: 'keyboard' | 'toolbar' | 'menu' | 'api'; payload?: unknown }) => void;
    onBeforeApplyPatches?: (patches: NodePatch[], meta: ChangeMeta) => NodePatch[] | void;
    onAfterApplyPatches?: (patches: NodePatch[], meta: ChangeMeta) => void;
  };

  /**
   * 全局错误上报（用于 hooks / command 执行等异常的收集）
   */
  onEditorError?: (err: unknown, info: EditorErrorInfo) => void;

  /** 点阵间距（世界坐标单位），可设为 'auto' 与标尺/网格同源 */
  dotSpacing?: number | 'auto';
  /** 点半径（屏幕像素，最终会随 zoom 变化不大） */
  dotRadiusPx?: number;
  /** 点基础透明度 */
  dotAlpha?: number;

  /**
   * 背景样式
   * - dots：点阵（默认）
   * - grid：网格线
   * - none：无背景（用于性能排查/纯内容渲染）
   */
  backgroundMode?: 'dots' | 'grid' | 'none';
  /** 网格间距（世界坐标单位），默认跟随 dotSpacing */
  gridSpacing?: number | 'auto';
  /** 网格线基础透明度 */
  gridAlpha?: number;

  /** 缩放 */
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number; // 建议 0.001~0.002
  /** 触摸板双指捏合（pinch）的缩放强度倍率（>1 更敏感，<1 更保守） */
  pinchZoomFactor?: number;

  /**
   * 虚拟化配置（推荐）
   * - enabled=false：关闭虚拟化，渲染全部节点
   * - overscanPx：视口四周额外渲染的“屏幕像素”（会自动换算成世界单位）
   * - keepAlive：对“重组件节点”（图表/视频/富文本）返回 true，避免进出视口时被卸载重建
   */
  virtualization?: {
    enabled?: boolean;
    overscanPx?: number;
    keepAlive?: (node: NodeData) => boolean;
    /**
     * pan 期间“离场节点不卸载”，避免虚拟化进出边界导致闪烁
     * - true：启用默认策略（推荐）
     * - false：禁用
     * - {maxNodes}：限制 pan 期间最多 keepAlive 的节点数量（避免长距离拖动导致集合无限增长）
     */
    panKeepAlive?: boolean | { maxNodes?: number };
  };

  /**
   * 调试开关（默认关闭）
   * - 打开后会写入一些调试信息到 store（debug:*），并在必要时 console.warn/console.debug
   */
  debug?: boolean;

  /**
   * 节点虚拟化 overscan（兼容旧字段）
   * - 建议改用 virtualization.overscanPx
   */
  overscanPx?: number;
  /** 虚拟化用的空间索引格子大小（世界单位） */
  cellSize?: number;

  // minimap 的尺寸/刷新等配置已迁移到 @qiuyulc/infinite-map-editor 的 minimap plugin options

  /**
   * 主题（组件库风格）
   * - InfiniteMap 内部只消费 CSS vars（--im-*）
   * - 你可以用 InfiniteMapThemeProvider 包裹，或直接传 theme/themeBase 让 InfiniteMap 在容器上注入 vars
   */
  themeBase?: 'light' | 'dark';
  theme?: Partial<InfiniteMapTheme>;

  /**
   * 是否允许拖动平移画布（view pan）
   * - false：禁止空白拖拽平移 & Space 平移模式（适合做“锁定视图”）
   * - 默认 true
   */
  panEnabled?: boolean;

  /**
   * 可选：对外暴露 editor API（用于自定义工具栏）
   * - 只在 plugins 存在时有效
   */
  apiRef?: MutableRefObject<InfiniteMapApi | null>;
};

export type InfiniteMapApi = {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /**
   * 订阅 history 状态变化（用于工具栏按钮 enable/disable）
   */
  subscribeHistory: (listener: () => void) => () => void;
  /**
   * 执行一个命令（用于自定义工具栏/菜单/快捷键面板）
   */
  runCommand: (id: string, payload?: { source?: 'api' | 'toolbar' | 'menu' | 'keyboard';[k: string]: unknown }) => boolean;
  /**
   * 获取当前已注册的命令列表（由 plugins.commands 汇总）
   */
  getCommands: () => Command[];
  /**
   * 获取单个命令
   */
  getCommand: (id: string) => Command | undefined;
  /**
   * 订阅事件总线（selection/camera/history/patches/hover 等）
   */
  subscribe: <K extends EventKey>(type: K, handler: (payload: EventMap[K]) => void) => () => void;
  /**
   * 获取当前选中的节点 id 列表
   */
  getSelectionIds: () => string[];
  /**
   * 设置 selection（需要启用 selection service）
   */
  setSelectionIds: (ids: string[]) => void;
  /**
   * 订阅 selection 状态变化（用于 delete 按钮 enable/disable 等）
   */
  subscribeSelection: (listener: () => void) => () => void;
  /**
   * 获取节点矩形（axis-aligned，world 坐标；用于对齐/分布等）
   */
  getNodeRect: (id: string) => Rect | null;
  /**
   * 获取 selection 的包围盒（axis-aligned，world 坐标）
   */
  getSelectionRect: () => Rect | null;
  /**
   * 获取/设置相机
   */
  getCamera: () => Camera;
  setCamera: (next: Camera, opts?: { immediate?: boolean }) => void;
  subscribeCamera: (listener: (camera: Camera) => void) => () => void;
  /**
   * 获取容器左上角的世界坐标
   */
  getContainerTopLeft: () => { x: number; y: number };
  /**
   * 移动相机，使世界原点(0,0)落在容器左上角
   */
  moveOriginToTopLeft: () => void;
  /**
   * 获取节点（只读快照）
   */
  getNodes: () => NodeData[];

  /**
   * doc 快照（与“文件导入导出”解耦）
   * - serializeDoc：把当前运行时状态序列化为 doc（纯数据）
   * - parseDoc：校验/解析 doc，并用 onNodesChange + setCamera 应用到宿主
   */
  serializeDoc: (meta?: Record<string, unknown>) => InfiniteMapDoc;
  parseDoc: (doc: unknown, opts?: { immediate?: boolean }) => void;
  /**
   * 以可追踪的方式应用 patches（history 会记录逆操作）
   * - 适用场景：外部修改节点字段（包括 data），希望 undo 能还原
   */
  applyPatches: (patches: NodePatch[], meta?: Partial<ChangeMeta>) => void;
  /**
   * 修改节点的 data 字段（糖）
   * - updateNodeData(id, newData)：精确修改指定节点
   * - updateNodeData(newData)：修改当前选中的第一个节点
   */
  updateNodeData: <T = unknown>(idOrData: string | T, data?: T) => void;
};

// -----------------------------------------------------------------------------
// Engine mode（Zustand + 原生双轨 + 非响应式订阅）
// -----------------------------------------------------------------------------

function InfiniteMapEngine(props: InfiniteMapProps) {
  const {
    nodes,
    plugins,
    editable,
    editMode,
    onNodesChange,
    onPatches,
    renderNode,
    renderNodeContent,
    getDefaultNodeProps,
    defaultNodeShowMeta = false,
    onNodeDrag,
    initialCamera = { x: 0, y: 0, zoom: 1 },
    origin = 'center',
    commandConflictPolicy = 'keep-first',
    warnOnCommandConflict = true,
    editorHooks,
    hookMode = 'observe',
    onEditorError,
    dotSpacing = 48,
    dotRadiusPx = 1.35,
    dotAlpha = 0.18,
    backgroundMode = 'dots',
    gridSpacing = 'auto',
    gridAlpha = 0.14,
    minZoom = 0.25,
    maxZoom = 2.5,
    zoomSpeed = 0.0012,
    pinchZoomFactor = 0.6,
    virtualization,
    overscanPx = 900,
    cellSize = 900,
    themeBase,
    theme,
    panEnabled = true,
    apiRef,
    onReady,
    onCameraChange,
    onViewportResize,
    onDestroy,
    debug = false,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportDomRef = useRef<HTMLDivElement | null>(null);

  // engine store（稳定引用）
  const engineStoreRef = useRef<ReturnType<typeof createEngineStore> | null>(null);
  if (!engineStoreRef.current) engineStoreRef.current = createEngineStore(initialCamera);
  const engineStore = engineStoreRef.current;

  // 真相源：cameraRef（高频）
  const cameraRef = useRef<Camera>(initialCamera);

  const { viewport, viewportRef } = useViewportSize(containerRef);
  useOriginSync({ origin, engineStore, viewport, cameraRef });
  useLifecycleCallbacks({
    onReady,
    onCameraChange,
    onViewportResize,
    onDestroy,
    engineStore,
    viewport,
    viewportRef,
    cameraRef,
  });

  // nodes refs：给插件 ctx 读取，在 render 阶段同步确保 overlay/hud 读到最新值
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n] as const)), [nodes]);

  // visibleNodes ref（给插件读取）
  const visibleNodesRef = useRef<NodeData[]>([]);

  // 空间索引（给插件查询）
  const spatialIndex = useMemo(() => buildSpatialIndex(nodes, cellSize), [nodes, cellSize]);
  const spatialIndexRef = useRef(spatialIndex);
  useEffect(() => {
    spatialIndexRef.current = spatialIndex;
  }, [spatialIndex]);

  const { screenToWorld, worldToScreen, rectScreenToWorld, rectWorldToScreen } = useCoordinateTransforms(cameraRef, viewportRef);

  // 插件 bus/store（稳定引用，仍沿用现有插件契约）
  const bus = useMemo(() => createEventBus(), []);
  const store = useMemo(() => createStore(), []);

  const hooksRef = useSyncedRef(editorHooks);
  const hookModeRef = useSyncedRef(hookMode);
  const onEditorErrorRef = useSyncedRef(onEditorError);
  const debugRef = useSyncedRef(debug);
  const onNodesChangeRef = useSyncedRef(onNodesChange);
  const onPatchesRef = useSyncedRef(onPatches);

  const hasChangeSink = Boolean(onNodesChange) || Boolean(onPatches);
  const resolvedEditMode = useMemo<'auto' | 'readonly' | 'controlled'>(() => {
    if (editMode) return editMode;
    if (editable === false) return 'readonly';
    if (editable === true) return 'controlled';
    return 'auto';
  }, [editMode, editable]);
  const editEnabled = resolvedEditMode === 'readonly' ? false : hasChangeSink;

  // ctx 引用
  const ctxRef = useRef<MapContext | null>(null);
  const hoverRef = useRef<HitTestTarget>({ kind: 'blank' });

  // 插件渲染请求：仅用于 overlay/hud（节点/背景不依赖该机制）
  const [, bumpOverlay] = useState(0);
  const overlayRafRef = useRef<number | null>(null);
  const requestRender = useCallback(() => {
    if (overlayRafRef.current != null) return;
    overlayRafRef.current = requestAnimationFrame(() => {
      overlayRafRef.current = null;
      bumpOverlay((x) => (x + 1) % 1000000);
    });
  }, []);
  useEffect(() => {
    return () => {
      if (overlayRafRef.current != null) cancelAnimationFrame(overlayRafRef.current);
    };
  }, []);

  const { applyPatches: applyPatchesRaw } = usePatchEngine({
    bus,
    nodesRef,
    onNodesChangeRef,
    onPatchesRef,
    hooksRef,
    hookModeRef,
    onEditorErrorRef,
  });

  const runCommandWithHooks = useRunCommandWithHooks({ ctxRef, hooksRef, hookModeRef, onEditorErrorRef });

  const applyPatches = useCallback(
    (patches: NodePatch[], meta: ChangeMeta) => {
      if (resolvedEditMode === 'readonly') return;
      if (resolvedEditMode === 'controlled') {
        if (!onNodesChangeRef.current && !onPatchesRef.current) return;
      }
      applyPatchesRaw(patches, meta);
    },
    [applyPatchesRaw, resolvedEditMode]
  );

  const { ctx } = useMapContext({
    ctxRef,
    cameraRef,
    viewportRef,
    nodesRef,
    visibleNodesRef,
    spatialIndexRef,
    screenToWorld,
    worldToScreen,
    rectScreenToWorld,
    rectWorldToScreen,
    applyPatches,
    bus,
    store,
    requestRender,
    runCommandWithHooks,
  });

  // services：overlay 在 render 阶段就会读取，因此需要同步可用（不能放 useEffect）
  if (!ctx.getService('engine')) {
    ctx.registerService('engine', { store: engineStore, cameraRef });
  }
  if (!ctx.getService('dom-nodes')) {
    ctx.registerService('dom-nodes', {
      getEl: (id: string) => {
        const root = containerRef.current;
        if (!root) return null;
        return root.querySelector(`[data-im-node-id="${CSS.escape(id)}"]`) as HTMLElement | null;
      },
    });
  }

  // view config / pan enabled / edit enabled
  useEffect(() => {
    ctx.store.set(STORE_KEYS.viewConfig, { minZoom, maxZoom, zoomStep: 1.2, paddingPx: 48 });
  }, [ctx, maxZoom, minZoom]);
  useEffect(() => {
    ctx.store.set(STORE_KEYS.viewPanEnabled, panEnabled !== false);
  }, [ctx, panEnabled]);
  useEffect(() => {
    ctx.store.set(STORE_KEYS.editEnabled, editEnabled);
  }, [ctx, editEnabled]);

  useCommandRegistry({ plugins, store, commandConflictPolicy, warnOnCommandConflict });

  // pan keepAlive
  const { panActive, setPanActive, panKeepAliveEnabled, panKeepAliveIdSetRef, panKeepAliveLRURef, panKeepAliveAdd } =
    usePanKeepAlive({ ctx, engineStore, virtualization });

  // commitCamera：原生轨道（不 setState）
  const commitRafRef = useRef<number | null>(null);

  const scheduleComputeVisible = useCallback(() => {
    if (commitRafRef.current != null) return;
    commitRafRef.current = requestAnimationFrame(() => {
      commitRafRef.current = null;
      const cam = cameraRef.current;
      const vp = viewportRef.current;
      if (vp.w <= 0 || vp.h <= 0) return;
      const z = cam.zoom || 1;
      const overscanWorld = (virtualization?.overscanPx ?? overscanPx) / z;
      const viewRect = { x: cam.x - vp.w / (2 * z) - overscanWorld, y: cam.y - vp.h / (2 * z) - overscanWorld, w: vp.w / z + overscanWorld * 2, h: vp.h / z + overscanWorld * 2 };
       // 复用 ctx 查询（内部使用 spatial index），避免依赖索引实现细节
      const base = (virtualization?.enabled ?? true) ? (ctx.queryNodesInWorldRect(viewRect) as NodeData[]) : nodesRef.current;

      // hidden 过滤（含祖先传递）：与 useVisibleNodes 保持一致
      const hiddenMemo = new Map<string, boolean>();
      const isHidden = (id: string): boolean => {
        const c = hiddenMemo.get(id);
        if (c !== undefined) return c;
        const n = nodesById.get(id);
        if (!n) { hiddenMemo.set(id, false); return false; }
        if (n.hidden) { hiddenMemo.set(id, true); return true; }
        if (n.parentId) {
          const v = isHidden(n.parentId);
          hiddenMemo.set(id, v);
          return v;
        }
        hiddenMemo.set(id, false);
        return false;
      };

      const filtered = (base as NodeData[])
        .filter((n) => !isHidden(n.id))
        .filter((n) => rectIntersects(viewRect, { x: n.x, y: n.y, w: n.width, h: n.height }));

      // keepAlive：额外合并“不被卸载”的节点
      const keepAlive = virtualization?.keepAlive;
      if ((virtualization?.enabled ?? true) && keepAlive) {
        const byId0 = new Set(filtered.map((n) => n.id));
        for (const n of nodesRef.current) if (keepAlive(n) && !byId0.has(n.id)) filtered.push(n);
      }
      // pan keepAlive：额外合并“离场节点”
      if ((virtualization?.enabled ?? true) && panActive && panKeepAliveEnabled && panKeepAliveIdSetRef.current.size) {
        const byId0 = new Set(filtered.map((n) => n.id));
        for (const id of panKeepAliveIdSetRef.current) {
          if (byId0.has(id)) continue;
          const n = nodesById.get(id);
          if (n) filtered.push(n);
        }
      }

      filtered.sort((a, b) => {
        const za = a.z ?? 0;
        const zb = b.z ?? 0;
        if (za !== zb) return za - zb;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

      const ids = filtered.map((n) => n.id);
      // 仅当 ids 变化时更新（避免无意义通知）
      const prev = engineStore.getState().visibleNodeIds;
      let same = prev.length === ids.length;
      if (same)
        for (let i = 0; i < ids.length; i++)
          if (ids[i] !== prev[i]) {
            same = false;
            break;
          }
      if (!same) engineStore.getState().setVisibleNodeIds(ids);
      visibleNodesRef.current = filtered;
      if (panActive && panKeepAliveEnabled) panKeepAliveAdd(ids);
    });
  }, [ctx, engineStore, nodesById, nodesRef, overscanPx, panActive, panKeepAliveAdd, panKeepAliveEnabled, viewportRef, virtualization]);

  const commitCamera = useCallback(
    (next: Camera, _immediate?: boolean) => {
      cameraRef.current = next;
      engineStore.getState().setView(next);
      bus.emit('camera:changed', { camera: next } as any);
      scheduleComputeVisible();
    },
    [bus, engineStore, scheduleComputeVisible]
  );

  // camera service：供 minimap/commands 等驱动相机
  useEffect(() => {
    ctx.registerService('camera', {
      set: (next: Camera, immediate?: boolean) => {
        commitCamera(next, Boolean(immediate));
      },
    });
  }, [ctx, commitCamera]);

  // 初始化 visible nodes
  useEffect(() => {
    scheduleComputeVisible();
  }, [scheduleComputeVisible, nodes]);

  // 容器尺寸变化时也需要重新计算一次（初次挂载时 viewport 可能为 0x0）
  useEffect(() => {
    if (viewport.w <= 0 || viewport.h <= 0) return;
    scheduleComputeVisible();
  }, [scheduleComputeVisible, viewport.w, viewport.h]);

  // viewport DOM：订阅 transform，直接写 style（rAF 合并）
  useEffect(() => {
    const el = viewportDomRef.current;
    if (!el) return;
    let raf: number | null = null;
    let pending = engineStore.getState().view.transform;
    const un = engineStore.subscribe(
      (s) => s.view.transform,
      (t) => {
        pending = t;
        if (raf != null) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          el.style.transform = pending;
        });
      },
      { equalityFn: Object.is }
    );
    return () => {
      un();
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [engineStore]);

  // 插件生命周期（setup/teardown）
  usePluginLifecycle({ plugins, ctx, onEditorErrorRef });
  const themeVars = useInjectedThemeVars(theme);

  // runtime effects（wheel + highlight + minimap config）
  useMapRuntimeEffects({
    plugins,
    ctx,
    containerRef,
    cameraRef,
    viewportRef,
    commitCamera,
    panEnabled: panEnabled !== false,
    minZoom,
    maxZoom,
    zoomSpeed,
    pinchZoomFactor,
    screenToWorld,
    bus,
  });

  // input dispatch（内置 pan gesture 会调用 commitCamera）
  const { dispatchPointer, dispatchContextMenu, gestureStateRef } = usePluginInputDispatch({
    plugins,
    ctx,
    containerRef,
    store,
    screenToWorld,
    commitCamera: (next, immediate) => commitCamera(next, immediate),
    hoverRef,
    onEditorErrorRef,
    debugRef,
    pan: {
      panActive,
      setPanActive,
      panKeepAliveEnabled,
      panKeepAliveAdd,
      panKeepAliveIdSetRef,
      panKeepAliveLRURef,
      visibleNodesRef: visibleNodesRef as any,
    },
  });

  // apiRef：沿用现有 attach（commitCamera 已是引擎实现）
  useAttachApiRef({
    apiRef,
    plugins,
    ctx,
    commitCamera,
    runCommandWithHooks,
    getNodeRect: (_id) => null,
    getSelectionRect: () => null,
    onNodesChange,
    applyPatches,
  });

  return (
    <div
      ref={containerRef}
      data-im-theme={themeBase ?? 'light'}
      tabIndex={0}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...(themeVars ?? {}),
        background: 'var(--im-map-bg, var(--map-bg))',
        borderRadius: 0,
        border: 'none',
        transition: 'background-color 220ms ease, border-color 220ms ease',
        touchAction: 'none',
        outline: 'none',
      }}
      onPointerDownCapture={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        (e.currentTarget as HTMLElement).focus?.();
        const res = dispatchPointer('down', e);
        if (res.handled === true && res.mode !== 'continue') {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerMoveCapture={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        const res = dispatchPointer('move', e);
        if (res.handled === true && res.mode !== 'continue') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerUpCapture={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        const res = dispatchPointer('up', e);
        if (res.handled === true && res.mode !== 'continue') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerCancelCapture={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        const res = dispatchPointer('cancel', e);
        if (res.handled === true && res.mode !== 'continue') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onContextMenuCapture={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        const res = dispatchContextMenu(e);
        if (res.handled === true && res.mode !== 'continue') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerLeave={(e: ReactPointerEvent) => {
        hoverRef.current = { kind: 'blank' };
        store.set(STORE_KEYS.hoverHit, { kind: 'blank' });
        if (containerRef.current) containerRef.current.style.cursor = 'default';
        const active = gestureStateRef.current?.active;
        if (active?.pointerId === e.pointerId) {
          return;
        }
        dispatchPointer('cancel', e);
      }}
    >
      {/* 背景（屏幕空间，但图案锚定世界坐标；由 store.subscribe 直接写 style） */}
      <EngineBackgroundLayer
        store={engineStore}
        backgroundMode={backgroundMode}
        dotSpacing={dotSpacing}
        dotRadiusPx={dotRadiusPx}
        dotAlpha={dotAlpha}
        gridSpacing={gridSpacing === 'auto' ? 'auto' : gridSpacing ?? dotSpacing}
        gridAlpha={gridAlpha}
        zIndex={0}
      />

      {/* 插件 background 层（屏幕空间） */}
      {RenderPluginOverlays({ plugins, slot: 'background', ctx, zIndex: 1, onEditorError: onEditorErrorRef.current })}

      {/* viewport DOM：transform 由 store.subscribe 直接写入 */}
      <div
        ref={viewportDomRef}
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '0 0',
          transform: engineStore.getState().view.transform,
          willChange: 'transform',
          zIndex: 2,
        }}
      >
        <EngineDomNodesLayer
          store={engineStore}
          nodesById={nodesById}
          cameraRef={cameraRef}
          zIndex={2}
          onNodeDrag={onNodeDrag}
          renderNode={renderNode}
          renderNodeContent={renderNodeContent}
          getDefaultNodeProps={getDefaultNodeProps}
          defaultNodeShowMeta={defaultNodeShowMeta}
        />
      </div>

      {/* 插件 overlay/hud（屏幕空间） */}
      {RenderPluginOverlays({ plugins, slot: 'overlay', ctx, zIndex: 20, onEditorError: onEditorErrorRef.current })}
      {RenderPluginOverlays({ plugins, slot: 'hud', ctx, zIndex: 30, onEditorError: onEditorErrorRef.current })}
    </div>
  );
}

export function InfiniteMap(props: InfiniteMapProps) {
  return <InfiniteMapEngine {...props} />;
}
