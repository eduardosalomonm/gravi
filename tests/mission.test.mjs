import test from 'node:test';
import assert from 'node:assert/strict';
import { AWAKENINGS, awakeningById } from '../lib/awakening.mjs';
import { PLANET_RADIUS, normalizeDirection } from '../lib/planet-world.mjs';
import { nearestOpenAdventure } from '../lib/mission.mjs';

const forestAt = (direction, completed = []) => {
  const up = normalizeDirection(direction);
  return {
    position: {
      x: up.x * PLANET_RADIUS,
      y: up.y * PLANET_RADIUS,
      z: up.z * PLANET_RADIUS,
    },
    completed,
    discovered: [],
    visitedRegions: [],
    finale: { stage: 0, flower: 0, path: 0, jump: 0, dwell: 0 },
    petalStep: 0,
    skyStep: 0,
    ridgeStep: 0,
    lanternStep: 0,
    windStep: 0,
    riverStep: 0,
    reflectionStep: 0,
    stones: [],
  };
};

test('sugiere la aventura dormida más cercana', () => {
  const flowers = awakeningById('flowers');
  assert.equal(nearestOpenAdventure(forestAt(flowers.direction)).id, 'flowers');
});

test('salta las aventuras ya florecidas y el final bloqueado', () => {
  const flowers = awakeningById('flowers');
  const next = nearestOpenAdventure(forestAt(flowers.direction, ['flowers']));
  assert.notEqual(next.id, 'flowers');
  assert.notEqual(next.id, 'journey');
});

test('con los diez sakuras despiertos no queda nada que sugerir', () => {
  const all = AWAKENINGS.map((item) => item.id);
  assert.equal(nearestOpenAdventure(forestAt({ x: 0, y: 1, z: 0 }, all)), null);
});
