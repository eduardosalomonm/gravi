import { canopySupport, canopySweep } from './canopy.mjs';
import {
  PLANET_RADIUS,
  PLANET_SOLIDS,
  surfaceDistance,
} from './planet-world.mjs';

export { PLANET_RADIUS, PLANET_PLATFORMS } from './planet-world.mjs';
export const PLANET_STEP = 1 / 120;
export const PLANET_JUMP_SPEED = 7;
export const PLAYER_RADIUS = 0.42;
export const PLAYER_HEIGHT = 1.35;
export const JUMP_GRACE = 0.1;
export const JUMP_BUFFER = 0.12;

const length = (v) => Math.hypot(v.x, v.y, v.z);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const scale = (v, n) => ({ x: v.x * n, y: v.y * n, z: v.z * n });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const normal = (v) => {
  const n = length(v) || 1;
  return scale(v, 1 / n);
};
const tangent = (v, n) => add(v, scale(n, -dot(v, n)));

export function solidSupportRadius(up, solid) {
  if (solid.kind === 'canopy') return canopySupport(up, solid);
  if (solid.kind !== 'platform') return PLANET_RADIUS + solid.height;
  // Platform tops are tangent planes. Intersect the player's radial ray with
  // that exact plane so the collision surface matches the visible mesh.
  return (
    (PLANET_RADIUS + solid.height) / Math.max(0.001, dot(up, solid.direction))
  );
}

export function planetSupportAt(
  position,
  solids = PLANET_SOLIDS,
  maxCanopyRadius = Infinity,
) {
  const up = normal(position);
  let result = { radius: PLANET_RADIUS, id: null, kind: 'planet' };
  for (const solid of solids) {
    if (
      solid.supportTop &&
      surfaceDistance(up, solid.direction) <= solid.radius &&
      (solid.kind !== 'canopy' ||
        solidSupportRadius(up, solid) <= maxCanopyRadius) &&
      solidSupportRadius(up, solid) > result.radius
    ) {
      result = {
        radius: solidSupportRadius(up, solid),
        id: solid.id,
        kind: solid.kind,
      };
    }
  }
  return result;
}

export function planetSupportRadius(position) {
  return planetSupportAt(position).radius;
}

function sweptSurfaceDistance(oldUp, nextUp, target) {
  const segment = {
    x: nextUp.x - oldUp.x,
    y: nextUp.y - oldUp.y,
    z: nextUp.z - oldUp.z,
  };
  const segmentLengthSquared = dot(segment, segment);
  if (segmentLengthSquared < 1e-12) return surfaceDistance(nextUp, target);
  const towardTarget = {
    x: target.x - oldUp.x,
    y: target.y - oldUp.y,
    z: target.z - oldUp.z,
  };
  const amount = Math.max(
    0,
    Math.min(1, dot(towardTarget, segment) / segmentLengthSquared),
  );
  return surfaceDistance(normal(add(oldUp, scale(segment, amount))), target);
}

function sideCollision(oldPosition, nextPosition, supportId, solids) {
  const oldUp = normal(oldPosition);
  const nextUp = normal(nextPosition);
  const oldHeight = length(oldPosition) - PLANET_RADIUS;
  const nextHeight = length(nextPosition) - PLANET_RADIUS;
  for (const solid of solids) {
    if (supportId === solid.id) continue;
    if (solid.kind === 'canopy') {
      const normal = canopySweep(
        oldPosition,
        nextPosition,
        solid,
        PLAYER_RADIUS,
        PLAYER_HEIGHT,
      );
      if (normal) return { ...solid, contactNormal: normal };
      continue;
    }
    const effectiveRadius = solid.radius + PLAYER_RADIUS;
    if (
      Math.min(oldHeight, nextHeight) >= solid.height - 0.025 ||
      Math.max(oldHeight, nextHeight) + PLAYER_HEIGHT <= 0
    )
      continue;
    const oldDistance = surfaceDistance(oldUp, solid.direction);
    // Already touching or overlapping: only moving closer is blocked, so Gravi
    // can always walk away from a side it is pressed against.
    if (oldDistance < effectiveRadius) {
      if (surfaceDistance(nextUp, solid.direction) < oldDistance - 1e-6)
        return solid;
      continue;
    }
    if (sweptSurfaceDistance(oldUp, nextUp, solid.direction) < effectiveRadius)
      return solid;
  }
  return null;
}

