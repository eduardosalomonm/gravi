import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadProgress,
  saveProgress,
  defaultProgress,
  SAVE_KEY,
  createProgressSession,
} from '../lib/progress.mjs';
import { PLANET_SECRETS } from '../lib/planet-secrets.mjs';
import { AWAKENINGS } from '../lib/awakening.mjs';
import { WORLD_REGIONS } from '../lib/world-layout.mjs';
function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
}
test('retiring old modes preserves every legacy achievement and current sakura', () => {
  const storage = memoryStorage(),
    original = defaultProgress();
  original.completed.fill(true);
  original.planetSecrets = PLANET_SECRETS.map((s) => s.id);
  original.awakenings = {
    completed: AWAKENINGS.map((a) => a.id),
    discovered: AWAKENINGS.map((a) => a.id),
    visitedRegions: WORLD_REGIONS.map((r) => r.id),
    finaleStage: 3,
  };
  original.explored = ['0', '1', '287'];
  Object.assign(original, {
    bestRace: 11.3,
    character: 'mimo',
    personality: 'cuddly',
    tutorialDone: true,
    hasChosenWorld: true,
  });
  saveProgress(storage, original);
  const session = createProgressSession(storage);
  assert.deepEqual(session.progress, original);
  assert.equal(session.save(session.progress), 'saved');
  assert.deepEqual(loadProgress(storage), original);
});
test('an old tab cannot overwrite sakuras, exploration or final checkpoints', () => {
  const storage = memoryStorage();
  const first = createProgressSession(storage),
    second = createProgressSession(storage);
  const completed = {
    ...first.progress,
    explored: ['1', '2'],
    awakenings: {
      completed: ['flowers'],
      discovered: ['flowers'],
      visitedRegions: ['flowers'],
      finaleStage: 1,
    },
    character: 'pipo',
    personality: 'cheeky',
    bestRace: 12.4,
  };
  assert.equal(first.save(completed), 'saved');
  const raw = storage.getItem(SAVE_KEY);
  assert.equal(second.isStale(), true);
  assert.equal(second.save({ ...second.progress, gravity: 1.62 }), 'conflict');
  assert.equal(storage.getItem(SAVE_KEY), raw);
  const reloaded = createProgressSession(storage);
  assert.deepEqual(reloaded.progress.awakenings.completed, ['flowers']);
  assert.equal(reloaded.progress.awakenings.finaleStage, 1);
  assert.deepEqual(reloaded.progress.explored, ['1', '2']);
  assert.equal(reloaded.progress.character, 'pipo');
  assert.equal(reloaded.progress.bestRace, 12.4);
  assert.equal(reloaded.save({ ...reloaded.progress, gravity: 1.62 }), 'saved');
});
test('explicit challenge resets are not undone by a stale tab', () => {
  const storage = memoryStorage();
  const initial = defaultProgress();
  initial.awakenings.completed = ['flowers'];
  saveProgress(storage, initial);
  const first = createProgressSession(storage),
    second = createProgressSession(storage);
  assert.equal(
    first.save({ ...first.progress, awakenings: defaultProgress().awakenings }),
    'saved',
  );
  assert.equal(second.save(second.progress), 'conflict');
  assert.deepEqual(loadProgress(storage).awakenings.completed, []);
});
test('storage denial still allows an unsaved session', () => {
  const denied = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    },
  };
  const session = createProgressSession(denied);
  assert.deepEqual(session.progress, defaultProgress());
  assert.equal(session.save(session.progress), 'unavailable');
});
test('achievements, gravity and personality survive a fresh load', () => {
  const storage = memoryStorage(),
    progress = defaultProgress();
  progress.completed[0] = true;
  progress.completed[3] = true;
  progress.planetSecrets = ['pink-tree', 'highest-island'];
  progress.gravity = 24.79;
  progress.personality = 'cheeky';
  progress.tutorialDone = true;
  progress.hasChosenWorld = true;
  assert.equal(saveProgress(storage, progress), true);
  assert.deepEqual(loadProgress(storage), progress);
});
test('corrupt, future-version and missing data safely start fresh', () => {
  const storage = memoryStorage();
  for (const data of [
    'broken',
    '{}',
    '{"version":99,"achievements":[]}',
    'null',
  ]) {
    storage.setItem(SAVE_KEY, data);
    assert.deepEqual(loadProgress(storage), defaultProgress());
  }
});
test('schema keeps known achievements and rejects invalid settings', () => {
  const storage = memoryStorage();
  storage.setItem(
    SAVE_KEY,
    JSON.stringify({
      version: 1,
      achievements: ['star', 'unknown'],
      gravity: -4,
      personality: 'unknown',
      expression: 'unknown',
    }),
  );
  const loaded = loadProgress(storage);
  assert.deepEqual(loaded.completed, [true, false, false, false, false]);
  assert.equal(loaded.gravity, 9.81);
  assert.equal(loaded.personality, 'curious');
  assert.equal(loaded.tutorialDone, false);
  assert.equal(loaded.hasChosenWorld, false);
});

test('version one saves migrate without losing achievements', () => {
  const storage = memoryStorage();
  storage.setItem(
    SAVE_KEY,
    JSON.stringify({
      version: 1,
      achievements: ['lookout', 'return'],
      gravity: 3.71,
      personality: 'cuddly',
      bestRace: 12.4,
    }),
  );
  const loaded = loadProgress(storage);
  assert.deepEqual(loaded.completed, [false, true, false, false, true]);
  assert.equal(loaded.gravity, 3.71);
  assert.equal(loaded.personality, 'cuddly');
  assert.equal(loaded.bestRace, 12.4);
  assert.equal(loaded.hasChosenWorld, false);
  assert.deepEqual(loaded.planetSecrets, []);
});

test('version three keeps known planet secrets and ignores unknown ids', () => {
  const storage = memoryStorage();
  storage.setItem(
    SAVE_KEY,
    JSON.stringify({
      version: 3,
      achievements: [],
      planetSecrets: ['pink-tree', 'unknown', 'zero-sky'],
    }),
  );
  assert.deepEqual(loadProgress(storage).planetSecrets, [
    'pink-tree',
    'zero-sky',
  ]);
});
test('storage denial does not prevent playing', () => {
  const denied = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    },
  };
  assert.deepEqual(loadProgress(denied), defaultProgress());
  assert.equal(saveProgress(denied, defaultProgress()), false);
});
test('restart clears saved achievements while preserving preferences', () => {
  const storage = memoryStorage(),
    progress = defaultProgress();
  progress.gravity = 1.62;
  progress.completed.fill(true);
  saveProgress(storage, progress);
  progress.completed.fill(false);
  saveProgress(storage, progress);
  assert.equal(loadProgress(storage).completed.some(Boolean), false);
  assert.equal(loadProgress(storage).gravity, 1.62);
});
