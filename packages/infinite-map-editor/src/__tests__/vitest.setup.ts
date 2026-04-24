import '@testing-library/jest-dom/vitest';

// ---- PointerEvent polyfill for jsdom ----
// 需要具备 pointerId/buttons 等字段，否则拖拽等逻辑无法工作。
if (typeof (globalThis as any).PointerEvent === 'undefined') {
  class PolyfillPointerEvent extends MouseEvent {
    constructor(type: string, init: any = {}) {
      super(type, init);
      Object.defineProperty(this, 'pointerId', { value: init.pointerId ?? 1 });
      Object.defineProperty(this, 'buttons', { value: init.buttons ?? 0 });
      Object.defineProperty(this, 'pointerType', { value: init.pointerType ?? 'mouse' });
      Object.defineProperty(this, 'isPrimary', { value: init.isPrimary ?? true });
    }
  }
  (globalThis as any).PointerEvent = PolyfillPointerEvent as any;
}

// ---- Canvas mock (jsdom does not implement canvas) ----
type AnyFn = (...args: any[]) => any;
function noop(): void {}

const mockCtx2d: Record<string, AnyFn | any> = {
  setTransform: noop,
  resetTransform: noop,
  clearRect: noop,
  fillRect: noop,
  drawImage: noop,
  createRadialGradient: () => ({ addColorStop: noop }),
  createLinearGradient: () => ({ addColorStop: noop }),
  strokeRect: noop,
  beginPath: noop,
  closePath: noop,
  moveTo: noop,
  lineTo: noop,
  rect: noop,
  arc: noop,
  fill: noop,
  stroke: noop,
  save: noop,
  restore: noop,
  translate: noop,
  scale: noop,
  rotate: noop,
  measureText: () => ({ width: 0 }),
  fillText: noop,
  strokeText: noop,
  // style props
  lineWidth: 1,
  globalAlpha: 1,
  fillStyle: '',
  strokeStyle: '',
  font: '',
  textAlign: 'left',
  textBaseline: 'alphabetic',
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: function getContext(type: string) {
    if (type === '2d') return mockCtx2d as unknown as CanvasRenderingContext2D;
    return null;
  },
});

// ---- ResizeObserver mock ----
class MockResizeObserver {
  private cb: ResizeObserverCallback;
  private elements = new Set<Element>();
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe = (el: Element) => {
    this.elements.add(el);
    // 让调用方先有机会覆盖 getBoundingClientRect（测试里需要）
    setTimeout(() => this.fire(el), 0);
  };
  unobserve = (el: Element) => {
    this.elements.delete(el);
  };
  disconnect = () => {
    this.elements.clear();
  };
  private fire(el: Element) {
    const r = (el as HTMLElement).getBoundingClientRect?.() ?? ({ width: 0, height: 0 } as DOMRect);
    const entry = { target: el, contentRect: r } as unknown as ResizeObserverEntry;
    this.cb([entry], this as unknown as ResizeObserver);
  }
}

globalThis.ResizeObserver = MockResizeObserver as any;
