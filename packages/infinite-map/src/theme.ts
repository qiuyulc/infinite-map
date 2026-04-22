export type InfiniteMapTheme = {
  // map / background
  mapBg: string;
  mapBorder: string;
  mapDot: string;
  mapGrid: string;

  // default node (when user uses DefaultNode renderer)
  nodeBg: string;
  nodeText: string;
  nodeTextMuted: string;
  nodeShadow1: string;
  nodeShadow2: string;
  nodeRadius: string;

  // toolbar
  toolbarBg: string;
  toolbarBorder: string;
  toolbarBtnBg: string;
  toolbarBtnBorder: string;
  toolbarBtnText: string;

  // minimap
  minimapBg: string;
  minimapBorder: string;
  minimapNode: string;
  minimapViewport: string;

  // generic panel (tooltips/popovers)
  panelBg: string;
  panelBorder: string;
  textStrong: string;

  // rulers
  rulerBg: string;
  rulerBorder: string;
  rulerTick: string;
  rulerText: string;

  // selection / handles
  selectionStroke: string;
  selectionShadow: string;
  handleFill: string;
  handleStroke: string;

  // guides (snapping)
  guideStroke: string;
  guideShadow: string;
};

export const lightTheme: InfiniteMapTheme = {
  mapBg: '#f7f8fc',
  mapBorder: 'rgba(15, 23, 42, 0.10)',
  mapDot: 'rgba(0, 0, 0, 0.12)',
  mapGrid: 'rgba(0, 0, 0, 0.08)',

  nodeBg: 'rgba(255, 255, 255, 0.92)',
  nodeText: 'rgba(15, 23, 42, 0.92)',
  nodeTextMuted: 'rgba(15, 23, 42, 0.60)',
  nodeShadow1: 'rgba(15, 23, 42, 0.16)',
  nodeShadow2: 'rgba(15, 23, 42, 0.10)',
  nodeRadius: '12px',

  toolbarBg: 'rgba(255, 255, 255, 0.72)',
  toolbarBorder: 'rgba(15, 23, 42, 0.12)',
  toolbarBtnBg: 'rgba(255, 255, 255, 0.75)',
  toolbarBtnBorder: 'rgba(15, 23, 42, 0.12)',
  toolbarBtnText: 'rgba(15, 23, 42, 0.85)',

  minimapBg: 'rgba(255, 255, 255, 0.92)',
  minimapBorder: 'rgba(15, 23, 42, 0.12)',
  minimapNode: 'rgba(59, 130, 246, 0.55)',
  minimapViewport: 'rgba(15, 23, 42, 0.55)',

  panelBg: 'rgba(255, 255, 255, 0.92)',
  panelBorder: 'rgba(15, 23, 42, 0.12)',
  textStrong: 'rgba(15, 23, 42, 0.9)',

  rulerBg: 'rgba(255, 255, 255, 0.75)',
  rulerBorder: 'rgba(15, 23, 42, 0.14)',
  rulerTick: 'rgba(15, 23, 42, 0.35)',
  rulerText: 'rgba(15, 23, 42, 0.70)',

  selectionStroke: 'rgba(110, 200, 255, 0.95)',
  selectionShadow: 'rgba(110, 200, 255, 0.12)',
  handleFill: '#ffffff',
  handleStroke: 'rgba(110, 200, 255, 0.95)',

  guideStroke: 'rgba(168, 85, 247, 0.95)',
  guideShadow: 'rgba(168, 85, 247, 0.18)',
};

