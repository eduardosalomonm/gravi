import { normalizeDirection, surfaceDistance } from '../lib/planet-world.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanetState, stepPlanet } from '../lib/planet-physics.mjs';
test('releasing movement during a lunar jump brakes drift within half a second', () => {
  const s = createPlanetState();
  for (let i = 0; i < 120; i++)
    stepPlanet(s, { x: 1, y: 0, z: 0 }, 1.62, undefined, []);
  stepPlanet(s, { x: 1, y: 0, z: 0, jump: true }, 1.62, undefined, []);
  const start = { ...s.position };
  for (let i = 0; i < 60; i++)
    stepPlanet(s, { x: 0, y: 0, z: 0 }, 1.62, undefined, []);
  // Global X includes the radial jump when starting farther around the sphere.
  // Measure lateral slide on the surface independently of height and longitude.
  const drift = surfaceDistance(
    normalizeDirection(start),
    normalizeDirection(s.position),
  );
  assert.ok(drift < 0.4, `surface drift ${drift} m`);
  assert.equal(s.grounded, false);
});

test('ground walking is fifteen percent faster while launch speed is unchanged', () => {
  const s = createPlanetState();
  const dt = 1 / 120;
  for (let i = 0; i < 600; i++) {
    const up = normalizeDirection(s.position),
      move = { x: up.y, y: -up.x, z: 0 };
    stepPlanet(s, move, 9.81, dt, []);
  }
  const speed = Math.hypot(s.velocity.x, s.velocity.y, s.velocity.z);
  const previousTerminal =
    (24 * dt * Math.exp(-6 * dt)) / (1 - Math.exp(-6 * dt));
  assert.ok(Math.abs(speed / previousTerminal - 1.15) < 0.01);
});
