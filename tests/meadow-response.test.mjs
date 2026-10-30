import test from 'node:test';
import assert from 'node:assert/strict';
import { meadowResponse } from '../lib/meadow-response.mjs';

test('flowers gradually open as weight falls, with a distinct zero-gravity clue', () => {
  const values = [24.79, 9.81, 3.71, 1.62].map(
    (g) => meadowResponse(g).opening,
  );
  assert.ok(values.every((v, i) => i === 0 || v > values[i - 1]));
  assert.equal(meadowResponse(0).floating, true);
  assert.equal(meadowResponse(1.62).floating, false);
  assert.equal(
    meadowResponse(1.62).progress,
    0,
    'gravity alone never fills the completion lights',
  );
});

test('meadow completion lights mirror real dwell and rewards persist on reload', () => {
  assert.equal(meadowResponse(1.62, 0.75).progress, 0.5);
  assert.equal(meadowResponse(9.81, 0).progress, 0);
  assert.deepEqual(meadowResponse(0, 0, true), {
    opening: 1,
    progress: 1,
    floating: false,
  });
});
