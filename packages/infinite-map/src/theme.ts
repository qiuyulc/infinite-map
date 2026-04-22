export type InfiniteMapTheme = {
  // map / background
  mapBg: string;
  mapBorder: string;
  mapDot: string;
  mapGrid: string;

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
