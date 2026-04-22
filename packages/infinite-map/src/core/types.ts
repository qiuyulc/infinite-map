export type Camera = {
  /** 世界坐标中视口左上角 x */
  x: number;
  /** 世界坐标中视口左上角 y */
  y: number;
  /** 缩放比例（1 = 100%） */
  zoom: number;
};

export type NodeData = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * 层级（值越大越靠上）
   * - 可选：不传表示 0
   */
  z?: number;
  /**
   * 旋转角度（deg，顺时针）
   * - 可选：不传表示 0
   */
  rotation?: number;
  /**
   * 3D 旋转：绕 X 轴（deg）
   * - 可选：不传表示 0
   */
  rotationX?: number;
  /**
   * 3D 旋转：绕 Y 轴（deg）
   * - 可选：不传表示 0
   */
  rotationY?: number;
  label?: string;
  color?: string;
  /**
   * 节点种类
   * - 'group'：编组节点（用于表达结构，不建议存放大业务数据）
   * - 默认/未填：普通节点
   */
  kind?: 'node' | 'group';
  /**
   * 父组 id（编组结构）
   * - 仅当被编入某个 group 时存在
   */
  parentId?: string;
  /**
   * 外置数据引用 id（可选）
   * - 用于把“大业务数据”（图表/富文本/大数组）放到外部 store
   * - 默认约定：不传时等同 node.id（由使用者决定如何读取）
   */
  resourceId?: string;
  /**
   * 业务自定义数据（不推荐放超大对象，建议外置到 resourceId 对应的 store）
   */
  data?: unknown;
};

export type Rect = { x: number; y: number; w: number; h: number };

export function rectIntersects(a: Rect, b: Rect) {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}