// Moves the feet out of any side volume they ended inside (for example after
// dropping just beside a rock from above its top) and removes the velocity
// pointing into it. Supports and canopies are left alone.
function pushOutOfSolids(state, solids) {
  const radius = length(state.position);
  const height = radius - PLANET_RADIUS;
  let up = normal(state.position);
  let moved = false;
  for (const solid of solids) {
    if (solid.kind === 'canopy' || solid.id === state.supportId) continue;
    if (height >= solid.height - 0.025 || height + PLAYER_HEIGHT <= 0) continue;
    const effectiveRadius = solid.radius + PLAYER_RADIUS;
    const distance = surfaceDistance(up, solid.direction);
    if (distance >= effectiveRadius - 1e-4) continue;
    let away = tangent(up, solid.direction);
    if (length(away) < 1e-9)
      away = tangent({ x: 1, y: 0.3, z: 0.2 }, solid.direction);
    away = normal(away);
    const angle = (effectiveRadius + 1e-3) / PLANET_RADIUS;
    up = normal(
      add(
        scale(solid.direction, Math.cos(angle)),
        scale(away, Math.sin(angle)),
      ),
    );
    const outward = normal(tangent(away, up));
    const inward = Math.min(0, dot(state.velocity, outward));
    state.velocity = add(state.velocity, scale(outward, -inward));
    moved = true;
  }
  if (moved) state.position = scale(up, radius);
  return moved;
}

