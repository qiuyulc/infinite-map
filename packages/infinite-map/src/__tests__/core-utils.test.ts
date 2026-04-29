import { describe, expect, it } from 'vitest';
import { clamp, cssVar, cssVarNum, cssVarRgb } from '../core/utils';

describe('core/utils', () => {
  it('clamp clamps into range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it('cssVar reads CSS variables with fallback', () => {
    document.documentElement.style.setProperty('--im-test-var', '  hello  ');
    expect(cssVar('--im-test-var', 'fallback')).toBe('hello');
    expect(cssVar('--im-missing', 'fallback')).toBe('fallback');
  });

  it('cssVarRgb normalizes "R G B" to "R, G, B"', () => {
    document.documentElement.style.setProperty('--im-test-rgb', '80 170 255');
    expect(cssVarRgb('--im-test-rgb', '1 2 3')).toBe('80, 170, 255');
    // already comma separated should remain
    document.documentElement.style.setProperty('--im-test-rgb2', '1, 2, 3');
    expect(cssVarRgb('--im-test-rgb2', '9 9 9')).toBe('1, 2, 3');
  });

  it('cssVarNum parses numbers and falls back', () => {
    document.documentElement.style.setProperty('--im-test-num', '12.5');
    expect(cssVarNum('--im-test-num', 3)).toBe(12.5);
    document.documentElement.style.setProperty('--im-test-num2', 'not-a-number');
    expect(cssVarNum('--im-test-num2', 3)).toBe(3);
  });
});

