import type { Camera, NodeData, Rect } from '../core/types';
import type { ComponentType } from 'react';

/**
 * 说明：
 * - 这是 editor 插件体系的“类型草案”（Milestone 0），用于后续逐步落地。
 * - 当前项目不会引用这些类型，因此不会改变现有行为。
 */

export type Point = { x: number; y: number };

export type Modifiers = {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
};

/**
 * 节点变更指令（patch）
 * - 用于可扩展编辑能力（多选拖拽 / 对齐分布 / undo redo / 协作同步）
 * - 第一阶段只定义最小集合，后续按需扩展
 */
export type NodePatch =
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'set'; id: string; data: Partial<NodeData> }
  | { type: 'add'; node: NodeData }
  | { type: 'remove'; id: string };

/**
 * 操作元信息
 * - 用于历史栈、统计、调试、协作扩展
 */
export type ChangeMeta = {
  source: 'plugin';
  plugin: string;
  reason:
    | 'drag'
    | 'click-select'
    | 'marquee-select'
    | 'snap'
    | 'align'
    | 'distribute'
    | 'keyboard'
    | 'delete'
    | 'copy'
    | 'cut'
    | 'paste'
    | 'duplicate'
    | 'undo'
    | 'redo'
    | 'group'
    | 'ungroup'
    | 'group-sync';
  phase?: 'start' | 'move' | 'end';
  ids?: string[];
};

export type HandlerResult =
  | { handled: false }
  | { handled: true; mode?: 'stop' }
  | { handled: true; mode: 'continue' };

// -----------------------------------------------------------------------------
// Input Pipeline (Scheme C)
// -----------------------------------------------------------------------------

export type HitTestTarget =
  | { kind: 'blank'; cursor?: string }
  | { kind: 'node'; id: string; cursor?: string }
  | { kind: 'handle'; owner: string; id: string; handle: string; cursor?: string };

export type HitTestContext = {
  /** 是否是右键命中（context menu） */
  kind: 'pointer' | 'contextmenu';
};

export type HitTestContributor = {
  id: string;
  priority?: number;
  /**
   * 返回 null 表示“不处理/无命中”；返回 target 表示给出命中结果
   * - 命中结果会继续交给其它 contributor 竞争（按优先级）
   */
  hitTest: (e: MapPointerEvent | MapContextMenuEvent, ctx: MapContext, info: HitTestContext) => HitTestTarget | null;
};

export type GesturePhase = 'start' | 'move' | 'end' | 'cancel';

export type Gesture = {
  id: string;
  priority?: number;
  /**
   * 是否可启动该手势（基于 hitTest 结果与当前状态）
   */
  canStart: (e: MapPointerEvent, ctx: MapContext, hit: HitTestTarget) => boolean;
  onStart: (e: MapPointerEvent, ctx: MapContext, hit: HitTestTarget) => void;
  onMove: (e: MapPointerEvent, ctx: MapContext) => void;
  onEnd: (e: MapPointerEvent, ctx: MapContext) => void;
  onCancel: (e: MapPointerEvent, ctx: MapContext) => void;
};

export type InputPipelineHooks = {
  onBeforeHitTest?: (e: MapPointerEvent | MapContextMenuEvent, ctx: MapContext, info: HitTestContext) => void;
  onAfterHitTest?: (hit: HitTestTarget, e: MapPointerEvent | MapContextMenuEvent, ctx: MapContext, info: HitTestContext) => void;
  /**
   * hover 变化（仅在没有 active gesture 时由 core 触发）
   */
  onHoverChange?: (info: { prev: HitTestTarget; next: HitTestTarget; e: MapPointerEvent }, ctx: MapContext) => void;
  onBeforeGesture?: (info: { phase: GesturePhase; gestureId: string; hit?: HitTestTarget; e: MapPointerEvent }, ctx: MapContext) => void;
  onAfterGesture?: (info: { phase: GesturePhase; gestureId: string; hit?: HitTestTarget; e: MapPointerEvent }, ctx: MapContext) => void;
};

export type PointerDownProcessor = {
  id: string;
  priority?: number;
  /**
   * 在 hitTest 之后、gesture 启动之前执行（可用于 selection 等非互斥逻辑）
   * - 返回 {stop:true} 可阻止后续 gesture 启动（例如锁定节点：允许选中但阻断拖拽）
   */
  onPointerDown: (e: MapPointerEvent, ctx: MapContext, hit: HitTestTarget) => void | { stop?: boolean };
};

export type MapPointerEvent = {
  type: 'down' | 'move' | 'up' | 'cancel';
  pointerId: number;
  /**
   * 触发的按钮（与 MouseEvent.button 一致）
   * - 0: 主键（通常是左键）
   * - 1: 中键
   * - 2: 右键
   */
  button: number;
  buttons: number;
  screen: Point;
  world: Point;
  modifiers: Modifiers;
  originalEvent: unknown;
};

export type MapWheelEvent = {
  screen: Point;
  world: Point;
  deltaX: number;
  deltaY: number;
  ctrlKey: boolean;
  modifiers: Modifiers;
  originalEvent: unknown;
};

export type MapContextMenuEvent = {
  screen: Point;
  world: Point;
  modifiers: Modifiers;
  originalEvent: unknown;
};

