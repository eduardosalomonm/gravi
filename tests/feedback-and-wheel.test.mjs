import test from 'node:test';
import assert from 'node:assert/strict';
import {
  feedbackEvents,
  footstepInterval,
  progressSteps,
} from '../lib/feedback.mjs';
import {
  WHEEL_OPTIONS,
  nextPreset,
  presetName,
} from '../lib/gravity-wheel.mjs';

const base = { jumps: 0, grounded: true, impact: 0, steps: 0, completed: 0 };

test('un salto y un aterrizaje producen sus eventos', () => {
  assert.deepEqual(
    feedbackEvents(base, { ...base, jumps: 1, grounded: false }),
    [{ type: 'jump' }],
  );
  const land = feedbackEvents(
    { ...base, grounded: false },
    { ...base, grounded: true, impact: 14 },
  );
  assert.equal(land[0].type, 'land');
  assert.equal(land[0].strength, 1);
  const soft = feedbackEvents(
    { ...base, grounded: false },
    { ...base, grounded: true, impact: 1 },
  );
  assert.equal(soft[0].strength, 0);
});

test('florecer tiene prioridad sobre el avance parcial', () => {
  assert.deepEqual(
    feedbackEvents(base, { ...base, steps: 3, completed: 1 }).map(
      (e) => e.type,
    ),
    ['bloom'],
  );
  assert.deepEqual(
    feedbackEvents(base, { ...base, steps: 1 }).map((e) => e.type),
    ['progress'],
  );
  assert.deepEqual(
    feedbackEvents({ ...base, steps: 2 }, { ...base, steps: 0 }),
    [],
  );
});

test('los pasos parciales de todas las aventuras cuentan', () => {
  assert.equal(
    progressSteps({
      petalStep: 1,
      skyStep: 1,
      ridgeStep: 1,
      lanternStep: 1,
      windStep: 1,
      riverStep: 1,
      reflectionStep: 1,
      stones: [0, 2],
      finale: { flower: 1, path: 1, jump: 1 },
    }),
    12,
  );
  assert.equal(progressSteps(undefined), 0);
});

test('los pasos suenan más rápido al correr y callan en reposo', () => {
  assert.equal(footstepInterval(0), null);
  assert.ok(footstepInterval(5) < footstepInterval(2));
  assert.ok(footstepInterval(20) >= 0.2);
});

test('el atajo G pasa a la siguiente gravedad y vuelve a Cero', () => {
  assert.equal(nextPreset(0), 1.62);
  assert.equal(nextPreset(9.81), 24.79);
  assert.equal(nextPreset(24.79), 0);
  assert.equal(nextPreset(5), 9.81);
  assert.equal(presetName(3.71), 'Marte');
  assert.equal(presetName(5), null);
});

test('las cinco opciones táctiles siguen las referencias de gravedad', () => {
  assert.deepEqual(
    WHEEL_OPTIONS.map((o) => o.value),
    [0, 1.62, 3.71, 9.81, 24.79],
  );
});
