import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useThemeVersion } from '../hooks/useThemeVersion';

afterEach(() => cleanup());

function Reader() {
  const v = useThemeVersion();
  return <div data-testid="v">{v}</div>;
}

describe('useThemeVersion (fallback mode)', () => {
  it('increments when data-theme changes', async () => {
    // ensure matchMedia exists for this test
    const listeners: Array<() => void> = [];
    const mm = {
      addEventListener: (_: string, fn: any) => listeners.push(fn),
      removeEventListener: (_: string, fn: any) => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      },
    };
    const old = window.matchMedia;
    (window as any).matchMedia = () => mm;

    render(<Reader />);
    const v0 = Number(screen.getByTestId('v').textContent);

    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      // let MutationObserver flush
      await new Promise((r) => setTimeout(r, 0));
    });

    const v1 = Number(screen.getByTestId('v').textContent);
    expect(v1).toBeGreaterThanOrEqual(v0 + 1);

    // trigger matchMedia change
    await act(async () => {
      listeners.forEach((fn) => fn());
    });
    const v2 = Number(screen.getByTestId('v').textContent);
    expect(v2).toBeGreaterThanOrEqual(v1 + 1);

    (window as any).matchMedia = old;
  });
});

