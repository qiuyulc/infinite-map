import { useCallback, useEffect, useRef } from 'react';
import type {
  EditorErrorInfo,
  Gesture,
  HandlerResult,
  HitTestTarget,
  InfiniteMapPlugin,
  MapContext,
  MapContextMenuEvent,
  MapKeyEvent,
  MapPointerEvent,
} from '../editor/types';
import { STORE_KEYS } from '../editor/keys';

type PanState = {
  panActive: boolean;
  setPanActive: (v: boolean) => void;
  panKeepAliveEnabled: boolean;
  panKeepAliveAdd: (ids: Iterable<string>) => void;
  panKeepAliveIdSetRef: React.MutableRefObject<Set<string>>;
  panKeepAliveLRURef: React.MutableRefObject<Map<string, number>>;
  visibleNodesRef: React.MutableRefObject<Array<{ id: string }>>;
};

export type PluginInputDispatchOptions = {
  plugins?: InfiniteMapPlugin[];
  ctx: MapContext;
  containerRef: { current: HTMLElement | null };
  store: { get: <T>(key: string) => T | undefined; set: (key: string, v: any) => void };
  screenToWorld: (p: { x: number; y: number }) => { x: number; y: number };
  commitCamera: (
    next: { x: number; y: number; zoom: number },
    opts?: boolean | { immediate?: boolean; throttleMs?: number }
  ) => void;
  mouseRef: React.MutableRefObject<{ x: number; y: number } | null>;
  hoverRef: React.MutableRefObject<HitTestTarget>;
  onEditorErrorRef: React.MutableRefObject<((err: unknown, info: EditorErrorInfo) => void) | undefined>;
  debugRef: React.MutableRefObject<boolean>;
  pan: PanState;
};

const sameHit = (a: HitTestTarget, b: HitTestTarget) => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'blank') return true;
  if (a.kind === 'node') return a.id === (b as any).id;
  return a.owner === (b as any).owner && a.id === (b as any).id && a.handle === (b as any).handle;
};

const cursorFromHit = (hit: HitTestTarget, store: { get: <T>(key: string) => T | undefined }) => {
  // Space 平移模式优先
  const panEnabled = store.get<boolean>(STORE_KEYS.viewPanEnabled);
  if (store.get<boolean>(STORE_KEYS.keyboardSpace) && panEnabled !== false) return 'grab';
  if (typeof (hit as any).cursor === 'string' && (hit as any).cursor) return (hit as any).cursor as string;
  if (hit.kind === 'node') return 'grab';
  if (hit.kind === 'handle' && hit.owner === 'resize') {
    const h = hit.handle;
    if (h === 'n' || h === 's') return 'ns-resize';
    if (h === 'e' || h === 'w') return 'ew-resize';
    if (h === 'ne' || h === 'sw') return 'nesw-resize';
    if (h === 'nw' || h === 'se') return 'nwse-resize';
    return 'nwse-resize';
  }
  if (hit.kind === 'handle' && hit.owner === 'rotate') return 'grab';
  return 'default';
};

/**
 * 插件输入分发（Scheme C）：
 * - pointer：hitTest → processors → gesture（含内置 pan gesture）
 * - contextmenu：hitTest → onContextMenu
 * - key：window keydown/keyup 分发给插件
 */
