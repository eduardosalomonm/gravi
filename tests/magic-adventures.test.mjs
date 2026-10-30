import { PLANET_RADIUS as R } from '../lib/planet-world.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AWAKENINGS,
  WIND_STEPS,
  RIVER_STOPS,
  REFLECTION_POINTS,
  createAwakeningState,
  advanceAwakening,
  awakenedSolids,
} from '../lib/awakening.mjs';
import { createPlanetState, stepPlanet } from '../lib/planet-physics.mjs';
import { offsetDirection } from '../lib/planet-world.mjs';
const scale = (v, r) =>
  Object.fromEntries(['x', 'y', 'z'].map((k) => [k, v[k] * r]));
test('each category has three independent difficulty levels', () => {
  for (const category of ['Descubrir', 'Recorrer', 'Saltar'])
    assert.deepEqual(
      AWAKENINGS.filter((a) => a.category === category).map((a) => a.level),
      [1, 2, 3],
    );
});
test('reflection requires the right place, gravity, order and dwell', () => {
  const p = createAwakeningState(),
    s = createPlanetState();
  s.position = scale(REFLECTION_POINTS[2], R);
  advanceAwakening(p, s, 24.79, 2);
  assert.equal(p.reflectionStep, 0);
  for (let i = 0; i < 3; i++) {
    s.position = scale(REFLECTION_POINTS[i], R);
    advanceAwakening(p, s, 0, 2);
    assert.equal(p.reflectionStep, i);
    advanceAwakening(p, s, [1.62, 9.81, 24.79][i], 1.1);
  }
  assert.deepEqual(p.completed, ['reflection']);
  advanceAwakening(p, s, 24.79, 3);
  assert.equal(p.newlyCompleted, null);
});
test('river needs landings on raised stops and retains its checkpoints', () => {
  const p = createAwakeningState(),
    s = createPlanetState();
  for (const stop of RIVER_STOPS) {
    s.position = scale(stop.direction, R + stop.height);
    s.supportId = stop.height ? stop.id : null;
    advanceAwakening(p, s, 1.62, 0.1);
  }
  assert.deepEqual(p.completed, ['river']);
});
test('five narrow platforms are reachable through actual Luna jumps', () => {
  const s = createPlanetState(),
    p = createAwakeningState(),
    solids = awakenedSolids([]);
  s.position = scale(offsetDirection(WIND_STEPS[0].direction, 0, 3), R);
  for (const target of WIND_STEPS) {
    let landed = false;
    for (let i = 0; i < 1800; i++) {
      const r = Math.hypot(s.position.x, s.position.y, s.position.z),
        up = scale(s.position, 1 / r),
        radial =
          s.velocity.x * up.x + s.velocity.y * up.y + s.velocity.z * up.z;
      const input = Object.fromEntries(
        ['x', 'y', 'z'].map((k) => [
          k,
          ((target.direction[k] * r - s.position[k]) * 1.6 -
            (s.velocity[k] - up[k] * radial) * 1.3) /
            5,
        ]),
      );
      input.jump = i === 0;
      stepPlanet(s, input, 1.62, undefined, solids);
      advanceAwakening(p, s, 1.62, 1 / 120);
      if (s.justLanded) {
        assert.equal(s.supportId, target.id);
        landed = true;
        break;
      }
    }
    assert.equal(landed, true, target.id);
  }
  assert.deepEqual(p.completed, ['wind']);
});
test('wind checkpoint survives falling after the third landing', () => {
  const p = createAwakeningState(),
    s = createPlanetState();
  p.windStep = 4;
  s.justLanded = true;
  s.supportKind = 'planet';
  advanceAwakening(p, s, 9.81, 0.1);
  assert.equal(p.windStep, 3);
});
