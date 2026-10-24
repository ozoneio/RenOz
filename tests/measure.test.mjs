import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import { Group, Object3D, Vector2, Vector3 } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const server = await createServer({ server: { middlewareMode: true, ws: false, watch: null }, appType: 'custom' });
after(() => server.close());
const { MeasureTool } = await server.ssrLoadModule('/src/tools/measure.ts');

test('measurement preview reuses position and dash buffers as the pointer moves', () => {
  const geometry = new LineGeometry().setPositions([0, 0, 0, 0, 0, 0]);
  const material = new LineMaterial();
  const preview = new Line2(geometry, material).computeLineDistances();
  const point = new Vector3();
  const text = {};
  const tool = Object.assign(Object.create(MeasureTool.prototype), {
    active: true, shift: false, units: 'metric', start: new Vector3(1, 2, 3),
    camera: { position: new Vector3(0, 2, 0) },
    cursor: new Object3D(), cursorMats: {}, preview,
    previewLabel: { position: new Vector3(), element: { querySelector: () => text } },
    pick: () => ({ p: point, kind: 'surface' }),
  });
  const positionBuffer = geometry.getAttribute('instanceStart').data;
  const distanceBuffer = geometry.getAttribute('instanceDistanceEnd').data;
  try {
    for (let i = 0; i < 1000; i++) {
      point.set(i, 2, 15);
      tool.hover(new Vector2());
      assert.equal(geometry.getAttribute('instanceStart').data, positionBuffer);
      assert.equal(geometry.getAttribute('instanceEnd').data, positionBuffer);
      assert.equal(geometry.getAttribute('instanceDistanceEnd').data, distanceBuffer);
    }
    assert.deepEqual(Array.from(positionBuffer.array), [1, 2, 3, 999, 2, 15]);
    assert.ok(Math.abs(distanceBuffer.array[1] - tool.start.distanceTo(point)) < 0.001);
    assert.ok(geometry.boundingBox.containsPoint(point));
    assert.ok(geometry.boundingSphere.containsPoint(point));
    assert.equal(text.textContent, `${tool.start.distanceTo(point).toFixed(3)} m`);
    assert.ok(preview.visible);
  } finally {
    geometry.dispose();
    material.dispose();
  }
});

test('undo releases the measurement geometry and removes its label and endpoints', () => {
  let disposed = 0, removed = 0, changed = 0;
  const line = new Line2(new LineGeometry(), new LineMaterial());
  line.geometry.addEventListener('dispose', () => disposed++);
  const label = Object.assign(new Object3D(), { element: { remove: () => removed++ } });
  const ends = [new Object3D(), new Object3D()];
  const group = new Group();
  group.add(line, label, ...ends);
  const tool = Object.assign(Object.create(MeasureTool.prototype), {
    group, list: [{ line, label, ends }], onChange: () => changed++,
  });
  tool.undo();
  tool.undo();
  assert.equal(disposed, 1);
  assert.equal(removed, 1);
  assert.equal(changed, 1);
  assert.equal(tool.count(), 0);
  assert.equal(group.children.length, 0);
  line.material.dispose();
});
