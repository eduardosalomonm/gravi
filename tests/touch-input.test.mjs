import test from 'node:test';
import assert from 'node:assert/strict';
import { joystickVector } from '../lib/touch-input.mjs';
import { createState, step, STEP } from '../lib/physics.mjs';
test('joystick maps screen directions to camera-relative movement', () => {
  assert.deepEqual(joystickVector(0, -32, 32), { x: 0, z: 1 });
  assert.deepEqual(joystickVector(16, 0, 32), { x: 0.5, z: -0 });
  assert.deepEqual(joystickVector(0, 32, 32), { x: 0, z: -1 });
});
test('dragging beyond the joystick clamps diagonal speed', () => {
  const v = joystickVector(120, -120, 32);
  assert.ok(Math.abs(Math.hypot(v.x, v.z) - 1) < 1e-10);
});
test('touch movement and jump work together through the real physics loop', () => {
  const s = createState();
  const v = joystickVector(32, 0, 32);
  for (let i = 0; i < 60; i++) step(s, { ...v, jump: i === 0 }, 0, STEP);
  assert.ok(s.x > 0.5);
  assert.ok(s.y > 3);
  assert.equal(s.vy, 7);
});
test('releasing movement produces a zero input; grounded pet stops', () => {
  const s = createState();
  for (let i = 0; i < 60; i++)
    step(s, { ...joystickVector(32, 0, 32), jump: false }, 9.81);
  for (let i = 0; i < 240; i++)
    step(s, { ...joystickVector(0, 0, 32), jump: false }, 9.81);
  assert.ok(Math.abs(s.vx) < 0.0001);
});
test('invalid pointer dimensions cannot introduce NaN physics', () => {
  assert.deepEqual(joystickVector(NaN, 0, 32), { x: 0, z: 0 });
  assert.deepEqual(joystickVector(10, 5, 0), { x: 0, z: 0 });
});
test('precision stick ignores thumb jitter and preserves fine analogue control', () => {
  const precision = { deadZone: 0.1, response: 1.25 };
  assert.deepEqual(joystickVector(2, -1, 33.6, precision), { x: 0, z: 0 });
  const slow = joystickVector(10, 0, 33.6, precision);
  const medium = joystickVector(20, 0, 33.6, precision);
  assert.ok(slow.x > 0 && slow.x < 0.2);
  assert.ok(medium.x > slow.x && medium.x < 0.6);
  const full = joystickVector(60, -60, 33.6, precision);
  assert.ok(Math.abs(Math.hypot(full.x, full.z) - 1) < 1e-10);
  assert.ok(full.x > 0 && full.z > 0);
});