export const darkTheme: InfiniteMapTheme = {
  mapBg: '#070a12',
  mapBorder: 'rgba(255, 255, 255, 0.06)',
  mapDot: 'rgba(255, 255, 255, 0.10)',
  mapGrid: 'rgba(255, 255, 255, 0.07)',

  nodeBg: 'rgba(10, 14, 22, 0.92)',
  nodeText: 'rgba(255, 255, 255, 0.92)',
  nodeTextMuted: 'rgba(255, 255, 255, 0.62)',
  nodeShadow1: 'rgba(0, 0, 0, 0.55)',
  nodeShadow2: 'rgba(0, 0, 0, 0.35)',
  nodeRadius: '12px',

  toolbarBg: 'rgba(10, 14, 22, 0.72)',
  toolbarBorder: 'rgba(255, 255, 255, 0.10)',
  toolbarBtnBg: 'rgba(10, 14, 22, 0.62)',
  toolbarBtnBorder: 'rgba(255, 255, 255, 0.10)',
  toolbarBtnText: 'rgba(255, 255, 255, 0.86)',

  minimapBg: 'rgba(10, 14, 22, 0.70)',
  minimapBorder: 'rgba(255, 255, 255, 0.10)',
  minimapNode: 'rgba(120, 180, 255, 0.75)',
  minimapViewport: 'rgba(255, 255, 255, 0.75)',

  panelBg: 'rgba(10, 14, 22, 0.90)',
  panelBorder: 'rgba(255, 255, 255, 0.10)',
  textStrong: 'rgba(255, 255, 255, 0.90)',

  rulerBg: 'rgba(10, 14, 22, 0.55)',
  rulerBorder: 'rgba(255, 255, 255, 0.10)',
  rulerTick: 'rgba(255, 255, 255, 0.28)',
  rulerText: 'rgba(255, 255, 255, 0.70)',

  selectionStroke: 'rgba(110, 200, 255, 0.95)',
  selectionShadow: 'rgba(110, 200, 255, 0.12)',
  handleFill: '#ffffff',
  handleStroke: 'rgba(110, 200, 255, 0.95)',

  guideStroke: 'rgba(168, 85, 247, 0.95)',
  guideShadow: 'rgba(168, 85, 247, 0.18)',
};

export function mergeTheme(base: InfiniteMapTheme, override?: Partial<InfiniteMapTheme>): InfiniteMapTheme {
  return { ...base, ...(override ?? {}) };
}

export type InfiniteMapCssVars = Record<`--im-${string}`, string>;

export function themeToCSSVars(theme: InfiniteMapTheme): InfiniteMapCssVars {
  return {
    '--im-map-bg': theme.mapBg,
    '--im-map-border': theme.mapBorder,
    '--im-map-dot': theme.mapDot,
    '--im-map-grid': theme.mapGrid,

    '--im-node-bg': theme.nodeBg,
    '--im-node-text': theme.nodeText,
    '--im-node-text-muted': theme.nodeTextMuted,
    '--im-node-shadow-1': theme.nodeShadow1,
    '--im-node-shadow-2': theme.nodeShadow2,
    '--im-node-radius': theme.nodeRadius,

    '--im-toolbar-bg': theme.toolbarBg,
    '--im-toolbar-border': theme.toolbarBorder,
    '--im-toolbar-btn-bg': theme.toolbarBtnBg,
    '--im-toolbar-btn-border': theme.toolbarBtnBorder,
    '--im-toolbar-btn-text': theme.toolbarBtnText,

    '--im-minimap-bg': theme.minimapBg,
    '--im-minimap-border': theme.minimapBorder,
    '--im-minimap-node': theme.minimapNode,
    '--im-minimap-viewport': theme.minimapViewport,

    '--im-panel-bg': theme.panelBg,
    '--im-panel-border': theme.panelBorder,
    '--im-text-strong': theme.textStrong,

    '--im-ruler-bg': theme.rulerBg,
    '--im-ruler-border': theme.rulerBorder,
    '--im-ruler-tick': theme.rulerTick,
    '--im-ruler-text': theme.rulerText,

    '--im-selection-stroke': theme.selectionStroke,
    '--im-selection-shadow': theme.selectionShadow,
    '--im-handle-fill': theme.handleFill,
    '--im-handle-stroke': theme.handleStroke,

    '--im-guide-stroke': theme.guideStroke,
    '--im-guide-shadow': theme.guideShadow,
  };
}
