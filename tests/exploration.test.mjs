import { PLANET_RADIUS as R } from '../lib/planet-world.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAP_CELLS,
  revealExploration,
  isRevealed,
  cleanExploration,
} from '../lib/exploration.mjs';
import {
  saveProgress,
  decodeProgress,
  defaultProgress,
} from '../lib/progress.mjs';
test('visiting reveals a nearby area but leaves the opposite hemisphere hidden', () => {
  const seen = revealExploration([], { x: 0, y: R, z: 0 });
  assert.ok(seen.length > 0);
  assert.ok(seen.length < MAP_CELLS.length / 4);
  assert.equal(isRevealed(seen, { x: 0, y: 1, z: 0 }), true);
  assert.equal(isRevealed(seen, { x: 0, y: -1, z: 0 }), false);
  assert.deepEqual(revealExploration(seen, { x: 0, y: R, z: 0 }), seen);
});
test('flying far above a place does not reveal it and visits persist', () => {
  assert.deepEqual(revealExploration([], { x: 0, y: 100, z: 0 }), []);
  const seen = revealExploration([], { x: R, y: 0, z: 0 });
  let raw = '';
  saveProgress(
    {
      setItem: (_, v) => {
        raw = v;
      },
    },
    { ...defaultProgress(), explored: seen },
  );
  assert.deepEqual(decodeProgress(raw).explored, seen);
  assert.deepEqual(cleanExploration(['0', '0', '999', null]), ['0']);
});
test('old version-four saves preserve sakuras and start with an unexplored map', () => {
  const p = decodeProgress(
    JSON.stringify({
      version: 4,
      achievements: [],
      awakenings: { completed: ['flowers'], discovered: ['flowers'] },
    }),
  );
  assert.deepEqual(p.awakenings.completed, ['flowers']);
  assert.deepEqual(p.explored, []);
});
