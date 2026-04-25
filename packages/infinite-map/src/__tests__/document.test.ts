import { describe, expect, it } from 'vitest';
import { exportDoc, importDoc, DOC_SCHEMA_VERSION } from '../editor/document';

describe('doc schema', () => {
  it('exportDoc returns v1 with schemaVersion', () => {
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

  it('importDoc accepts legacy v0 (no schemaVersion)', () => {
    const doc = importDoc({
      nodes: [{ id: 'a', x: 0, y: 0, width: 10, height: 10 }],
      camera: { x: 1, y: 2, zoom: 3 },
    });
    expect(doc.schemaVersion).toBe(DOC_SCHEMA_VERSION);
  });

  it('importDoc migrates v1 -> latest', () => {
    const doc = importDoc({
      schemaVersion: 1,
      nodes: [{ id: 'a', x: 0, y: 0, width: 10, height: 10 }],
      camera: { x: 1, y: 2, zoom: 3 },
    });
    expect(doc.schemaVersion).toBe(DOC_SCHEMA_VERSION);
    expect(doc.resources).toBeDefined();
  });

  it('importDoc throws on invalid doc', () => {
    expect(() => importDoc(null)).toThrow();
    expect(() => importDoc({ schemaVersion: 1, nodes: [], camera: { x: 0, y: 0 } })).toThrow();
  });
});
