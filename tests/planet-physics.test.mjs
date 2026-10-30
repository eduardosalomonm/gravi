import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlanetState,
  planetHeight,
  resetPlanetState,
  stepPlanet,
  PLANET_RADIUS,
  PLANET_PLATFORMS,
  PLAYER_RADIUS,
  planetSupportAt,
} from '../lib/planet-physics.mjs';
import { PRESETS } from '../lib/physics.mjs';
import {
  offsetDirection,
  PLANET_ROCKS,
  PLANET_SOLIDS,
  PLANET_TREES,
  surfaceDistance,
} from '../lib/planet-world.mjs';

const radius = (state) =>
  Math.hypot(state.position.x, state.position.y, state.position.z);

test('Gravi walks a complete great circle, crosses both poles and stays grounded', () => {
  const state = createPlanetState();
  let crossedSouth = false;
  const circumference = Math.PI * 2 * PLANET_RADIUS;
  for (
    let frame = 0;
    frame < 12000 && state.distanceTravelled < circumference;
    frame += 1
  ) {
    const tangentLength = Math.hypot(state.position.y, state.position.z);
    stepPlanet(
      state,
      {
        x: 0,
        y: -state.position.z / tangentLength,
        z: state.position.y / tangentLength,
        jump: false,
      },
      9.81,
      undefined,
      [],
    );
    crossedSouth ||= state.position.y < -11.8;
    assert.ok(Math.abs(radius(state) - PLANET_RADIUS) < 1e-8);
    assert.equal(state.grounded, true);
  }
  assert.equal(crossedSouth, true);
  assert.ok(state.distanceTravelled >= circumference);
  assert.ok(
    Math.hypot(
      state.position.x,
      state.position.y - PLANET_RADIUS,
      state.position.z,
    ) < 0.2,
  );
});

for (const [name, gravity] of Object.entries(PRESETS).filter(
  ([, value]) => value > 0,
)) {
  test(`constant jump impulse leaves and returns to the planet with ${name}`, () => {
    const state = createPlanetState();
    stepPlanet(state, { x: 0, y: 0, z: 0, jump: true }, gravity);
    let maximumHeight = 0;
    for (let frame = 0; frame < 5000 && !state.grounded; frame += 1) {
      stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, gravity);
      maximumHeight = Math.max(maximumHeight, planetHeight(state));
    }
    assert.equal(state.grounded, true);
    assert.equal(state.jumps, 1);
    assert.ok(maximumHeight > 0.9);
    assert.ok(Math.abs(radius(state) - PLANET_RADIUS) < 1e-8);
  });
}

test('zero gravity permits flight and restoring gravity brings Gravi back', () => {
  const state = createPlanetState();
  stepPlanet(state, { x: 0, y: 0, z: 0, jump: true }, 0);
  for (let frame = 0; frame < 600; frame += 1)
    stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, 0);
  assert.ok(planetHeight(state) > 34);
  const outwardVelocity = state.velocity.y;
  stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, 9.81);
  assert.ok(state.velocity.y < outwardVelocity);
  for (let frame = 0; frame < 5000 && !state.grounded; frame += 1)
    stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, 9.81);
  assert.equal(state.grounded, true);
});

test('return to planet resets position, velocity and flight counters', () => {
  const state = createPlanetState();
  stepPlanet(state, { x: 0, y: 0, z: 0, jump: true }, 0);
  for (let frame = 0; frame < 60; frame += 1)
    stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, 0);
  resetPlanetState(state);
  assert.deepEqual(state, createPlanetState());
});

test('Gravi lands on every rock platform instead of passing through it', () => {
  for (const platform of PLANET_PLATFORMS) {
    const state = createPlanetState();
    const top = PLANET_RADIUS + platform.height;
    state.position = {
      x: platform.direction.x * (top + 1),
      y: platform.direction.y * (top + 1),
      z: platform.direction.z * (top + 1),
    };
    state.velocity = {
      x: platform.direction.x * -3,
      y: platform.direction.y * -3,
      z: platform.direction.z * -3,
    };
    state.grounded = false;
    for (let frame = 0; frame < 240 && !state.grounded; frame += 1)
      stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, 9.81);
    assert.equal(state.grounded, true, `platform ${platform.id}`);
    assert.ok(
      Math.abs(planetHeight(state) - platform.height) < 1e-6,
      `platform ${platform.id}`,
    );
  }
});

test('walking off a rock platform makes Gravi fall back to the planet', () => {
  const platform = PLANET_PLATFORMS[0];
  const state = createPlanetState();
  const top = PLANET_RADIUS + platform.height;
  state.position = {
    x: platform.direction.x * top,
    y: platform.direction.y * top,
    z: platform.direction.z * top,
  };
  state.supportRadius = top;
  for (let frame = 0; frame < 360 && state.grounded; frame += 1)
    stepPlanet(state, { x: 1, y: 0, z: 0, jump: false }, 9.81);
  assert.equal(state.grounded, false);
  for (let frame = 0; frame < 480 && !state.grounded; frame += 1)
    stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, 9.81);
  assert.equal(state.grounded, true);
  assert.ok(planetHeight(state) < 1e-6);
});