export function usePluginInputDispatch({
  plugins,
  ctx,
  containerRef,
  store,
  screenToWorld,
  commitCamera,
  mouseRef,
  hoverRef,
  onEditorErrorRef,
  debugRef,
  pan,
}: PluginInputDispatchOptions) {
  // 缓存容器 rect（避免在高频 pointermove 中反复 getBoundingClientRect 引发布局抖动）
  const containerRectRef = useRef<{ left: number; top: number } | null>(null);

  // Scheme C：指针手势状态（全局互斥）
  const gestureStateRef = useRef<{
    active: null | { pointerId: number; gesture: Gesture; hit: HitTestTarget };
  }>({ active: null });

  // Scheme C：pan 手势状态
  const panRef = useRef<null | { pointerId: number; startScreen: { x: number; y: number }; startCam: { x: number; y: number } }>(
    null
  );

  const dispatchPointer = useCallback(
    (type: MapPointerEvent['type'], e: React.PointerEvent): HandlerResult => {
      if (!plugins || plugins.length === 0) return { handled: false };
      const el = containerRef.current;
      if (!el) return { handled: false };
      // 仅在 pointerdown（或首次）采样 rect，其余 move/up/cancel 复用
      // DevTools 打开时，频繁 getBoundingClientRect 可能导致 layout thrash，从而出现拖动卡顿。
      if (!containerRectRef.current || type === 'down') {
        const r0 = el.getBoundingClientRect();
        containerRectRef.current = { left: r0.left, top: r0.top };
      }
      const r = containerRectRef.current;
      const sx = e.clientX - (r?.left ?? 0);
      const sy = e.clientY - (r?.top ?? 0);
      // 无论是否被手势接管，都更新鼠标位置（highlight layer 会用）
      mouseRef.current = { x: sx, y: sy };
      const m: MapPointerEvent = {
        type,
        pointerId: (e as any).pointerId,
        button: (e as any).button,
        buttons: (e as any).buttons,
        screen: { x: sx, y: sy },
        world: screenToWorld({ x: sx, y: sy }),
        modifiers: { shift: (e as any).shiftKey, alt: (e as any).altKey, ctrl: (e as any).ctrlKey, meta: (e as any).metaKey },
        originalEvent: e as any,
      };

      // ---- Scheme C: hitTest + gesture manager ----
      const enabledPlugins = plugins.filter((p) => p.enabled !== false);
      const hooks = enabledPlugins.map((p) => p.inputHooks).filter(Boolean) as Array<NonNullable<InfiniteMapPlugin['inputHooks']>>;
      const hitTests = enabledPlugins
        .flatMap((p) => p.hitTests ?? [])
        .slice()
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const processors = enabledPlugins
        .flatMap((p) => p.pointerDownProcessors ?? [])
        .slice()
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const gestures = enabledPlugins
        .flatMap((p) => p.gestures ?? [])
        .slice()
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      // 内置 pan gesture（最低优先级兜底）
      gestures.push({
        id: 'pan',
        priority: -9999,
        canStart: (e0: MapPointerEvent, ctx0: MapContext, hit: HitTestTarget) => {
          // 视图拖动锁：禁止画布平移（包括 Space 平移模式）
          if (ctx0.store.get<boolean>(STORE_KEYS.viewPanEnabled) === false) return false;
          if (e0.button !== 0) return false;
          // Space：全局平移模式（无视命中）
          if (ctx0.store.get<boolean>(STORE_KEYS.keyboardSpace)) return true;
          // 空白拖动平移
          return hit.kind === 'blank';
        },
        onStart: (e0: MapPointerEvent, ctx0: MapContext) => {
          panRef.current = {
            pointerId: e0.pointerId,
            startScreen: { ...e0.screen },
            startCam: { x: ctx0.getCamera().x, y: ctx0.getCamera().y },
          };
          if (!pan.panActive && pan.panKeepAliveEnabled) {
            // seed：把手势开始时可见的节点加入 keepAlive
            pan.panKeepAliveIdSetRef.current.clear();
            pan.panKeepAliveLRURef.current.clear();
            pan.panKeepAliveAdd(pan.visibleNodesRef.current.map((n) => n.id));
          }
          if (!pan.panActive) pan.setPanActive(true);
        },
        onMove: (e0: MapPointerEvent, ctx0: MapContext) => {
          const st0 = panRef.current;
          if (!st0 || st0.pointerId !== e0.pointerId) return;
          const cam = ctx0.getCamera();
          const dx = e0.screen.x - st0.startScreen.x;
          const dy = e0.screen.y - st0.startScreen.y;
          // pan（拖地图）会非常高频。这里降低 React state 的更新频率（仅用于触发可见节点更新等），
          // 但 cameraRef 会在每次调用里同步更新，用于命中测试/坐标换算/imperative transform。
          commitCamera({ x: st0.startCam.x - dx / cam.zoom, y: st0.startCam.y - dy / cam.zoom, zoom: cam.zoom }, { throttleMs: 33 });
        },
        onEnd: (e0: MapPointerEvent, ctx0: MapContext) => {
          const st0 = panRef.current;
          if (st0?.pointerId === e0.pointerId) panRef.current = null;
          if (pan.panActive) {
            pan.setPanActive(false);
            pan.panKeepAliveIdSetRef.current.clear();
            pan.panKeepAliveLRURef.current.clear();
          }
          // flush：手势结束时同步一次，确保 React state 与 ref 一致
          commitCamera(ctx0.getCamera(), { immediate: true });
        },
        onCancel: (e0: MapPointerEvent, ctx0: MapContext) => {
          const st0 = panRef.current;
          if (st0?.pointerId === e0.pointerId) panRef.current = null;
          if (pan.panActive) {
            pan.setPanActive(false);
            pan.panKeepAliveIdSetRef.current.clear();
            pan.panKeepAliveLRURef.current.clear();
          }
          commitCamera(ctx0.getCamera(), { immediate: true });
        },
      } satisfies Gesture);

      // active gesture state
      const st = (gestureStateRef.current ??= { active: null });

      const callHooks = <K extends keyof NonNullable<InfiniteMapPlugin['inputHooks']>>(
        key: K,
        ...args: Parameters<NonNullable<NonNullable<InfiniteMapPlugin['inputHooks']>[K]>>
      ) => {
        for (const h of hooks) {
          const fn = h?.[key] as any;
          if (!fn) continue;
          try {
            fn(...args);
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'hook', name: String(key) });
          }
        }
      };

      const runHitTest = (info: { kind: 'pointer' | 'contextmenu' }) => {
        callHooks('onBeforeHitTest', m, ctx, info);
        const now = () => ((globalThis as any).performance?.now ? (globalThis as any).performance.now() : Date.now());
        const t0 = debugRef.current ? now() : 0;
        let hit: HitTestTarget = { kind: 'blank' };
        for (const ht of hitTests) {
          try {
            const r0 = ht.hitTest(m, ctx, info);
            if (r0) {
              hit = r0;
              break;
            }
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'hitTest', name: 'hitTest', hitTestId: ht.id });
          }
        }
        if (debugRef.current) store.set('debug:lastHitTestMs', now() - t0);
        callHooks('onAfterHitTest', hit, m, ctx, info);
        return hit;
      };

      if (type === 'down') {
        let hit = runHitTest({ kind: 'pointer' });

        // pointer down processors（selection 等）
        let blockGesture = false;
        for (const pr of processors) {
          try {
            const r0 = pr.onPointerDown(m, ctx, hit);
            if (r0 && (r0 as any).stop === true) blockGesture = true;
            if (r0 && (r0 as any).hit) hit = (r0 as any).hit as HitTestTarget;
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'processor', name: 'onPointerDown', processorId: pr.id });
          }
        }
        if (blockGesture) return { handled: true, mode: 'stop' };

        // 选择一个 gesture 启动
        for (const g of gestures) {
          let ok = false;
          try {
            ok = g.canStart(m, ctx, hit);
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'gesture', name: 'canStart', gestureId: g.id });
          }
          if (!ok) continue;
          st.active = { pointerId: m.pointerId, gesture: g, hit };
          callHooks('onBeforeGesture', { phase: 'start', gestureId: g.id, hit, e: m }, ctx);
          try {
            g.onStart(m, ctx, hit);
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'gesture', name: 'onStart', gestureId: g.id });
          }
          callHooks('onAfterGesture', { phase: 'start', gestureId: g.id, hit, e: m }, ctx);
          return { handled: true, mode: 'stop' };
        }
        return { handled: false };
      }

      // move/up/cancel：仅派发给 active gesture
      const active = st.active;
      if (!active || active.pointerId !== m.pointerId) {
        // hover/cursor：仅在 move 且没有 active gesture 时运行
        if (type === 'move') {
          const hit = runHitTest({ kind: 'pointer' });
          const prev = hoverRef.current;
          if (!sameHit(prev, hit)) {
            hoverRef.current = hit;
            store.set(STORE_KEYS.hoverHit, hit);
            ctx.bus.emit('hover:change', { prev, next: hit });
            for (const h of hooks) {
              const fn = h?.onHoverChange;
              if (!fn) continue;
              try {
                fn({ prev, next: hit, e: m }, ctx);
              } catch (err) {
                onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onHoverChange' });
              }
            }
          }
          const c = cursorFromHit(hit, store);
          if (containerRef.current && containerRef.current.style.cursor !== c) containerRef.current.style.cursor = c;
        }
        return { handled: false };
      }
      const g = active.gesture;
      const phase = type === 'move' ? 'move' : type === 'up' ? 'end' : 'cancel';
      callHooks('onBeforeGesture', { phase, gestureId: g.id, hit: active.hit, e: m }, ctx);
      try {
        const now = () => ((globalThis as any).performance?.now ? (globalThis as any).performance.now() : Date.now());
        const t0 = debugRef.current ? now() : 0;
        if (phase === 'move') g.onMove(m, ctx);
        else if (phase === 'end') g.onEnd(m, ctx);
        else g.onCancel(m, ctx);
        if (debugRef.current) {
          store.set('debug:lastGestureId', g.id);
          store.set('debug:lastGesturePhase', phase);
          store.set('debug:lastGestureMs', now() - t0);
        }
      } catch (err) {
        onEditorErrorRef.current?.(err, {
          kind: 'gesture',
          name: phase === 'move' ? 'onMove' : phase === 'end' ? 'onEnd' : 'onCancel',
          gestureId: g.id,
        });
      }
      callHooks('onAfterGesture', { phase, gestureId: g.id, hit: active.hit, e: m }, ctx);
      if (phase !== 'move') st.active = null;
      return { handled: true, mode: 'stop' };
    },
    [plugins, containerRef, mouseRef, screenToWorld, ctx, onEditorErrorRef, debugRef, store, hoverRef, commitCamera, pan]
  );

  const dispatchContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!plugins || plugins.length === 0) return { handled: false } as HandlerResult;
      const el = containerRef.current;
      if (!el) return { handled: false } as HandlerResult;
      const r = el.getBoundingClientRect();
      const m: MapContextMenuEvent = {
        screen: { x: e.clientX, y: e.clientY },
        // world 需要使用相对画布的 screen 坐标
        world: screenToWorld({ x: e.clientX - r.left, y: e.clientY - r.top }),
        modifiers: { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey },
        originalEvent: e.nativeEvent,
      };
      const enabledPlugins = plugins.filter((p) => p.enabled !== false);
      const hooks = enabledPlugins.map((p) => p.inputHooks).filter(Boolean) as Array<NonNullable<InfiniteMapPlugin['inputHooks']>>;
      const hitTests = enabledPlugins
        .flatMap((p) => p.hitTests ?? [])
        .slice()
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const callHooks = <K extends keyof NonNullable<InfiniteMapPlugin['inputHooks']>>(
        key: K,
        ...args: Parameters<NonNullable<NonNullable<InfiniteMapPlugin['inputHooks']>[K]>>
      ) => {
        for (const h of hooks) {
          const fn = h?.[key] as any;
          if (!fn) continue;
          try {
            fn(...args);
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'hook', name: String(key) });
          }
        }
      };
      callHooks('onBeforeHitTest', m, ctx, { kind: 'contextmenu' });
      let hit: HitTestTarget = { kind: 'blank' };
      for (const ht of hitTests) {
        try {
          const r0 = ht.hitTest(m, ctx, { kind: 'contextmenu' });
          if (r0) {
            hit = r0;
            break;
          }
        } catch (err) {
          onEditorErrorRef.current?.(err, { kind: 'hitTest', name: 'hitTest', hitTestId: ht.id });
        }
      }
      callHooks('onAfterHitTest', hit, m, ctx, { kind: 'contextmenu' });

      let sawContinue = false;
      for (const p of enabledPlugins) {
        const res = p.input?.onContextMenu?.(m, ctx, hit);
        if (!res || res.handled === false) continue;
        if (res.mode === 'continue') {
          sawContinue = true;
          continue;
        }
        return { handled: true, mode: 'stop' } as HandlerResult;
      }
      return sawContinue ? ({ handled: true, mode: 'continue' } as HandlerResult) : ({ handled: false } as HandlerResult);
    },
    [plugins, containerRef, screenToWorld, ctx, onEditorErrorRef]
  );

  // key 事件（仅当插件存在时监听）
  useEffect(() => {
    if (!plugins || plugins.length === 0) return;

    const toModifiers = (e: KeyboardEvent) => ({ shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey });
    const dispatchKey = (type: MapKeyEvent['type'], e: KeyboardEvent) => {
      // 重要：快捷键只在画布“聚焦”时生效，避免劫持整个页面（例如 Cmd/Ctrl+C）。
      // 画布容器会在 pointerdown 时 focus（tabIndex=0），因此这里优先用 activeElement 判断。
      const root = containerRef.current;
      if (root) {
        const ae = document.activeElement as HTMLElement | null;
        const target = e.target as HTMLElement | null;
        const inRoot = (ae && root.contains(ae)) || (target && root.contains(target));
        if (!inRoot) return;
      }

      const m: MapKeyEvent = {
        type,
        key: e.key,
        code: e.code,
        modifiers: toModifiers(e),
        originalEvent: e,
      };
      let sawContinue = false;
      for (const p of plugins) {
        if (p.enabled === false) continue;
        const res = type === 'down' ? p.input?.onKeyDown?.(m, ctx) : p.input?.onKeyUp?.(m, ctx);
        if (!res || res.handled === false) continue;
        if (res.mode === 'continue') {
          sawContinue = true;
          continue;
        }
        e.preventDefault();
        return;
      }
      if (sawContinue) {
        // 默认不 preventDefault
      }
    };

    const onDown = (e: KeyboardEvent) => dispatchKey('down', e);
    const onUp = (e: KeyboardEvent) => dispatchKey('up', e);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [plugins, ctx]);

  return { dispatchPointer, dispatchContextMenu, gestureStateRef, panRef };
}
