import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState,
  step,
  resetPosition,
  ferryAt,
  RETURN_RING,
  STEP,
  JUMP_SPEED,
} from '../lib/physics.mjs';
const idle = { x: 0, z: 0, jump: false };
test('rider is carried by the moving platform, then earns the three-second ride', () => {
  const s = createState(),
    f = ferryAt(0);
  s.x = f.x;
  s.z = f.z;
  s.y = f.top;
  s.support = 'ferry';
  for (let i = 0; i < 240; i++) step(s, idle, 9.81);
  assert.equal(s.completed[3], false);
  assert.ok(Math.abs(s.x - ferryAt(s.time).x) < 0.01);
  for (let i = 0; i < 120; i++) step(s, idle, 9.81);
  assert.equal(s.completed[3], true);
  assert.ok(Math.abs(s.y - f.top) < 0.001);
});
test('leaving a moving platform cancels incomplete ride time and keeps the jump impulse', () => {
  const s = createState(),
    f = ferryAt(0);
  s.x = f.x;
  s.z = f.z;
  s.y = f.top;
  s.support = 'ferry';
  for (let i = 0; i < 120; i++) step(s, idle, 9.81);
  step(s, { ...idle, jump: true }, 0);
  assert.equal(s.vy, JUMP_SPEED);
  assert.equal(s.rideTime, 0);
  assert.equal(s.completed[3], false);
  assert.ok(s.vx > 0);
});
for (const gravity of [9.81, 3.71])
  test(`moving platform reachable by jumping from the ground at g=${gravity}`, () => {
    const s = createState(),
      f = ferryAt(0);
    s.x = f.x;
    s.z = f.z + 2.3;
    let landed = false;
    for (let i = 0; i < 1000 && !landed; i++) {
      const target = ferryAt(s.time + 0.1);
      const control = (d, v) =>
        Math.max(-1, Math.min(1, (Math.max(-2, Math.min(2, d * 2)) - v) * 2));
      step(
        s,
        {
          x: control(target.x - s.x, s.vx),
          z: control(target.z - s.z, s.vz),
          jump: i === 0,
        },
        gravity,
      );
      landed = s.support === 'ferry';
    }
    assert.equal(landed, true);
  });
test('gravity puzzle requires zero-gravity crossing followed by gravity-driven landing', () => {
  const s = createState();
  s.x = RETURN_RING.x;
  s.z = RETURN_RING.z;
  for (let i = 0; i < 200 && !s.returnArmed; i++)
    step(s, { ...idle, jump: i === 0 }, 0);
  assert.equal(s.returnArmed, true);
  assert.equal(s.completed[4], false);
  for (let i = 0; i < 2000 && !s.completed[4]; i++) step(s, idle, 3.71);
  assert.equal(s.completed[4], true);
  assert.equal(s.y, 0);
  assert.equal(s.returnArmed, false);
});
test('crossing the purple ring under lunar gravity does not solve zero-gravity puzzle', () => {
  const s = createState();
  s.x = RETURN_RING.x;
  s.z = RETURN_RING.z;
  for (let i = 0; i < 1500; i++) step(s, { ...idle, jump: i === 0 }, 1.62);
  assert.equal(s.completed[4], false);
  assert.equal(s.returnArmed, false);
});
test('reset clears temporary puzzle state, but keeps completed achievements', () => {
  const s = createState();
  s.returnArmed = true;
  s.rideTime = 2;
  s.completed[3] = true;
  resetPosition(s);
  assert.equal(s.returnArmed, false);
  assert.equal(s.rideTime, 0);
  assert.equal(s.completed[3], true);
});
test('landing elsewhere cancels the ring attempt', () => {
  const s = createState();
  s.x = 8;
  s.z = 0;
  s.y = 0.01;
  s.vy = -2;
  s.grounded = false;
  s.returnArmed = true;
  step(s, idle, 9.81, STEP);
  assert.equal(s.returnArmed, false);
  assert.equal(s.completed[4], false);
});

test('the fifth challenge can be completed first without unlocking earlier challenges', () => {
  const s = createState();
  s.x = RETURN_RING.x;
  s.z = RETURN_RING.z;
  for (let i = 0; i < 200 && !s.returnArmed; i++)
    step(s, { ...idle, jump: i === 0 }, 0);
  for (let i = 0; i < 2000 && !s.completed[4]; i++) step(s, idle, 3.71);
  assert.deepEqual(s.completed, [false, false, false, false, true]);
});

test('purple ring allows time to open gravity controls before returning', () => {
  const s = createState();
  s.x = RETURN_RING.x;
  s.z = RETURN_RING.z;
  for (let i = 0; i < 1200; i++) step(s, { ...idle, jump: i === 0 }, 0);
  assert.equal(
    s.returnArmed,
    true,
    'capture must survive ten seconds choosing gravity',
  );
  for (let i = 0; i < 2000 && !s.completed[4]; i++) step(s, idle, 3.71);
  assert.equal(s.completed[4], true);
});

test('purple ring captures visible body overlap, including approaching sideways', () => {
  const s = createState();
  s.x = RETURN_RING.x + RETURN_RING.radius + 0.3;
  s.z = RETURN_RING.z;
  s.y = RETURN_RING.y - 1.2;
  s.grounded = false;
  step(s, idle, 0);
  assert.equal(s.returnArmed, true);
});

test('purple ring does not capture a player outside its visible reach', () => {
  const s = createState();
  s.x = RETURN_RING.x + 2;
  s.z = RETURN_RING.z;
  s.y = RETURN_RING.y - 1.2;
  s.grounded = false;
  step(s, idle, 0);
  assert.equal(s.returnArmed, false);
});
