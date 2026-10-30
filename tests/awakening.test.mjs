import { PLANET_RADIUS as R } from '../lib/planet-world.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AWAKENINGS,
  PETAL_STOPS,
  SKY_STEPS,
  FOREST_SOLIDS,
  createAwakeningState,
  advanceAwakening,
  awakeningTarget,
} from '../lib/awakening.mjs';
import {
  createPlanetState,
  stepPlanet,
  planetHeight,
  planetSupportAt,
} from '../lib/planet-physics.mjs';
import { offsetDirection } from '../lib/planet-world.mjs';
import {
  decodeProgress,
  defaultProgress,
  saveProgress,
} from '../lib/progress.mjs';
const scaled = (v, r) => ({ x: v.x * r, y: v.y * r, z: v.z * r });
const idle = { x: 0, y: 0, z: 0, jump: false };

test('flowers need proximity, ground contact and a sustained low positive gravity', () => {
  const p = createAwakeningState(),
    s = createPlanetState();
  s.position = scaled(AWAKENINGS[0].direction, R);
  for (const g of [0, 3.71, 9.81, 24.79]) advanceAwakening(p, s, g, 2);
  assert.equal(p.completed.length, 0);
  advanceAwakening(p, s, 1.62, 1);
  assert.equal(p.completed.length, 0);
  s.grounded = false;
  advanceAwakening(p, s, 1.62, 2);
  assert.equal(p.flowerTime, 0);
  s.grounded = true;
  for (let i = 0; i < 181; i++) {
    stepPlanet(s, idle, 1.62, undefined, FOREST_SOLIDS);
    advanceAwakening(p, s, 1.62, 1 / 120);
  }
  assert.deepEqual(p.completed, ['flowers']);
  advanceAwakening(p, s, 1.62, 2);
  assert.equal(p.newlyCompleted, null);
});
test('petal trail can be completed first and ignores later stops until reached in sequence', () => {
  const p = createAwakeningState(),
    s = createPlanetState();
  s.position = scaled(PETAL_STOPS[3], R);
  advanceAwakening(p, s, 9.81, 1 / 120);
  assert.equal(p.petalStep, 0);
  for (const point of PETAL_STOPS) {
    s.position = scaled(point, R);
    advanceAwakening(p, s, 9.81, 1 / 120);
  }
  assert.deepEqual(p.completed, ['petals']);
  assert.equal(p.petalStep, 4);
  assert.deepEqual(awakeningTarget('petals', p).direction, AWAKENINGS[1].tree);
});
test('four actual lunar jumps complete the sky challenge without other sakuras', () => {
  const s = createPlanetState(),
    p = createAwakeningState();
  s.position = scaled(offsetDirection(SKY_STEPS[0].direction, 0, 3.5), R);
  for (const target of SKY_STEPS) {
    let landed = false;
    for (let i = 0; i < 2200; i++) {
      const r = Math.hypot(s.position.x, s.position.y, s.position.z),
        up = scaled(s.position, 1 / r);
      const radial =
        s.velocity.x * up.x + s.velocity.y * up.y + s.velocity.z * up.z;
      // Air steering controller uses the same public movement input as WASD/joystick.
      const input = Object.fromEntries(
        ['x', 'y', 'z'].map((k) => [
          k,
          ((target.direction[k] * r - s.position[k]) * 1.1 -
            (s.velocity[k] - up[k] * radial) * 2.1) /
            5,
        ]),
      );
      input.jump = i === 0;
      stepPlanet(s, input, 1.62, undefined, FOREST_SOLIDS);
      advanceAwakening(p, s, 1.62, 1 / 120);
      if (s.justLanded) {
        assert.equal(s.supportId, target.id);
        landed = true;
        break;
      }
    }
    assert.equal(landed, true, target.id);
  }
  assert.deepEqual(p.completed, ['sky']);
  assert.equal(p.skyStep, 4);
});
test('a missed jump resets only the uncompleted platform sequence', () => {
  const p = createAwakeningState({ completed: ['petals'] }),
    s = createPlanetState();
  Object.assign(s, {
    justLanded: true,
    supportId: 'sky-1',
    supportKind: 'platform',
  });
  advanceAwakening(p, s, 9.81, 1 / 120);
  assert.equal(p.skyStep, 1);
  s.supportId = 'sky-3';
  advanceAwakening(p, s, 9.81, 1 / 120);
  assert.equal(p.skyStep, 1);
  s.supportId = null;
  s.supportKind = 'planet';
  advanceAwakening(p, s, 9.81, 1 / 120);
  assert.equal(p.skyStep, 0);
  assert.deepEqual(p.completed, ['petals']);
});
test('every new forest solid supports a fast Jupiter landing at its visual top', () => {
  for (const solid of FOREST_SOLIDS.filter(
    (s) =>
      s.supportTop &&
      (s.id.startsWith('sky-') ||
        s.id.startsWith('forest-') ||
        s.id.startsWith('sakura-') ||
        s.id.startsWith('ruin-')),
  )) {
    const s = createPlanetState();
    const support = planetSupportAt(scaled(solid.direction, R), FOREST_SOLIDS);
    s.position = scaled(solid.direction, support.radius + 0.18);
    s.velocity = scaled(solid.direction, -18);
    s.grounded = false;
    stepPlanet(s, idle, 24.79, 0.05, FOREST_SOLIDS);
    assert.equal(s.grounded, true, solid.id);
    assert.equal(s.supportId, support.id, solid.id);
    assert.ok(
      Math.abs(planetHeight(s) - (support.radius - R)) < 1e-6,
      solid.id,
    );
  }
});
test('new ledge edge is the same tangent plane as the rendered cap', () => {
  for (const solid of SKY_STEPS) {
    const direction = offsetDirection(solid.direction, solid.radius * 0.8, 0);
    const support = planetSupportAt(scaled(direction, R), FOREST_SOLIDS);
    assert.equal(support.id, solid.id);
    assert.ok(
      Math.abs(
        support.radius *
          (direction.x * solid.direction.x +
            direction.y * solid.direction.y +
            direction.z * solid.direction.z) -
          R -
          solid.height,
      ) < 1e-8,
    );
  }
});
test('v3 migration preserves legacy achievements and settings without awarding sakuras', () => {
  const p = decodeProgress(
    JSON.stringify({
      version: 3,
      achievements: ['first-star'],
      planetSecrets: ['pink-tree'],
      gravity: 24.79,
      personality: 'cheeky',
      hasChosenWorld: true,
      tutorialDone: true,
    }),
  );
  assert.equal(p.gravity, 24.79);
  assert.equal(p.personality, 'cheeky');
  assert.equal(p.tutorialDone, true);
  assert.equal(p.hasChosenWorld, true);
  assert.deepEqual(p.planetSecrets, ['pink-tree']);
  assert.deepEqual(p.awakenings, {
    completed: [],
    discovered: [],
    visitedRegions: [],
    finaleStage: 0,
  });
});
test('sakuras persist independently, reject unknown ids and never save flight or partial jumps', () => {
  let raw = '';
  const storage = {
    setItem: (_, value) => {
      raw = value;
    },
  };
  const p = {
    ...defaultProgress(),
    awakenings: {
      completed: ['sky'],
      discovered: ['sky', 'flowers'],
      visitedRegions: [],
      finaleStage: 0,
    },
  };
  saveProgress(storage, p);
  const loaded = decodeProgress(raw);
  assert.deepEqual(loaded.awakenings, p.awakenings);
  const runtime = createAwakeningState({ ...loaded.awakenings, skyStep: 3 });
  assert.equal(runtime.skyStep, 0);
  assert.ok(!raw.includes('position'));
  assert.ok(!raw.includes('skyStep'));
  assert.deepEqual(
    createAwakeningState({ completed: ['unknown', 'sky', 'sky'] }).completed,
    ['sky'],
  );
});
test('jump grace lets a late touch launch just after walking off a ledge', () => {
  const ledge = SKY_STEPS[0],
    s = createPlanetState();
  s.position = scaled(ledge.direction, R + ledge.height);
  s.supportRadius = R + ledge.height;
  s.supportId = ledge.id;
  s.supportKind = 'platform';
  for (let i = 0; i < 300 && s.grounded; i++)
    stepPlanet(s, { ...idle, x: 1 }, 9.81, undefined, [ledge]);
  assert.equal(s.grounded, false);
  stepPlanet(s, idle, 9.81, undefined, [ledge]);
  stepPlanet(s, { ...idle, jump: true }, 9.81, undefined, [ledge]);
  assert.equal(s.jumps, 1);
  assert.equal(s.grounded, false);
  const r = Math.hypot(s.position.x, s.position.y, s.position.z);
  assert.ok(
    (s.position.x * s.velocity.x +
      s.position.y * s.velocity.y +
      s.position.z * s.velocity.z) /
      r >
      6.8,
  );
});
test('a touch just before landing is buffered once, without enabling a double jump', () => {
  const s = createPlanetState();
  s.position.y = R + 0.04;
  s.velocity.y = -1;
  s.grounded = false;
  stepPlanet(s, { ...idle, jump: true }, 9.81, undefined, []);
  assert.equal(s.jumps, 0);
  for (let i = 0; i < 12; i++) stepPlanet(s, idle, 9.81, undefined, []);
  assert.equal(s.jumps, 1);
  assert.ok(planetHeight(s) > 0.1);
  stepPlanet(s, { ...idle, jump: true }, 9.81, undefined, []);
  assert.equal(s.jumps, 1);
});
