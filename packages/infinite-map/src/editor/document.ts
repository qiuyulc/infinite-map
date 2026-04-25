import type { Camera, NodeData } from '../core/types';

/**
 * Doc schema version（对外持久化格式）
 * - 只要格式有 breaking change，就递增 schemaVersion，并在 migrations 中补迁移
 */
export const DOC_SCHEMA_VERSION = 2 as const;

/**
 * v2：在 v1 基础上新增资源表（resources）
 * - resources：宿主可选择把“大对象业务数据”落盘到这里（key 通常为 node.resourceId）
 *   这样 nodes.data 可以保持轻量，便于协作/历史/迁移。
 */
export type InfiniteMapDocV2 = {
  schemaVersion: 2;
  nodes: NodeData[];
  camera: Camera;
  resources?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

/**
 * v1：最小持久化格式
 * - nodes：完整节点列表（包含 group/parentId 等结构字段）
 * - camera：当前相机
 * - meta：可选元信息（宿主可自行扩展；库不解释其含义）
 */
export type InfiniteMapDocV1 = {
  schemaVersion: 1;
  nodes: NodeData[];
  camera: Camera;
  meta?: Record<string, unknown>;
};

/**
 * v0（legacy）：历史上可能存在的“无 schemaVersion”直出结构
 * - 用于兼容宿主在引入 schemaVersion 前已经落盘的旧数据
 */
export type InfiniteMapDocLegacyV0 = {
  nodes: NodeData[];
  camera: Camera;
  meta?: Record<string, unknown>;
};

export type InfiniteMapDoc = InfiniteMapDocV2;

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
 * 将任意输入解析为最新版本 doc（含迁移）
 */
export function importDoc(input: unknown): InfiniteMapDocV2 {
  assert(isObject(input), 'doc must be an object', 'doc');

  // v1/v2
  if ('schemaVersion' in input) {
    const sv = (input as any).schemaVersion;
    assert(typeof sv === 'number', 'schemaVersion must be a number', 'doc.schemaVersion');
    if (sv === 2) {
      validateNodes((input as any).nodes, 'doc.nodes');
      validateCamera((input as any).camera, 'doc.camera');
      // resources/meta 为可选，暂不做深校验（由宿主约束）
      return input as InfiniteMapDocV2;
    }
    if (sv === 1) {
      validateNodes((input as any).nodes, 'doc.nodes');
      validateCamera((input as any).camera, 'doc.camera');
      return migrateV1ToV2(input as InfiniteMapDocV1);
    }
    throw new Error(`Unsupported doc schemaVersion: ${sv}`);
  }

  // legacy v0：没有 schemaVersion，但包含 nodes + camera
  validateNodes((input as any).nodes, 'doc.nodes');
  validateCamera((input as any).camera, 'doc.camera');
  const legacy = input as InfiniteMapDocLegacyV0;
  return migrateV1ToV2(migrateV0ToV1(legacy));
}

/**
 * 将当前状态导出为 doc（最新版本）
 * - 默认不做深拷贝：由宿主决定是否在落盘前 clone（例如 structuredClone）
 */
export function exportDoc(input: {
  nodes: NodeData[];
  camera: Camera;
  resources?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}): InfiniteMapDocV2 {
  return {
    schemaVersion: 2,
    nodes: input.nodes,
    camera: input.camera,
    resources: input.resources ?? {},
    meta: input.meta,
  };
}

function migrateV0ToV1(v0: InfiniteMapDocLegacyV0): InfiniteMapDocV1 {
  return {
    schemaVersion: 1,
    nodes: v0.nodes,
    camera: v0.camera,
    meta: v0.meta,
  };
}

function migrateV1ToV2(v1: InfiniteMapDocV1): InfiniteMapDocV2 {
  return {
    schemaVersion: 2,
    nodes: v1.nodes,
    camera: v1.camera,
    resources: {},
    meta: v1.meta,
  };
}
