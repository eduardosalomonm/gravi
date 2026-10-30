import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANET_FLOWERS,
  PLANET_GRASS,
  PLANET_MEADOW_PATCHES,
  PLANET_PLATFORMS,
  PLANET_ROCKS,
  PLANET_SHRUBS,
  PLANET_SOLIDS,
  PLANET_TREES,
  PLANET_TRAIL,
  surfaceDistance,
} from '../lib/planet-world.mjs';

test('every visible large planet object has one solid collider', () => {
  const visibleIds = [
    ...PLANET_PLATFORMS,
    ...PLANET_TREES,
    ...PLANET_ROCKS,
    ...PLANET_SHRUBS,
  ].map((item) => item.id);
  const solidIds = PLANET_SOLIDS.map((item) => item.id);
  assert.equal(new Set(visibleIds).size, visibleIds.length);
  assert.deepEqual(new Set(solidIds), new Set(visibleIds));
});

test('all planet objects are normalized, positive and separated', () => {
  for (const solid of PLANET_SOLIDS) {
    const magnitude = Math.hypot(
      solid.direction.x,
      solid.direction.y,
      solid.direction.z,
    );
    assert.ok(Math.abs(magnitude - 1) < 1e-10, solid.id);
    assert.ok(solid.radius > 0, solid.id);
    assert.ok(solid.height > 0, solid.id);
  }
  for (const decoration of [
    ...PLANET_GRASS.map((direction) => ({ direction })),
    ...PLANET_FLOWERS,
    ...PLANET_MEADOW_PATCHES,
    ...PLANET_TRAIL,
  ]) {
    const magnitude = Math.hypot(
      decoration.direction.x,
      decoration.direction.y,
      decoration.direction.z,
    );
    assert.ok(Math.abs(magnitude - 1) < 1e-10);
  }
  for (let i = 0; i < PLANET_SOLIDS.length; i += 1) {
    for (let j = i + 1; j < PLANET_SOLIDS.length; j += 1) {
      const first = PLANET_SOLIDS[i];
      const second = PLANET_SOLIDS[j];
      assert.ok(
        surfaceDistance(first.direction, second.direction) >=
          first.radius + second.radius,
        `${first.id} overlaps ${second.id}`,
      );
    }
  }
});

test('every solid object blocks sides and catches a radial landing', () => {
  for (const solid of PLANET_SOLIDS) {
    assert.equal(solid.supportTop, true, solid.id);
  }
});
