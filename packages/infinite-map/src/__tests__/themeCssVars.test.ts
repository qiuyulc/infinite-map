import { describe, expect, it } from 'vitest';
import { darkTheme, lightTheme, mergeTheme, themeOverrideToCSSVars, themeToCSSVars } from '../theme';

describe('theme helpers', () => {
  it('mergeTheme merges override onto base', () => {
    const t = mergeTheme(lightTheme, { mapBg: 'red' });
    expect(t.mapBg).toBe('red');
    expect(t.nodeBg).toBe(lightTheme.nodeBg);
  });

  it('themeToCSSVars generates full variable map', () => {
    const vars = themeToCSSVars(darkTheme);
    expect(vars['--im-map-bg']).toBe(darkTheme.mapBg);
    expect(vars['--im-node-bg']).toBe(darkTheme.nodeBg);
    expect(vars['--im-toolbar-btn-text']).toBe(darkTheme.toolbarBtnText);
  });

  it('themeOverrideToCSSVars only outputs provided fields', () => {
    const vars = themeOverrideToCSSVars({ mapBg: 'red', nodeRadius: 12 });
    expect(vars).toEqual({ '--im-map-bg': 'red', '--im-node-radius': '12' });
  });
});