export type MapKeyEvent = {
  type: 'down' | 'up';
  key: string;
  code: string;
  modifiers: Modifiers;
  originalEvent: unknown;
};

export type InputHandlers = {
  onWheel?: (e: MapWheelEvent, ctx: MapContext) => HandlerResult;
  onKeyDown?: (e: MapKeyEvent, ctx: MapContext) => HandlerResult;
  onKeyUp?: (e: MapKeyEvent, ctx: MapContext) => HandlerResult;
  onContextMenu?: (e: MapContextMenuEvent, ctx: MapContext, hit: HitTestTarget) => HandlerResult;
};

export type Unsubscribe = () => void;

/**
 * 事件总线事件表（最小集合，后续扩展）
 */
export type EventMap = {
  // drag
  'drag:start': { id: string; startWorld: Point };
  'drag:move': { id: string; rawWorld: Point };
  'drag:end': { id: string; endWorld: Point };

  // selection
  'selection:change': { ids: string[] };

  // history / command
  'history:undo': { source: 'keyboard' | 'toolbar' | 'menu' | 'api' };
  'history:redo': { source: 'keyboard' | 'toolbar' | 'menu' | 'api' };
  'command:run': { id: string; source: 'keyboard' | 'toolbar' | 'menu' | 'api' };

  // camera（可选）
  'camera:change': { camera: Camera; immediate: boolean };
  /**
   * camera 已更新（由 InfiniteMap 在 React state 更新后广播）
   * - 用于外部订阅（自定义工具栏/状态栏）
   */
  'camera:changed': { camera: Camera };

  // patches（history 用）
  'patches:applied': {
    patches: NodePatch[];
    meta: ChangeMeta;
    /**
     * 变更前快照（只包含本次 patches 涉及到的 node id）
     * - add 的 id 对应 value 可能为 undefined
     */
    beforeById: Record<string, NodeData | undefined>;
  };
};

export type EventKey = keyof EventMap;

export type EventBus = {
  on<K extends EventKey>(type: K, handler: (payload: EventMap[K]) => void): Unsubscribe;
  emit<K extends EventKey>(type: K, payload: EventMap[K]): void;
};

/**
 * 共享状态（最小 store API）
 * - 插件协作：drag state / guides / selection 等
 */
export type Store = {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T): void;
  subscribe(key: string, listener: () => void): Unsubscribe;
};

export type Services = Record<string, unknown>;

export type MapContext = {
  // ---- 只读数据（通过 getter 读取最新值，避免在 React render 中修改对象）----
  getCamera(): Camera;
  getViewport(): { w: number; h: number };
  getNodes(): NodeData[];
  getVisibleNodes(): NodeData[];

  // ---- 坐标变换 ----
  screenToWorld(p: Point): Point;
  worldToScreen(p: Point): Point;
  rectScreenToWorld(r: Rect): Rect;
  rectWorldToScreen(r: Rect): Rect;

  // ---- 查询（性能关键）----
  queryNodesInWorldRect(rect: Rect): NodeData[];

  // ---- 数据变更出口（统一）----
  applyPatches(patches: NodePatch[], meta: ChangeMeta): void;

  // ---- 协作机制 ----
  bus: EventBus;
  store: Store;

  // ---- services（推荐）----
  services: Services;
  registerService: <T = unknown>(name: string, service: T) => void;
  getService: <T = unknown>(name: string) => T | undefined;

  // ---- command（可选，但建议）----
  /**
   * 运行命令（如果命令已注册）
   * - 通常由 CommandRunnerPlugin 提供实现；否则可回退为 bus.emit('command:run')
   */
  runCommand?: (id: string, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api' }) => void;

  // ---- 可选：请求一次 overlay 更新 ----
  requestRender(): void;
};

export type OverlayComponent = ComponentType<{ ctx: MapContext }>;

export type Command = {
  id: string;
  title: string;
  shortcut?: string;
  run(ctx: MapContext, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api' }): void;
};

export type InfiniteMapPlugin = {
  id: string;
  enabled?: boolean;
  /**
   * 插件声明式能力/依赖（用于组合、校验、排序）
   * - provides 默认包含自身 id（即提供一个同名能力）
   */
  provides?: string[];
  requires?: string[];
  order?: { before?: string[]; after?: string[] };
  setup?: (ctx: MapContext) => void;
  teardown?: () => void;
  /**
   * 非指针类输入（wheel/key/contextmenu）仍走 handlers
   * - pointer 统一走 HitTest + Gesture 管线
   */
  input?: InputHandlers;
  hitTests?: HitTestContributor[];
  pointerDownProcessors?: PointerDownProcessor[];
  gestures?: Gesture[];
  inputHooks?: InputPipelineHooks;
  overlay?: OverlayComponent;
  /**
   * overlay 渲染插槽（分层渲染）
   * - background：背景层（在节点层之下）
   * - overlay：编辑辅助层（选框/对齐线/框选等，默认）
   * - hud：界面层（minimap/标尺/面板等，通常在最上层）
   */
  slot?: 'background' | 'overlay' | 'hud';
  /**
   * overlay 是否需要接收指针事件（例如 resize handles）
   * - 默认 none：overlay 不拦截事件
   * - auto：overlay 内部元素可交互
   */
  overlayPointerEvents?: 'none' | 'auto';
  commands?: Record<string, Command>;
};
