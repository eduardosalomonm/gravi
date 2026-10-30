import { PLANET_RADIUS as R } from '../lib/planet-world.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { navigation, coordinates } from '../lib/navigation.mjs';
const target = (direction, height = 0) => ({ direction, height });
test('GPS uses surface distance independent of flight altitude', () => {
  const a = navigation(
    { x: R, y: 0, z: 0 },
    { x: 0, y: 0, z: -1 },
    target({ x: 0, y: 0, z: -1 }),
  );
  const b = navigation(
    { x: 90, y: 0, z: 0 },
    { x: 0, y: 0, z: -1 },
    target({ x: 0, y: 0, z: -1 }),
  );
  assert.ok(Math.abs(a.distance - (R * Math.PI) / 2) < 1e-8);
  assert.equal(a.distance, b.distance);
  assert.equal(b.vertical, 'Más abajo');
});
test('camera-relative guidance points right and left without inverted controls', () => {
  const s = { x: 0, y: R, z: 0 },
    f = { x: 0, y: 0, z: -1 };
  assert.equal(navigation(s, f, target({ x: 1, y: 0, z: 0 })).angle, 90);
  assert.equal(navigation(s, f, target({ x: -1, y: 0, z: 0 })).angle, -90);
});
test('poles and antipodes give finite guidance with undefined heading suppressed', () => {
  const n = navigation(
    { x: 0, y: R, z: 0 },
    { x: 0, y: 0, z: -1 },
    target({ x: 0, y: -1, z: 0 }),
  );
  assert.equal(n.heading, null);
  assert.equal(n.antipodal, true);
  assert.equal(n.angle, 0);
  assert.ok(Number.isFinite(n.distance));
  assert.equal(coordinates({ x: 0, y: -R, z: 0 }).latitude, -90);
});
test('near zone replaces precise guidance and reports vertical differences', () => {
  const n = navigation(
    { x: 0, y: R, z: 0 },
    { x: 0, y: 0, z: -1 },
    target({ x: 0, y: 1, z: 0 }, 4.8),
  );
  assert.equal(n.near, true);
  assert.equal(n.vertical, 'Más arriba');
});
test('longitude wraps continuously as directions cross the map seam', () => {
  const a = coordinates({ x: 0.001, y: 0, z: R }),
    b = coordinates({ x: -0.001, y: 0, z: R });
  assert.ok(a.longitude < -179);
  assert.ok(b.longitude > 179);
  const n = navigation(
    { x: 0.001, y: 0, z: R },
    { x: -1, y: 0, z: 0 },
    target({ x: -0.001, y: 0, z: R }),
  );
  assert.ok(n.distance < 0.01);
});
test('east on the compass agrees with increasing longitude', () => {
  const n = navigation({ x: 0, y: 0, z: -R }, { x: -1, y: 0, z: 0 }, null);
  assert.equal(n.heading, 90);
  assert.ok(coordinates({ x: -0.1, y: 0, z: -R }).longitude > 0);
});
