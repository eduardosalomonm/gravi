import { PLANET_RADIUS as R } from '../lib/planet-world.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AWAKENINGS,
  LANTERN_STOPS,
  RIDGE_STEPS,
  RESONANCE_STONES,
  awakenedSolids,
  createAwakeningState,
  advanceAwakening,
} from '../lib/awakening.mjs';
import { createPlanetState, stepPlanet } from '../lib/planet-physics.mjs';
import { offsetDirection } from '../lib/planet-world.mjs';
const scaled = (v, r) => ({ x: v.x * r, y: v.y * r, z: v.z * r });
test('Jupiter circle requires sustained gravity and works before the original adventures', () => {
  const p = createAwakeningState(),
    s = createPlanetState();
  s.position = scaled(AWAKENINGS.find((a) => a.id === 'jupiter').direction, R);
  advanceAwakening(p, s, 9.81, 2);
  assert.equal(p.completed.length, 0);
  for (const d of RESONANCE_STONES) {
    s.position = scaled(d, R);
    advanceAwakening(p, s, 24.79, 1);
  }
  s.position = scaled(AWAKENINGS.find((a) => a.id === 'jupiter').direction, R);
  advanceAwakening(p, s, 24.79, 1);
  assert.equal(p.completed.length, 0);
  advanceAwakening(p, s, 24.79, 0.6);
  assert.deepEqual(p.completed, ['jupiter']);
});
test('lanterns light in order without depending on petal or platform progress', () => {
  const p = createAwakeningState(),
    s = createPlanetState();
  s.position = scaled(LANTERN_STOPS[3], R);
  advanceAwakening(p, s, 9.81, 0.1);
  assert.equal(p.lanternStep, 0);
  for (const d of LANTERN_STOPS) {
    s.position = scaled(d, R);
    advanceAwakening(p, s, 9.81, 0.1);
  }
  assert.deepEqual(p.completed, ['lanterns']);
  assert.equal(p.lanternStep, 4);
  assert.equal(p.petalStep, 0);
});
test('three real Mars jumps can complete the new cornices', () => {
  const s = createPlanetState(),
    p = createAwakeningState(),
    solids = awakenedSolids([]);
  s.position = scaled(offsetDirection(RIDGE_STEPS[0].direction, 0, 3), R);
  for (const target of RIDGE_STEPS) {
    let landed = false;
    for (let i = 0; i < 1600; i++) {
      const r = Math.hypot(s.position.x, s.position.y, s.position.z),
        up = scaled(s.position, 1 / r),
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
      stepPlanet(s, input, 3.71, undefined, solids);
      advanceAwakening(p, s, 3.71, 1 / 120);
      if (s.justLanded) {
        assert.equal(s.supportId, target.id);
        landed = true;
        break;
      }
    }
    assert.equal(landed, true, target.id);
  }
  assert.deepEqual(p.completed, ['ridge']);
  assert.equal(p.ridgeStep, 3);
});
