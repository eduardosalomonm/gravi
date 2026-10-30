import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_REGIONS } from '../lib/world-layout.mjs';
import { PLANET_RADIUS, surfaceDistance } from '../lib/planet-world.mjs';
import {
  AWAKENINGS,
  SKY_STEPS,
  RIDGE_STEPS,
  WIND_STEPS,
  WIND_PILLARS,
  RIVER_STOPS,
  createAwakeningState,
  advanceAwakening,
  awakenedSolids,
} from '../lib/awakening.mjs';
import {
  createPlanetState,
  stepPlanet,
  planetSupportAt,
} from '../lib/planet-physics.mjs';
import { canopyCollider } from '../lib/canopy.mjs';
import {
  decodeProgress,
  saveProgress,
  defaultProgress,
} from '../lib/progress.mjs';
const scale = (d, r) => ({ x: d.x * r, y: d.y * r, z: d.z * r });
test('compact planet distributes ten separate regions across both hemispheres and poles', () => {
  assert.equal(PLANET_RADIUS, 36);
  assert.equal(WORLD_REGIONS.length, 10);
  assert.ok(WORLD_REGIONS.some((r) => r.direction.y > 0.99));
  assert.ok(WORLD_REGIONS.slice(0, 9).some((r) => r.direction.y < -0.99));
  for (let i = 0; i < 10; i++)
    for (let j = i + 1; j < 10; j++)
      assert.ok(
        surfaceDistance(
          WORLD_REGIONS[i].direction,
          WORLD_REGIONS[j].direction,
        ) > 32,
      );
  for (const item of AWAKENINGS) {
    const region = WORLD_REGIONS.find((r) => r.id === item.id);
    assert.ok(surfaceDistance(item.direction, region.direction) < 14, item.id);
    assert.ok(surfaceDistance(item.tree, region.direction) < 14, item.id);
  }
});
test('all relocated stepping surfaces catch Jupiter landings at their physical top', () => {
  const solids = awakenedSolids([]);
  for (const step of [
    ...SKY_STEPS,
    ...RIDGE_STEPS,
    ...WIND_STEPS,
    ...RIVER_STOPS.filter((s) => s.height > 0),
  ]) {
    const s = createPlanetState(),
      support = planetSupportAt(scale(step.direction, PLANET_RADIUS), solids);
    assert.equal(support.id, step.id);
    s.position = scale(step.direction, support.radius + 0.15);
    s.velocity = scale(step.direction, -20);
    s.grounded = false;
    stepPlanet(s, { x: 0, y: 0, z: 0, jump: false }, 24.79, 0.025, solids);
    assert.equal(s.supportId, step.id);
    assert.equal(s.grounded, true);
  }
});
test('canopy frame stays finite at the south pole', () => {
  const c = canopyCollider(
    'south',
    { x: 0, y: -1, z: 0 },
    [1, 4, 0],
    [1, 0.5, 1],
  );
  for (const v of [c.center, ...c.axes])
    for (const n of Object.values(v)) assert.ok(Number.isFinite(n));
  assert.equal(c.center.y, -40);
});
test('region visits require proximity and persist independently of completed challenges', () => {
  const p = createAwakeningState(),
    s = createPlanetState();
  for (const region of WORLD_REGIONS) {
    s.position = scale(region.direction, PLANET_RADIUS + 20);
    advanceAwakening(p, s, 9.81, 0.01);
    assert.ok(!p.visitedRegions.includes(region.id));
    s.position = scale(region.direction, PLANET_RADIUS);
    advanceAwakening(p, s, 9.81, 0.01);
    assert.ok(p.visitedRegions.includes(region.id));
  }
  let raw;
  saveProgress(
    { setItem: (_, v) => (raw = v) },
    { ...defaultProgress(), awakenings: p },
  );
  assert.deepEqual(
    decodeProgress(raw).awakenings.visitedRegions,
    p.visitedRegions,
  );
});
test('world migration preserves awards but reveals the redesigned map through new visits', () => {
  const p = decodeProgress(
    JSON.stringify({
      version: 5,
      achievements: [],
      explored: ['0'],
      awakenings: {
        completed: ['flowers', 'wind'],
        discovered: ['flowers', 'wind'],
      },
      gravity: 3.71,
      personality: 'curious',
    }),
  );
  assert.deepEqual(p.awakenings.completed, ['flowers', 'wind']);
  assert.deepEqual(p.explored, []);
  assert.equal(p.gravity, 3.71);
});

test('visiting the entire world alone does not award the final sakura', () => {
  const p = createAwakeningState(),
    s = createPlanetState();
  for (const region of WORLD_REGIONS) {
    s.position = scale(region.direction, PLANET_RADIUS);
    advanceAwakening(p, s, 9.81, 0.1);
  }
  assert.equal(p.visitedRegions.length, 10);
  assert.ok(!p.completed.includes('journey'));
});

test('summit spires are anchored solids outside the platform landing corridor', () => {
  assert.ok(WIND_PILLARS.length >= 3);
  for (const p of WIND_PILLARS) {
    for (const step of WIND_STEPS)
      assert.ok(
        surfaceDistance(p.direction, step.direction) >
          p.radius + step.radius + 2,
      );
    const s = createPlanetState(),
      solids = awakenedSolids([]);
    const support = planetSupportAt(scale(p.direction, PLANET_RADIUS), solids);
    assert.equal(support.id, p.id);
    s.position = scale(p.direction, support.radius + 0.15);
    s.velocity = scale(p.direction, -20);
    s.grounded = false;
    stepPlanet(s, { x: 0, y: 0, z: 0, jump: false }, 24.79, 0.025, solids);
    assert.equal(s.supportId, p.id);
    assert.equal(s.grounded, true);
  }
});
