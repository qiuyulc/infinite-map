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
