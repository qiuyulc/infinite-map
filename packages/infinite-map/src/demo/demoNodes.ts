import type { NodeData } from '../core/types';

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 生成一些 demo 节点：你可以用自己的数据替换。
 */
export function makeDemoNodes(count = 70): NodeData[] {
  const rand = mulberry32(42);
  const nodes: NodeData[] = [];
  const palette = [
    'rgba(120, 180, 255, 0.80)',
    'rgba(180, 120, 255, 0.75)',
    'rgba(120, 255, 210, 0.70)',
    'rgba(255, 170, 120, 0.75)',
  ];

  // 分布成几个“簇”
  const centers = [
    { x: -900, y: -500 },
    { x: 900, y: -200 },
    { x: -300, y: 800 },
    { x: 1200, y: 900 },
  ];

  for (let i = 0; i < count; i++) {
    const c = centers[Math.floor(rand() * centers.length)];
    const w = 170 + rand() * 110;
    const h = 72 + rand() * 70;
    const x = c.x + (rand() - 0.5) * 1600;
    const y = c.y + (rand() - 0.5) * 1200;

    nodes.push({
      id: `node-${i + 1}`,
      x,
      y,
      width: w,
      height: h,
      label: `Node ${i + 1}`,
      color: palette[i % palette.length],
    });
  }

  return nodes;
}

