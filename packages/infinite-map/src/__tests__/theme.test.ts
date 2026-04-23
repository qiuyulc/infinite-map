import { describe, expect, it } from 'vitest';
import { themeOverrideToCSSVars } from '../theme';

describe('themeOverrideToCSSVars', () => {
  it('only outputs vars for provided override keys', () => {
    const vars = themeOverrideToCSSVars({ mapBg: 'red', nodeRadius: '8px' });
    expect(vars['--im-map-bg']).toBe('red');
    expect(vars['--im-node-radius']).toBe('8px');

    // keys not provided should be absent
    expect((vars as Record<string, string>)['--im-map-dot']).toBeUndefined();
    expect((vars as Record<string, string>)['--im-node-bg']).toBeUndefined();
  });
});

