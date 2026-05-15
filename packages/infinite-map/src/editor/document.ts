import type { Camera, NodeData } from '../core/types';

/**
 * Doc schema version（对外持久化格式）
 * - 只要格式有 breaking change，就递增 schemaVersion，并在 migrations 中补迁移
 */
export const DOC_SCHEMA_VERSION = 2 as const;

/**
 * Doc（统一版本）
 * - 目前仓库只保留 schemaVersion=1 的格式，不再做历史版本兼容（避免心智负担与维护成本）。
 * - resources：宿主可选择把“大对象业务数据”落盘到这里（key 通常为 node.resourceId）
 *   这样 nodes.data 可以保持轻量，便于协作/历史/演进。
 */
export type InfiniteMapDoc = {
  schemaVersion: typeof DOC_SCHEMA_VERSION;
  nodes: NodeData[];
  camera: Camera;
  resources?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export type DocValidationError = {
  message: string;
  path?: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function assert(condition: unknown, message: string, path?: string): asserts condition {
  if (!condition) {
    const err = new Error(path ? `${message} (at ${path})` : message);
    (err as any).path = path;
    throw err;
  }
}

function validateCamera(v: unknown, path: string): asserts v is Camera {
  assert(isObject(v), 'camera must be an object', path);
  assert(typeof v.x === 'number', 'camera.x must be a number', `${path}.x`);
  assert(typeof v.y === 'number', 'camera.y must be a number', `${path}.y`);
  assert(typeof v.zoom === 'number', 'camera.zoom must be a number', `${path}.zoom`);
}

function validateNode(v: unknown, path: string): asserts v is NodeData {
  assert(isObject(v), 'node must be an object', path);
  assert(typeof v.id === 'string' && v.id.length > 0, 'node.id must be a non-empty string', `${path}.id`);
  assert(typeof v.x === 'number', 'node.x must be a number', `${path}.x`);
  assert(typeof v.y === 'number', 'node.y must be a number', `${path}.y`);
  assert(typeof v.width === 'number', 'node.width must be a number', `${path}.width`);
  assert(typeof v.height === 'number', 'node.height must be a number', `${path}.height`);
}

function validateNodes(v: unknown, path: string): asserts v is NodeData[] {
  assert(Array.isArray(v), 'nodes must be an array', path);
  for (let i = 0; i < v.length; i++) validateNode(v[i], `${path}[${i}]`);
}

/**
 * 解析输入为 doc（仅支持最新格式）
 */
export function parseDoc(input: unknown): InfiniteMapDoc {
  assert(isObject(input), 'doc must be an object', 'doc');

  assert('schemaVersion' in input, 'schemaVersion is required', 'doc.schemaVersion');
  const sv = (input as any).schemaVersion;
  assert(typeof sv === 'number', 'schemaVersion must be a number', 'doc.schemaVersion');
  assert(sv === DOC_SCHEMA_VERSION, `Unsupported doc schemaVersion: ${sv}（v1 的相机坐标系已变更为视口中心原点，请用新版编辑器重新导出文件。）`, 'doc.schemaVersion');

  validateNodes((input as any).nodes, 'doc.nodes');
  validateCamera((input as any).camera, 'doc.camera');
  // resources/meta 为可选，暂不做深校验（由宿主约束）
  return input as InfiniteMapDoc;
}

/**
 * 将当前状态导出为 doc（最新版本）
 * - 默认不做深拷贝：由宿主决定是否在落盘前 clone（例如 structuredClone）
 */
export function serializeDoc(input: {
  nodes: NodeData[];
  camera: Camera;
  resources?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}): InfiniteMapDoc {
  return {
    schemaVersion: DOC_SCHEMA_VERSION,
    nodes: input.nodes,
    camera: input.camera,
    resources: input.resources ?? {},
    meta: input.meta,
  };
}