export function createPlanetState() {
  return {
    position: { x: 0, y: PLANET_RADIUS, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    grounded: true,
    supportRadius: PLANET_RADIUS,
    supportId: null,
    supportKind: 'planet',
    distanceTravelled: 0,
    jumps: 0,
    justLanded: false,
    coyoteTime: 0,
    jumpBuffer: 0,
  };
}

export function resetPlanetState(state) {
  Object.assign(state, createPlanetState());
  return state;
}

export function planetHeight(state) {
  return Math.max(0, length(state.position) - PLANET_RADIUS);
}

export function stepPlanet(
  state,
  input,
  gravity,
  dt = PLANET_STEP,
  solids = PLANET_SOLIDS,
) {
  const oldPosition = { ...state.position };
  const oldRadius = length(oldPosition);
  const wasGrounded = state.grounded;
  const oldSupport = Number.isFinite(state.supportRadius)
    ? state.supportRadius
    : PLANET_RADIUS;
  let up = normal(state.position);
  let move = tangent(
    {
      x: Number.isFinite(input.x) ? input.x : 0,
      y: Number.isFinite(input.y) ? input.y : 0,
      z: Number.isFinite(input.z) ? input.z : 0,
    },
    up,
  );
  const moveLength = length(move);
  if (moveLength > 1) move = scale(move, 1 / moveLength);

  state.coyoteTime = state.grounded
    ? JUMP_GRACE
    : Math.max(0, (state.coyoteTime ?? 0) - dt);
  state.jumpBuffer = input.jump
    ? JUMP_BUFFER
    : Math.max(0, (state.jumpBuffer ?? 0) - dt);
  const launched =
    state.jumpBuffer > 0 && (state.grounded || state.coyoteTime > 0);
  if (launched) {
    state.velocity = add(
      scale(tangent(state.velocity, up), state.grounded ? 1 / 1.15 : 1),
      scale(up, PLANET_JUMP_SPEED),
    );
    state.coyoteTime = 0;
    state.jumpBuffer = 0;
    state.grounded = false;
    state.jumps += 1;
  }

  const acceleration = state.grounded ? 24 * 1.15 : 5;
  state.velocity = add(state.velocity, scale(move, acceleration * dt));
  if (!state.grounded && gravity > 0) {
    const radial = scale(up, dot(state.velocity, up));
    const current = tangent(state.velocity, up);
    const response = 1 - Math.exp(-10 * dt);
    state.velocity = add(
      radial,
      add(scale(current, 1 - response), scale(move, 4.5 * response)),
    );
  }
  if (state.grounded) {
    state.velocity = scale(tangent(state.velocity, up), Math.exp(-6 * dt));
  }
  const tangential = tangent(state.velocity, up);
  const tangentialSpeed = length(tangential);
  if (tangentialSpeed > 5.5) {
    const radial = scale(up, dot(state.velocity, up));
    state.velocity = add(radial, scale(tangential, 5.5 / tangentialSpeed));
  }
  state.velocity = add(state.velocity, scale(up, -gravity * dt));
  state.position = add(state.position, scale(state.velocity, dt));

  const radius = length(state.position);
  up = normal(state.position);
  const support = planetSupportAt(state.position, solids, oldRadius + 0.08);
  const supportRadius = support.radius;
  state.grounded = false;
  const followsSupport =
    wasGrounded &&
    !launched &&
    supportRadius >= oldSupport - 0.08 &&
    supportRadius <= oldSupport + 0.08 &&
    radius <= supportRadius + 0.12;
  const landsOnSupport =
    !wasGrounded &&
    oldRadius >= supportRadius - 0.01 &&
    radius <= supportRadius &&
    dot(state.velocity, up) <= 0;
  const hitSolid = landsOnSupport
    ? null
    : sideCollision(oldPosition, state.position, state.supportId, solids);
  if ((followsSupport && !hitSolid) || landsOnSupport) {
    state.position = scale(up, supportRadius);
    state.velocity = tangent(state.velocity, up);
    state.grounded = true;
    state.supportRadius = supportRadius;
    state.supportId = support.id;
    state.supportKind = support.kind;
  } else {
    if (hitSolid) {
      if (hitSolid.contactNormal) {
        state.position = oldPosition;
        const inward = Math.min(0, dot(state.velocity, hitSolid.contactNormal));
        state.velocity = add(
          state.velocity,
          scale(hitSolid.contactNormal, -inward),
        );
        state.grounded = wasGrounded && !launched;
        state.justLanded = false;
        return state;
      }
      const oldUp = normal(oldPosition);
      const nextRadius = Math.max(PLANET_RADIUS, radius);
      const towardSolid = normal(tangent(hitSolid.direction, oldUp));
      // Slide along the obstacle: keep the part of the step that does not
      // push into it, if that part is free.
      const step = tangent(add(state.position, scale(oldPosition, -1)), oldUp);
      const slideStep = add(
        step,
        scale(towardSolid, -Math.max(0, dot(step, towardSolid))),
      );
      const slideRadius = wasGrounded && !launched ? oldSupport : nextRadius;
      const slid = scale(normal(add(oldPosition, slideStep)), slideRadius);
      state.position =
        length(slideStep) > 1e-6 &&
        !sideCollision(oldPosition, slid, state.supportId, solids)
          ? slid
          : scale(oldUp, slideRadius);
      const approachSpeed = Math.max(0, dot(state.velocity, towardSolid));
      state.velocity = add(state.velocity, scale(towardSolid, -approachSpeed));
      if (wasGrounded && !launched) {
        state.velocity = tangent(state.velocity, oldUp);
        state.grounded = true;
        state.supportRadius = oldSupport;
      } else {
        state.supportRadius = PLANET_RADIUS;
        state.supportId = null;
        state.supportKind = 'planet';
      }
    } else {
      state.supportRadius = PLANET_RADIUS;
      state.supportId = null;
      state.supportKind = 'planet';
    }
  }
  pushOutOfSolids(state, solids);
  state.justLanded = !wasGrounded && state.grounded;
  const travelled = length({
    x: state.position.x - oldPosition.x,
    y: state.position.y - oldPosition.y,
    z: state.position.z - oldPosition.z,
  });
  if (state.grounded && moveLength > 0.05) state.distanceTravelled += travelled;
  return state;
}
