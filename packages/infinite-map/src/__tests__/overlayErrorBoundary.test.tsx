import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { OverlayErrorBoundary } from '../components/OverlayErrorBoundary';

afterEach(() => cleanup());

describe('OverlayErrorBoundary', () => {
  it('reports error and renders null when child throws', () => {
    const onError = vi.fn();
    // React 在 child throw 时会向 console.error 打印错误堆栈（即使被 ErrorBoundary 捕获）。
    // 这是预期行为，但会让测试输出看起来像“报错”。这里静默掉本用例的 console.error。
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => void 0);
    const Bad = () => {
      throw new Error('boom');
    };
    const { container } = render(
      <OverlayErrorBoundary info={{ pluginId: 'p1', slot: 'overlay' }} onError={onError}>
        <Bad />
      </OverlayErrorBoundary>
    );
    expect(onError).toHaveBeenCalled();
    expect(container.firstChild).toBeNull();
    consoleError.mockRestore();
  });
});
