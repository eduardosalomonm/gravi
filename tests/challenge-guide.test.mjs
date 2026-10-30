import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AWAKENINGS,
  awakeningById,
  REFLECTION_POINTS,
} from '../lib/awakening.mjs';
import { PLANET_RADIUS, normalizeDirection } from '../lib/planet-world.mjs';
import { challengeGuide } from '../lib/challenge-guide.mjs';

const forestAt = (direction, extra = {}, height = 0) => {
  const up = normalizeDirection(direction);
  const r = PLANET_RADIUS + height;
  return {
    position: { x: up.x * r, y: up.y * r, z: up.z * r },
    completed: [],
    discovered: [],
    visitedRegions: [],
    finale: { stage: 0, flower: 0, path: 0, jump: 0, dwell: 0 },
    petalStep: 0,
    skyStep: 0,
    ridgeStep: 0,
    lanternStep: 0,
    windStep: 0,
    riverStep: 0,
    reflectionStep: 0,
    reflectionTime: 0,
    stones: [],
    stoneTime: 0,
    flowerTime: 0,
    ...extra,
  };
};

test('cada una de las diez pruebas tiene explicación al llegar', () => {
  for (const item of AWAKENINGS) {
    const guide = challengeGuide(forestAt(item.direction), 9.81);
    assert.ok(guide, `${item.id} sin explicación`);
    assert.equal(guide.id, item.id);
    assert.ok(guide.goal.length > 10);
    assert.ok(guide.steps.length >= 1);
    assert.equal(guide.steps.filter((s) => s.current).length, 1);
  }
});

test('lejos de todo, o muy alto, no aparece', () => {
  const flowers = awakeningById('flowers');
  assert.equal(challengeGuide(forestAt(flowers.direction, {}, 20), 9.81), null);
});

test('una prueba completada ya no se explica', () => {
  const flowers = awakeningById('flowers');
  const guide = challengeGuide(
    forestAt(flowers.direction, { completed: ['flowers'] }),
    1.62,
  );
  assert.notEqual(guide?.id, 'flowers');
});

test('marca los pasos hechos y recomienda la gravedad del paso actual', () => {
  const guide = challengeGuide(
    forestAt(REFLECTION_POINTS[1], { reflectionStep: 1 }),
    1.62,
    { reflection: 2 },
  );
  assert.equal(guide.id, 'reflection');
  assert.deepEqual(
    guide.steps.map((s) => s.done),
    [true, false, false],
  );
  assert.equal(guide.steps[1].current, true);
  assert.equal(guide.gravity, 'Tierra');
  assert.equal(guide.gravityOk, false);
  assert.equal(
    challengeGuide(
      forestAt(REFLECTION_POINTS[1], { reflectionStep: 1 }),
      9.81,
      { reflection: 2 },
    ).gravityOk,
    true,
  );
});

test('el final bloqueado explica cuántos sakuras faltan', () => {
  const journey = awakeningById('journey');
  const guide = challengeGuide(forestAt(journey.direction), 9.81);
  assert.equal(guide.id, 'journey');
  assert.match(guide.steps[0].text, /faltan 9/);
});

test('el claro ofrece pistas progresivas sin revelar Luna al llegar', () => {
  const forest = forestAt(awakeningById('flowers').direction);
  const initial = challengeGuide(forest, 9.81);
  assert.equal(initial.hintLevel, 0);
  assert.equal(initial.gravity, null);
  assert.doesNotMatch(JSON.stringify(initial), /Luna|1,5/);
  const clue = challengeGuide(forest, 9.81, 1);
  assert.match(clue.steps[0].text, /suave/);
  assert.equal(clue.gravity, null);
  const answer = challengeGuide(forest, 9.81, 2);
  assert.equal(answer.gravity, 'Luna');
  assert.match(answer.steps[1].text, /1,5/);
  assert.match(challengeGuide(forest, 0).status, /poco el suelo/);
  assert.match(
    challengeGuide({ ...forest, flowerTime: 0.7 }, 1.62).status,
    /despertando/,
  );
});

test('each discovery reveals its own solution only when requested', () => {
  for (const id of ['flowers', 'jupiter', 'reflection']) {
    const forest = forestAt(awakeningById(id).direction);
    const base = challengeGuide(forest, 9.81);
    assert.equal(base.hintLevel, 0);
    assert.equal(base.gravity, null);
    assert.equal(challengeGuide(forest, 9.81, { [id]: 1 }).gravity, null);
    const answer = challengeGuide(forest, 9.81, { [id]: 2 });
    assert.equal(answer.hintLevel, 2);
    assert.ok(answer.gravity);
    const unrelated = challengeGuide(forest, 9.81, {
      petals: 2,
      flowers: id === 'flowers' ? 0 : 2,
    });
    assert.equal(
      unrelated.hintLevel,
      0,
      'help from a different place must not reveal this one',
    );
  }
});
