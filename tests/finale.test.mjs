import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AWAKENINGS,
  createAwakeningState,
  advanceAwakening,
  awakeningTarget,
  journeyHint,
  resetAwakeningChallenges,
  awakenedSolids,
  finaleUnlocked,
} from '../lib/awakening.mjs';
import {
  FINALE_FLOWERS,
  FINALE_PATH,
  FINALE_STEPS,
  createFinale,
} from '../lib/finale-course.mjs';
import { PLANET_RADIUS as R, offsetDirection } from '../lib/planet-world.mjs';
import { createPlanetState, stepPlanet } from '../lib/planet-physics.mjs';
import {
  defaultProgress,
  saveProgress,
  decodeProgress,
} from '../lib/progress.mjs';
const scale = (d, r) => ({ x: d.x * r, y: d.y * r, z: d.z * r });
const nine = AWAKENINGS.filter((a) => a.id !== 'journey').map((a) => a.id);
test('nine sakuras unlock the finale without any extra region requirement', () => {
  const p = createAwakeningState({ completed: nine });
  assert.equal(finaleUnlocked(p), true);
  assert.deepEqual(p.visitedRegions, []);
  assert.match(journeyHint(p), /Descubrir/);
  assert.deepEqual(
    awakeningTarget('journey', p).direction,
    FINALE_FLOWERS[0].direction,
  );
});
test('locked finale ignores actions and proximity alone never completes it', () => {
  const s = createPlanetState(),
    p = createAwakeningState();
  s.position = scale(FINALE_FLOWERS[0].direction, R);
  advanceAwakening(p, s, 1.62, 2);
  assert.equal(p.finale.flower, 0);
  p.completed = nine;
  advanceAwakening(p, s, 0, 2);
  assert.ok(!p.completed.includes('journey'));
});
test('three-stage finale combines gravity, grounded route and actual jumps', () => {
  const p = createAwakeningState({ completed: nine }),
    s = createPlanetState();
  for (const f of FINALE_FLOWERS) {
    s.position = scale(f.direction, R);
    advanceAwakening(p, s, 0, 2);
    assert.ok(p.finale.stage < 1);
    advanceAwakening(p, s, f.gravity, 1.1);
  }
  assert.equal(p.finale.stage, 1);
  for (const stop of FINALE_PATH) {
    s.position = scale(stop.direction, R + stop.height);
    s.supportId = stop.id;
    s.grounded = true;
    advanceAwakening(p, s, 1.62, 0.1);
  }
  assert.equal(p.finale.stage, 2);
  const solids = awakenedSolids(nine);
  s.position = scale(offsetDirection(FINALE_STEPS[0].direction, 0, 3), R);
  s.supportRadius = R;
  s.supportId = null;
  s.velocity = { x: 0, y: 0, z: 0 };
  for (const target of FINALE_STEPS) {
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
    assert.ok(landed, target.id);
  }
  assert.equal(p.finale.stage, 3);
  assert.ok(p.completed.includes('journey'));
  advanceAwakening(p, s, 1.62, 0.1);
  assert.equal(p.newlyCompleted, null);
});
test('falling keeps prior stages and final landing needs low gravity', () => {
  const p = createAwakeningState({ completed: nine, finaleStage: 2 }),
    s = createPlanetState();
  p.finale.jump = 2;
  s.justLanded = true;
  s.supportKind = 'platform';
  s.supportId = FINALE_STEPS[2].id;
  advanceAwakening(p, s, 9.81, 0.1);
  assert.equal(p.finale.stage, 2);
  s.supportKind = 'planet';
  advanceAwakening(p, s, 9.81, 0.1);
  assert.equal(p.finale.stage, 2);
  assert.equal(p.finale.jump, 0);
});
test('stage checkpoints persist and restart clears them without clearing exploration', () => {
  let raw;
  const value = {
    ...defaultProgress(),
    awakenings: {
      completed: nine,
      discovered: nine,
      visitedRegions: ['flowers'],
      finaleStage: 2,
    },
  };
  saveProgress({ setItem: (_, v) => (raw = v) }, value);
  const saved = decodeProgress(raw);
  assert.equal(saved.awakenings.finaleStage, 2);
  const runtime = createAwakeningState(saved.awakenings);
  assert.equal(runtime.finale.path, 4);
  assert.equal(runtime.finale.jump, 0);
  const reset = resetAwakeningChallenges(runtime);
  assert.equal(reset.finale.stage, 0);
  assert.deepEqual(reset.completed, []);
  assert.deepEqual(reset.visitedRegions, ['flowers']);
  assert.equal(createFinale(999).stage, 0);
});