test('platform collision follows the same tangent plane as its visible top', () => {
  const platform = PLANET_PLATFORMS[2];
  const edge = offsetDirection(platform.direction, platform.radius * 0.8, 0);
  const support = planetSupportAt({
    x: edge.x * PLANET_RADIUS,
    y: edge.y * PLANET_RADIUS,
    z: edge.z * PLANET_RADIUS,
  });
  const planeHeight =
    support.radius *
    (edge.x * platform.direction.x +
      edge.y * platform.direction.y +
      edge.z * platform.direction.z);
  assert.equal(support.id, platform.id);
  assert.ok(Math.abs(planeHeight - (PLANET_RADIUS + platform.height)) < 1e-8);

  const state = createPlanetState();
  state.position = {
    x: edge.x * (support.radius + 0.6),
    y: edge.y * (support.radius + 0.6),
    z: edge.z * (support.radius + 0.6),
  };
  state.velocity = { x: -edge.x * 3, y: -edge.y * 3, z: -edge.z * 3 };
  state.grounded = false;
  for (let frame = 0; frame < 120 && !state.grounded; frame += 1)
    stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, 9.81);
  assert.equal(state.supportId, platform.id);
  const landedPlaneHeight =
    state.position.x * platform.direction.x +
    state.position.y * platform.direction.y +
    state.position.z * platform.direction.z;
  assert.ok(
    Math.abs(landedPlaneHeight - (PLANET_RADIUS + platform.height)) < 1e-8,
  );
});

test('tree trunks are solid under Jupiter gravity', () => {
  const tree = PLANET_TREES.find((item) => item.id === 'pink-tree');
  const state = createPlanetState();
  const ghost = createPlanetState();
  const start = offsetDirection(tree.direction, PLAYER_RADIUS + 1.1, 0);
  const startPosition = {
    x: start.x * PLANET_RADIUS,
    y: start.y * PLANET_RADIUS,
    z: start.z * PLANET_RADIUS,
  };
  state.position = { ...startPosition };
  ghost.position = { ...startPosition };
  const delta = {
    x: tree.direction.x - start.x,
    y: tree.direction.y - start.y,
    z: tree.direction.z - start.z,
  };
  const magnitude = Math.hypot(delta.x, delta.y, delta.z);
  const towardTree = {
    x: delta.x / magnitude,
    y: delta.y / magnitude,
    z: delta.z / magnitude,
    jump: false,
  };
  let closest = Infinity;
  let ghostClosest = Infinity;
  for (let frame = 0; frame < 300; frame += 1) {
    stepPlanet(state, towardTree, 24.79);
    stepPlanet(ghost, towardTree, 24.79, undefined, []);
    const currentDirection = {
      x: state.position.x / radius(state),
      y: state.position.y / radius(state),
      z: state.position.z / radius(state),
    };
    const ghostDirection = {
      x: ghost.position.x / radius(ghost),
      y: ghost.position.y / radius(ghost),
      z: ghost.position.z / radius(ghost),
    };
    closest = Math.min(
      closest,
      surfaceDistance(currentDirection, tree.direction),
    );
    ghostClosest = Math.min(
      ghostClosest,
      surfaceDistance(ghostDirection, tree.direction),
    );
  }
  const treeSolid = PLANET_SOLIDS.find((item) => item.id === tree.id);
  assert.ok(closest >= treeSolid.radius + PLAYER_RADIUS - 0.03);
  assert.ok(ghostClosest < treeSolid.radius);
});

test('Jupiter gravity cannot tunnel through a low rock top', () => {
  const rock = PLANET_ROCKS.find((item) => item.id.startsWith('rock-'));
  const state = createPlanetState();
  const top = PLANET_RADIUS + rock.height;
  state.position = {
    x: rock.direction.x * (top + 0.18),
    y: rock.direction.y * (top + 0.18),
    z: rock.direction.z * (top + 0.18),
  };
  state.velocity = {
    x: rock.direction.x * -8,
    y: rock.direction.y * -8,
    z: rock.direction.z * -8,
  };
  state.grounded = false;
  stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, 24.79, 0.05);
  assert.equal(state.grounded, true);
  assert.equal(state.supportId, rock.id);
  assert.ok(Math.abs(planetHeight(state) - rock.height) < 1e-6);
});

test('every visible solid catches a high-speed Jupiter landing', () => {
  for (const solid of PLANET_SOLIDS) {
    const state = createPlanetState();
    const top = PLANET_RADIUS + solid.height;
    state.position = {
      x: solid.direction.x * (top + 0.18),
      y: solid.direction.y * (top + 0.18),
      z: solid.direction.z * (top + 0.18),
    };
    state.velocity = {
      x: solid.direction.x * -8,
      y: solid.direction.y * -8,
      z: solid.direction.z * -8,
    };
    state.grounded = false;
    stepPlanet(state, { x: 0, y: 0, z: 0, jump: false }, 24.79, 0.05);
    assert.equal(state.grounded, true, solid.id);
    assert.equal(state.supportId, solid.id, solid.id);
  }
});
