import { PLANET_RADIUS as R } from '../lib/planet-world.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { canopyCollider, canopySupport } from '../lib/canopy.mjs';
import {
  forestPoint,
  FOREST_CANOPIES,
  SAKURA_CANOPIES,
  awakenedSolids,
} from '../lib/awakening.mjs';
import {
  createPlanetState,
  stepPlanet,
  planetSupportAt,
} from '../lib/planet-physics.mjs';
const scale = (v, r) => ({ x: v.x * r, y: v.y * r, z: v.z * r });
const idle = { x: 0, y: 0, z: 0, jump: false };
test('canopy frame and ray contact match Three render transforms', () => {
  const direction = forestPoint(-15, -24),
    local = [0.8, 4.2, -0.7],
    size = [1.4, 0.85, 1.1],
    spin = 1.1;
  const solid = canopyCollider('test', direction, local, size, spin);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3().copy(direction),
  );
  const expected = new THREE.Vector3(...local)
    .applyQuaternion(q)
    .addScaledVector(new THREE.Vector3().copy(direction), R);
  assert.ok(expected.distanceTo(new THREE.Vector3().copy(solid.center)) < 1e-8);
  const radius = canopySupport(solid.direction, solid);
  const contact = new THREE.Vector3()
    .copy(solid.direction)
    .multiplyScalar(radius)
    .sub(expected)
    .applyQuaternion(q.clone().invert())
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), -spin);
  assert.ok(
    Math.abs(
      contact.x ** 2 / size[0] ** 2 +
        contact.y ** 2 / size[1] ** 2 +
        contact.z ** 2 / size[2] ** 2 -
        1,
    ) < 1e-8,
  );
});
test('all leafy and blossomed crowns catch Jupiter falls above their curved surfaces', () => {
  const solids = awakenedSolids(['flowers', 'petals', 'sky']);
  for (const crown of [...FOREST_CANOPIES, ...SAKURA_CANOPIES]) {
    const support = planetSupportAt(scale(crown.direction, R), solids),
      s = createPlanetState();
    s.position = scale(crown.direction, support.radius + 0.25);
    s.velocity = scale(crown.direction, -12);
    s.grounded = false;
    stepPlanet(s, idle, 24.79, 0.05, solids);
    assert.equal(s.grounded, true, crown.id);
    assert.equal(s.supportId, support.id);
    assert.ok(
      Math.abs(
        Math.hypot(s.position.x, s.position.y, s.position.z) - support.radius,
      ) < 1e-8,
      crown.id,
    );
  }
});
test('branches leave room to walk underneath; jumping into a canopy stops at its underside', () => {
  const canopy = canopyCollider(
    'canopy',
    { x: 0, y: 1, z: 0 },
    [0, 3.5, 0],
    [1.5, 0.8, 1.5],
  );
  const s = createPlanetState();
  for (let i = 0; i < 40; i++)
    stepPlanet(s, { ...idle, x: 0.2 }, 9.81, undefined, [canopy]);
  assert.ok(s.position.x > 0.1);
  assert.equal(s.grounded, true);
  stepPlanet(s, { ...idle, jump: true }, 1.62, undefined, [canopy]);
  let highest = 0;
  for (let i = 0; i < 200; i++) {
    stepPlanet(s, idle, 1.62, undefined, [canopy]);
    highest = Math.max(
      highest,
      Math.hypot(s.position.x, s.position.y, s.position.z) - R,
    );
  }
  assert.ok(
    highest < 1.5,
    `head should hit underside, feet reached ${highest}`,
  );
});
test('dormant sakuras do not have invisible flower colliders', () => {
  assert.ok(!awakenedSolids([]).some((s) => s.id.includes('-crown-')));
  assert.equal(
    awakenedSolids(['flowers']).filter((s) => s.id.includes('-crown-')).length,
    3,
  );
});
