import { describe, expect, it } from 'vitest';
import { exportDoc, importDoc, DOC_SCHEMA_VERSION } from '../editor/document';

describe('doc schema', () => {
  it('exportDoc returns doc with schemaVersion', () => {
    const doc = exportDoc({
      nodes: [{ id: 'a', x: 0, y: 0, width: 10, height: 10 }],
      camera: { x: 1, y: 2, zoom: 3 },
      meta: { foo: 'bar' },
    });
    expect(doc.schemaVersion).toBe(DOC_SCHEMA_VERSION);
    expect(doc.nodes[0].id).toBe('a');
    expect(doc.camera.zoom).toBe(3);
    expect(doc.meta?.foo).toBe('bar');
  });

  it('importDoc accepts current schema only', () => {
    const doc = importDoc({
      schemaVersion: DOC_SCHEMA_VERSION,
      nodes: [{ id: 'a', x: 0, y: 0, width: 10, height: 10 }],
      camera: { x: 1, y: 2, zoom: 3 },
      resources: {},
    });
    expect(doc.schemaVersion).toBe(DOC_SCHEMA_VERSION);
  });

  it('importDoc throws on invalid doc', () => {
    expect(() => importDoc(null)).toThrow();
    expect(() => importDoc({ schemaVersion: DOC_SCHEMA_VERSION, nodes: [], camera: { x: 0, y: 0 } })).toThrow();
    expect(() => importDoc({ nodes: [], camera: { x: 0, y: 0, zoom: 1 } })).toThrow();
  });
});
