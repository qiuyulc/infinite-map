import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InfiniteMapThemeProvider } from '../components/InfiniteMapThemeProvider';
import { useThemeVersion } from '../hooks/useThemeVersion';
import { act } from 'react';

function VersionReader() {
  const v = useThemeVersion();
  return <div data-testid="v">{v}</div>;
}

describe('InfiniteMapThemeProvider', () => {
  it('renders children and sets base attribute', () => {
    render(
      <InfiniteMapThemeProvider base="dark">
        <div data-testid="child">ok</div>
      </InfiniteMapThemeProvider>
    );
    const child = screen.getByTestId('child');
    // provider is display:contents, so parentElement should have data-im-theme
    expect(child.parentElement).toHaveAttribute('data-im-theme', 'dark');
  });

  it('increments theme version when base changes', () => {
    const { rerender } = render(
      <InfiniteMapThemeProvider base="light">
        <VersionReader />
      </InfiniteMapThemeProvider>
    );
    const v0 = Number(screen.getByTestId('v').textContent);
    act(() => {
      rerender(
        <InfiniteMapThemeProvider base="dark">
          <VersionReader />
        </InfiniteMapThemeProvider>
      );
    });
    const v1 = Number(screen.getByTestId('v').textContent);
    expect(v1).toBe(v0 + 1);
  });
});

