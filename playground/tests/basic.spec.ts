import { test, expect } from '@playwright/test';

async function pickVisible(locator: ReturnType<import('@playwright/test').Page['locator']>) {
  const count = await locator.count();
  const vp = locator.page().viewportSize() ?? { width: 1280, height: 720 };
  for (let i = 0; i < count; i++) {
    const el = locator.nth(i);
    const box = await el.boundingBox();
    if (!box) continue;
    // 认为“在视口内”的元素：其中心点落在 viewport 范围内
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    if (cx >= 0 && cy >= 0 && cx <= vp.width && cy <= vp.height) return el;
  }
  // 兜底：返回第一个（让后续报错更直观）
  return locator.first();
}

async function pointerTapOnMap(mapRoot: ReturnType<import('@playwright/test').Page['locator']>, clientX: number, clientY: number) {
  await mapRoot.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX, clientY });
  await mapRoot.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX, clientY });
}

async function pointerDragOnMap(
  mapRoot: ReturnType<import('@playwright/test').Page['locator']>,
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  await mapRoot.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: from.x, clientY: from.y });
  // 多步 move，更贴近真实拖拽
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await mapRoot.dispatchEvent('pointermove', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientX: x, clientY: y });
  }
  await mapRoot.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, clientX: to.x, clientY: to.y });
}

test('playground loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('本地测试面板')).toBeVisible();
  // 核心画布根节点
  const mapRoot = await pickVisible(page.locator('[data-im-theme]'));
  await expect(mapRoot).toBeVisible();
});

test('click selects a node (selection overlay appears)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('本地测试面板')).toBeVisible();

  const mapRoot = await pickVisible(page.locator('[data-im-theme]'));
  // 不强依赖具体文案（节点布局/命名可能调整），选择一个“在视口内”的节点标题即可
  const nodeTitle = await pickVisible(page.locator('.im-node-title'));
  await expect(nodeTitle).toBeVisible();
  // 用 pointer 事件直接点在 mapRoot 上（InfiniteMap 监听的是 pointer capture），避免 mouse/click 兼容差异
  const box = await nodeTitle.boundingBox();
  expect(box).toBeTruthy();
  await pointerTapOnMap(mapRoot, box!.x + box!.width / 2, box!.y + box!.height / 2);

  // 选中后，SelectionOverlay 会渲染带 data-handle/data-nodeid 的控制点
  await expect(page.locator('[data-handle][data-nodeid]').first()).toBeVisible();
  // 不强依赖具体 nodeId（demo 节点生成策略可能调整）
});

test('drag moves a node (bounding box changes)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('本地测试面板')).toBeVisible();

  const mapRoot = await pickVisible(page.locator('[data-im-theme]'));
  const node = await pickVisible(page.locator('.im-node-title'));
  await expect(node).toBeVisible();

  const before = await node.boundingBox();
  expect(before).toBeTruthy();

  // 拖动：使用页面坐标拖拽节点
  const startX = before!.x + before!.width / 2;
  const startY = before!.y + before!.height / 2;
  await pointerDragOnMap(mapRoot, { x: startX, y: startY }, { x: startX + 200, y: startY + 20 });
  await page.waitForTimeout(50);

  const after = await node.boundingBox();
  expect(after).toBeTruthy();
  // 只要求发生明显位移（避免不同吸附/边界策略下方向不一致导致 flaky）
  const dx = Math.abs(after!.x - before!.x);
  const dy = Math.abs(after!.y - before!.y);
  expect(Math.max(dx, dy)).toBeGreaterThan(10);
});

test('minimap exists and clicking it changes camera transform', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('本地测试面板')).toBeVisible();

  // 主内容容器 transform 是 camera 变化的直接表现
  const worldLayer = page.locator('div[style*="translate3d"][style*="scale"]').first();
  const beforeTransform = await worldLayer.getAttribute('style');
  expect(beforeTransform).toContain('translate3d');

  const minimapCanvas = page.locator('div[data-im-ui] canvas').first();
  await expect(minimapCanvas).toBeVisible();
  const box = await minimapCanvas.boundingBox();
  expect(box).toBeTruthy();

  await page.mouse.click(box!.x + 10, box!.y + 10);

  await expect.poll(async () => worldLayer.getAttribute('style')).not.toBe(beforeTransform);
});
