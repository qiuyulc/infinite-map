import { describe, expect, it } from 'vitest';
import { createDefaultEditorPluginsWithUI } from '../createDefaultEditorPluginsWithUI';

describe('createDefaultEditorPluginsWithUI', () => {
  it('respects enabled flags for HUD plugins', () => {
    const plugins = createDefaultEditorPluginsWithUI({
      hoverHighlight: { enabled: false },
      toolbar: { enabled: true },
      zoomDock: { enabled: false },
      contextMenu: { enabled: true },
      rulers: { enabled: false },
      minimap: { enabled: false },
      marquee: { enabled: false },
    });
    const ids = plugins.map((p) => p.id);
    expect(ids).toContain('toolbar');
    // createDefaultContextMenuPlugin 的 id
    expect(ids).toContain('contextmenu-ui');
    expect(ids).not.toContain('hover-highlight');
    expect(ids).not.toContain('zoom-dock');
    expect(ids).not.toContain('rulers');
    expect(ids).not.toContain('minimap');
    expect(ids).not.toContain('marquee-select');
  });

  it('marqueeRequireShift is forwarded', () => {
    const plugins = createDefaultEditorPluginsWithUI({ marquee: { requireShift: true } });
    const marquee = plugins.find((p) => p.id === 'marquee-select') as any;
    expect(marquee).toBeTruthy();
  });
});
