import test from 'node:test';
import assert from 'node:assert/strict';
import { createCameraGesture } from '../lib/camera-gesture.mjs';

const idle = { x: 0, y: 0, pinch: 0 };
test('camera ignores touch jitter, then follows a deliberate drag', () => {
  const camera = createCameraGesture();
  camera.down(1, 100, 100);
  assert.deepEqual(camera.move(1, 102, 101), idle);
  assert.deepEqual(camera.move(1, 120, 110), { x: 20, y: 10, pinch: 0 });
  assert.deepEqual(camera.move(1, 124, 110), { x: 4, y: 0, pinch: 0 });
  camera.up(1);
  assert.deepEqual(camera.move(1, 180, 100), idle);
});
test('pinch changes distance without rotating and lifting a finger rebases the drag', () => {
  const camera = createCameraGesture();
  camera.down(1, 100, 100);
  camera.move(1, 120, 100);
  camera.down(2, 200, 100);
  assert.deepEqual(camera.move(2, 220, 100), { x: 0, y: 0, pinch: -20 });
  camera.up(2);
  assert.deepEqual(camera.move(1, 122, 101), idle);
  assert.deepEqual(camera.move(1, 132, 101), { x: 12, y: 1, pinch: 0 });
});
test('untracked fingers do not corrupt a pinch, including their release', () => {
  const camera = createCameraGesture();
  camera.down(1, 100, 100);
  camera.down(2, 200, 100);
  assert.equal(camera.down(3, 250, 100), false);
  assert.deepEqual(camera.move(3, 300, 200), idle);
  camera.up(3);
  assert.deepEqual(camera.move(2, 210, 100), { x: 0, y: 0, pinch: -10 });
});
test('cancel, pause or resize clears stale camera contacts', () => {
  const camera = createCameraGesture();
  camera.down(1, 100, 100);
  camera.down(2, 200, 100);
  camera.reset();
  assert.deepEqual(camera.move(1, 500, 500), idle);
  assert.equal(camera.down(3, 50, 50), true);
  assert.deepEqual(camera.move(3, 52, 50), idle);
});
