import { test, expect } from '@playwright/test';

test('playground loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('本地测试面板')).toBeVisible();
  // 核心画布根节点
  await expect(page.locator('[data-im-theme]')).toBeVisible();
});

test('click selects a node (selection overlay appears)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('本地测试面板')).toBeVisible();

  // 默认有 “Chart 0/1/2”
  const nodeTitle = page.getByText('Chart 0').first();
  await expect(nodeTitle).toBeVisible();
  await nodeTitle.click();

  // 选中后，SelectionOverlay 会渲染带 data-handle/data-nodeid 的控制点
  await expect(page.locator('[data-handle][data-nodeid]').first()).toBeVisible();
  // 不强依赖具体 nodeId（demo 节点生成策略可能调整）
});

test('drag moves a node (bounding box changes)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('本地测试面板')).toBeVisible();

  const node = page.getByText('Chart 0').first();
  await expect(node).toBeVisible();

  const before = await node.boundingBox();
  expect(before).toBeTruthy();

  // 拖动：使用页面坐标拖拽节点
  await node.hover();
  await page.mouse.down();
  await page.mouse.move((before!.x ?? 0) + 160, (before!.y ?? 0) + 10);
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
