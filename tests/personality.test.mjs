import test from 'node:test';
import assert from 'node:assert/strict';
import { reactionPose } from '../lib/personality.mjs';
import { createState, step } from '../lib/physics.mjs';
test('playful reactions are more energetic than the gentle personality', () => {
  assert.ok(
    reactionPose('jump', 1, 'curious').stretch >
      reactionPose('jump', 1, 'cuddly').stretch,
  );
});
test('landing squash expires without changing physics dimensions or impulse', () => {
  assert.ok(reactionPose('land', 0.3).stretch < 1);
  assert.equal(reactionPose('land', -1).stretch, 1);
  assert.equal(reactionPose('jump', 0.3).stretch > 1, true);
});
test('reduced-motion expressions omit squash and arm waving', () => {
  const p = reactionPose('float', 2, 'cheeky', true);
  assert.equal(p.stretch, 1);
  assert.equal(p.arm, 0);
  assert.equal(p.surprise, true);
});
test('landing events fire once, not continuously while resting', () => {
  const s = createState();
  s.y = 0.01;
  s.vy = -2;
  s.grounded = false;
  step(s, { x: 0, z: 0, jump: false }, 9.81);
  assert.equal(s.justLanded, true);
  assert.ok(s.landingSpeed > 2);
  step(s, { x: 0, z: 0, jump: false }, 9.81);
  assert.equal(s.justLanded, false);
});
