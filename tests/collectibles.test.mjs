import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, step, STAR } from '../lib/physics.mjs';
import { touchesCollectible } from '../lib/collectibles.mjs';
test('touching a star tip with the body collects it', () => {
  const s = createState();
  Object.assign(s, { x: STAR.x + 1.45, z: STAR.z });
  step(s, { x: 0, z: 0, jump: false }, 9.81);
  assert.equal(s.completed[0], true);
});
test('nearby objects outside the body volume are not collected remotely', () => {
  assert.equal(
    touchesCollectible({ x: STAR.x + 2, z: STAR.z, y: 0 }, STAR, 0.7),
    false,
  );
  assert.equal(
    touchesCollectible({ x: STAR.x, z: STAR.z, y: 4 }, STAR, 0.7),
    false,
  );
});
