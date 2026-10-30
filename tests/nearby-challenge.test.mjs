import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, PLATFORM, HOOP } from '../lib/physics.mjs';
import { nearbyChallenge } from '../lib/nearby-challenge.mjs';
test('approaching a platform shows the action without pretending it is complete', () => {
  const s = createState();
  s.x = PLATFORM.x;
  s.z = PLATFORM.z + 2.5;
  const hint = nearbyChallenge(s, 9.81);
  assert.equal(hint.number, 2);
  assert.equal(hint.done, false);
  assert.match(hint.instruction, /Saltar/);
});
test('standing beneath a high ring explains the needed gravity', () => {
  const s = createState();
  s.x = HOOP.x;
  s.z = HOOP.z;
  assert.match(nearbyChallenge(s, 9.81).instruction, /Luna/);
  assert.match(nearbyChallenge(s, 1.62).instruction, /atraviesa/);
});
test('a completed objective is explicitly identified as completed', () => {
  const s = createState();
  s.x = HOOP.x;
  s.z = HOOP.z;
  s.completed[2] = true;
  assert.equal(nearbyChallenge(s, 9.81).done, true);
});
