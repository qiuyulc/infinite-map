/**
 * editor 内部 store key 统一管理
 * - 方便跨插件协作，减少散落的 string literal
 */
export const STORE_KEYS = {
  // selection / marquee / input
  selectionIds: 'selection:ids',
  marqueeState: 'marquee:state',
  keyboardSpace: 'keyboard:space',

  // drag / resize / rotate state
  dragState: 'drag:state',
  resizeState: 'resize:state',
  rotateState: 'rotate:state',
  rotate3dState: 'rotate3d:state',

  // snapping
  snapConfig: 'snap:config',
  snapGuides: 'snap:guides',

  // minimap
  minimapInViewCount: 'minimap:inViewCount',
  minimapConfig: 'minimap:config',
  minimapNeedsRedraw: 'minimap:needsRedraw',
  minimapEnabled: 'minimap:enabled',

  // view
  viewConfig: 'view:config',

  // context menu
  contextMenuState: 'contextmenu:state',

  // history
  historyUndoStack: 'history:undoStack',
  historyRedoStack: 'history:redoStack',
  historyPending: 'history:pending',
  historyVersion: 'history:version',

  // clipboard
  clipboardData: 'clipboard:data',
  clipboardPasteCount: 'clipboard:pasteCount',
} as const;

/**
 * 视觉常量（集中管理，避免多处重复）
 */
export const VISUAL_CONST = {
  perspectivePx: 800,
} as const;
