/**
 * editor 内部 store key 统一管理
 * - 方便跨插件协作，减少散落的 string literal
 */
export const STORE_KEYS = {
  // edit capability（宿主是否允许“修改 nodes”的编辑行为）
  // - readonly / 无变更出口时为 false：编辑类插件应隐藏 handles/对齐线等 UI，并禁止 drag/resize 等手势
  editEnabled: 'edit:enabled',

  // selection / marquee / input
  selectionIds: 'selection:ids',
  marqueeState: 'marquee:state',
  keyboardSpace: 'keyboard:space',
  hoverHit: 'hover:hit',

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
  /**
   * toolbar items registry（用于插件贡献按钮）
   * - Toolbar 插件会在默认 items 基础上合并这个列表
   */
  toolbarItems: 'toolbar:items',
  /**
   * context menu items registry（用于插件贡献菜单项）
   * - 默认右键菜单插件会在默认 items 基础上合并这个列表
   */
  contextMenuItems: 'contextmenu:items',

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
