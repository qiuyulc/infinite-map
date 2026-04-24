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

  // 默认有 “Chart 0/1/2”
  const nodeTitle = await pickVisible(page.getByText('Chart 0'));
  await expect(nodeTitle).toBeVisible();
  await nodeTitle.click();

  // 选中后，SelectionOverlay 会渲染带 data-handle/data-nodeid 的控制点
  await expect(page.locator('[data-handle][data-nodeid]').first()).toBeVisible();
  // 不强依赖具体 nodeId（demo 节点生成策略可能调整）
});

test('drag moves a node (bounding box changes)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('本地测试面板')).toBeVisible();

  const node = await pickVisible(page.getByText('Chart 0'));
  await expect(node).toBeVisible();

  const before = await node.boundingBox();
  expect(before).toBeTruthy();

  // 拖动：使用页面坐标拖拽节点
  const startX = before!.x + Math.min(20, before!.width / 2);
  const startY = before!.y + Math.min(10, before!.height / 2);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 160, startY + 10);
  await page.mouse.up();

  const after = await node.boundingBox();
  expect(after).toBeTruthy();
  expect(after!.x).toBeGreaterThan(before!.x + 20);
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
