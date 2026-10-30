import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANET_RADIUS,
  PLANET_STEP,
  PLAYER_RADIUS,
  createPlanetState,
  planetHeight,
  stepPlanet,
} from '../lib/planet-physics.mjs';
import {
  PLANET_SOLIDS,
  offsetDirection,
  surfaceDistance,
} from '../lib/planet-world.mjs';
import { AWAKENINGS, awakenedSolids } from '../lib/awakening.mjs';

const normal = (v) => {
  const n = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / n, y: v.y / n, z: v.z / n };
};
const place = (direction, height) => {
  const state = createPlanetState();
  const up = normal(direction);
  const r = PLANET_RADIUS + height;
  state.position = { x: up.x * r, y: up.y * r, z: up.z * r };
  state.grounded = height === 0;
  return state;
};
const run = (state, input, gravity, seconds, solids) => {
  for (let i = 0; i < seconds / PLANET_STEP; i++)
    stepPlanet(state, input, gravity, PLANET_STEP, solids);
  return state;
};
const moved = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const rock = PLANET_SOLIDS.find((solid) => solid.kind === 'rock');
const away = (solid, from) => {
  const up = normal(from);
  const d =
    up.x * solid.direction.x +
    up.y * solid.direction.y +
    up.z * solid.direction.z;
  return normal({
    x: up.x - solid.direction.x * d,
    y: up.y - solid.direction.y * d,
    z: up.z - solid.direction.z * d,
  });
};

test('al caer justo al lado de una roca, Gravi no queda pegado', () => {
  // Inside the 0.42 m band between the top footprint and the side collider.
  const start = offsetDirection(rock.direction, rock.radius + 0.2, 0);
  const state = place(start, rock.height + 2);
  run(state, { x: 0, y: 0, z: 0, jump: false }, 9.81, 1.5, PLANET_SOLIDS);
  assert.ok(state.grounded, 'aterriza');
  const distance = surfaceDistance(normal(state.position), rock.direction);
  assert.ok(
    distance >= rock.radius + PLAYER_RADIUS - 0.01,
    `queda fuera de la roca (${distance.toFixed(2)} m)`,
  );
  const before = { ...state.position };
  run(
    state,
    { ...away(rock, state.position), jump: false },
    9.81,
    1,
    PLANET_SOLIDS,
  );
  assert.ok(moved(before, state.position) > 1, 'puede alejarse caminando');
});

test('las rocas siguen bloqueando por los lados', () => {
  const start = offsetDirection(rock.direction, rock.radius + 3, 0);
  const state = place(start, 0);
  const toward = away(rock, state.position);
  const input = { x: -toward.x, y: -toward.y, z: -toward.z, jump: false };
  let closest = Infinity;
  for (let i = 0; i < 3 / PLANET_STEP; i++) {
    stepPlanet(state, input, 9.81, PLANET_STEP, PLANET_SOLIDS);
    closest = Math.min(
      closest,
      surfaceDistance(normal(state.position), rock.direction),
    );
  }
  assert.ok(
    closest >= rock.radius + PLAYER_RADIUS - 0.02,
    `no atraviesa la roca (${closest.toFixed(2)} m)`,
  );
  assert.ok(planetHeight(state) < 0.05, 'sigue en el suelo');
});

test('recorridos aleatorios entre obstáculos nunca dejan a Gravi atrapado', () => {
  const solids = awakenedSolids(AWAKENINGS.map((item) => item.id));
  const gravities = [1.62, 3.71, 9.81, 24.79];
  let seed = 11;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let runIndex = 0; runIndex < 40; runIndex++) {
    const solid = solids[Math.floor(random() * solids.length)];
    const state = place(
      offsetDirection(
        solid.direction,
        (random() - 0.5) * 8,
        (random() - 0.5) * 8,
      ),
      0,
    );
    let gravity = gravities[Math.floor(random() * 4)];
    let input = { x: random() - 0.5, y: random() - 0.5, z: random() - 0.5 };
    for (let t = 0; t < 120 * 12; t++) {
      if (t % 240 === 0) {
        input = { x: random() - 0.5, y: random() - 0.5, z: random() - 0.5 };
        gravity = gravities[Math.floor(random() * 4)];
      }
      stepPlanet(
        state,
        { ...input, jump: state.grounded && random() < 0.01 },
        gravity,
        PLANET_STEP,
        solids,
      );
    }
    if (!state.grounded)
      run(state, { x: 0, y: 0, z: 0, jump: false }, 9.81, 4, solids);
    // From wherever it ended, at least one of eight directions must be free.
    const up = normal(state.position);
    const ref =
      Math.abs(up.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const e1 = normal({
      x: up.y * ref.z - up.z * ref.y,
      y: up.z * ref.x - up.x * ref.z,
      z: up.x * ref.y - up.y * ref.x,
    });
    const e2 = {
      x: up.y * e1.z - up.z * e1.y,
      y: up.z * e1.x - up.x * e1.z,
      z: up.x * e1.y - up.y * e1.x,
    };
    const free = Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2;
      const copy = structuredClone(state);
      const before = { ...copy.position };
      run(
        copy,
        {
          x: e1.x * Math.cos(a) + e2.x * Math.sin(a),
          y: e1.y * Math.cos(a) + e2.y * Math.sin(a),
          z: e1.z * Math.cos(a) + e2.z * Math.sin(a),
          jump: false,
        },
        gravity,
        1.5,
        solids,
      );
      return moved(before, copy.position) > 0.5;
    }).some(Boolean);
    assert.ok(free, `recorrido ${runIndex}: Gravi quedó atrapado`);
  }
});
