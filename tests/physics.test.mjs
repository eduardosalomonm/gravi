import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState,
  resetPosition,
  step,
  setGravity,
  STEP,
  JUMP_SPEED,
  PRESETS,
  PLATFORM,
  HOOP,
} from '../lib/physics.mjs';
const idle = { x: 0, z: 0, jump: false };
const near = (actual, expected, tolerance = 0.002) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} should be near ${expected}`,
  );
for (const [name, gravity] of Object.entries(PRESETS)) {
  test(`fixed impulse and ballistic motion: ${name}`, () => {
    const s = createState();
    step(s, { ...idle, jump: true }, gravity);
    near(s.vy + gravity * STEP, JUMP_SPEED, 1e-10);
    for (let i = 1; i < 60; i++) step(s, idle, gravity);
    near(s.y, JUMP_SPEED * 0.5 - (gravity * 0.5 * 0.5) / 2, 1e-8);
    near(s.vy, JUMP_SPEED - gravity * 0.5, 1e-8);
  });
}
for (const [name, gravity] of Object.entries(PRESETS).filter(
  ([, g]) => g > 0,
)) {
  test(`correct apex and landing: ${name}`, () => {
    const s = createState();
    let peak = 0;
    step(s, { ...idle, jump: true }, gravity);
    for (let i = 0; i < 1500; i++) {
      peak = Math.max(peak, s.y);
      step(s, idle, gravity);
    }
    near(peak, JUMP_SPEED ** 2 / (2 * gravity));
    assert.equal(s.y, 0);
    assert.equal(s.vy, 0);
    assert.equal(s.grounded, true);
  });
}
test('changing gravity midair preserves velocity', () => {
  const s = createState();
  step(s, { ...idle, jump: true }, PRESETS.Tierra);
  const vy = s.vy,
    y = s.y;
  step(s, idle, 0);
  near(s.vy, vy, 1e-10);
  near(s.y, y + vy * STEP, 1e-10);
  step(s, idle, PRESETS.Luna);
  near(s.vy, vy - PRESETS.Luna * STEP, 1e-10);
});
test('no double jump or spontaneous lift in zero gravity', () => {
  const s = createState();
  for (let i = 0; i < 30; i++) step(s, idle, 0);
  assert.equal(s.y, 0);
  step(s, { ...idle, jump: true }, 0);
  for (let i = 0; i < 60; i++) step(s, { ...idle, jump: true }, 0);
  assert.equal(s.vy, JUMP_SPEED);
  near(s.y, JUMP_SPEED * 61 * STEP, 1e-8);
});
test('reset preserves achievements, cancels drift and supports another zero-gravity jump', () => {
  const s = createState();
  s.completed[0] = true;
  s.vx = 3;
  step(s, { ...idle, jump: true }, 0);
  resetPosition(s);
  assert.deepEqual([s.x, s.y, s.z, s.vx, s.vy, s.vz], [0, 0, 3, 0, 0, 0]);
  assert.deepEqual(s.completed, [true, false, false, false, false]);
  step(s, { ...idle, jump: true }, 0);
  assert.ok(s.y > 0);
});
test('automatic height rescue and world boundary keep the pet recoverable', () => {
  const s = createState();
  s.y = 37.99;
  s.vy = 7;
  s.grounded = false;
  step(s, idle, 0);
  assert.equal(s.rescued, true);
  assert.equal(s.y, 0);
  s.x = 11.39;
  s.z = 0;
  s.vx = 5;
  step(s, { ...idle, x: 1 }, 0);
  assert.ok(Math.hypot(s.x, s.z) <= 11.40001);
});
for (const gravity of [0, 1.62, 3.71, 9.81, 12, 24.79, 25]) {
  test(`star collectible while walking with gravity ${gravity}`, () => {
    const s = createState();
    for (let i = 0; i < 150; i++) step(s, { ...idle, x: 1 }, gravity);
    assert.ok(s.completed[0]);
  });
}
for (const gravity of [9.81, 3.71, 1.62]) {
  test(`platform reachable by an actual jump with gravity ${gravity}`, () => {
    const s = createState();
    s.x = PLATFORM.x;
    s.z = PLATFORM.z + 2.8;
    for (let i = 0; i < 1600 && !s.completed[1]; i++) {
      // A simple steering controller uses exactly the same inputs as the player.
      const desired = Math.max(-2, Math.min(2, (PLATFORM.z - s.z) * 2));
      const steer = Math.max(-1, Math.min(1, (desired - s.vz) * 2));
      step(s, { x: 0, z: steer, jump: i === 0 }, gravity);
    }
    assert.ok(
      s.completed[1],
      `landing not reached at g=${gravity}, state=${JSON.stringify(s)}`,
    );
    near(s.y, PLATFORM.top);
  });
}
for (const gravity of [0, 1.62, 3.71]) {
  test(`hoop reachable from the ground with gravity ${gravity}`, () => {
    const s = createState();
    s.x = HOOP.x;
    s.z = HOOP.z;
    for (let i = 0; i < 500 && !s.completed[2]; i++)
      step(s, { ...idle, jump: i === 0 }, gravity);
    assert.ok(s.completed[2]);
  });
}
test('Earth jump cannot accidentally complete the high hoop', () => {
  const s = createState();
  s.x = HOOP.x;
  s.z = HOOP.z;
  for (let i = 0; i < 250; i++) step(s, { ...idle, jump: i === 0 }, 9.81);
  assert.equal(s.completed[2], false);
});
test('platform blocks walking through its sides', () => {
  const s = createState();
  s.x = PLATFORM.x;
  s.z = PLATFORM.z + 4;
  for (let i = 0; i < 600; i++) step(s, { ...idle, z: -1 }, 9.81);
  assert.ok(
    Math.hypot(s.x - PLATFORM.x, s.z - PLATFORM.z) >= PLATFORM.radius + 0.59,
  );
  assert.equal(s.completed[1], false);
});
test('a platform landing supports another jump with the same impulse', () => {
  const s = createState();
  s.x = PLATFORM.x;
  s.z = PLATFORM.z;
  s.y = 2;
  s.vy = -2;
  s.grounded = false;
  for (let i = 0; i < 100 && !s.grounded; i++) step(s, idle, 9.81);
  step(s, { ...idle, jump: true }, 0);
  near(s.vy, JUMP_SPEED, 1e-10);
});
test('rejects invalid gravity values', () => {
  for (const value of [-1, 25.01, NaN, Infinity, '2', null])
    assert.throws(() => setGravity(value), RangeError);
  assert.equal(setGravity(0), 0);
  assert.equal(setGravity(25), 25);
});
