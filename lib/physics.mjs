import { touchesCollectible } from './collectibles.mjs';
import { CHALLENGES } from './challenges.mjs';
export const STEP = 1 / 120;
export const JUMP_SPEED = 7;
export const MAX_GRAVITY = 25;
export const PRESETS = {
  Cero: 0,
  Luna: 1.62,
  Marte: 3.71,
  Tierra: 9.81,
  Júpiter: 24.79,
};
export const PLATFORM = { x: -4, z: -2, radius: 1.8, top: 1.65 };
export const STAR = { x: 4, z: 3, y: 1.1 };
export const HOOP = { x: 3, z: -4, y: 5.2, radius: 1.05 };
export const FERRY = {
  x: -5,
  z: 4,
  radius: 1.45,
  top: 1.25,
  amplitude: 1.5,
  frequency: 0.55,
};
export const RETURN_RING = {
  x: -3,
  z: -6.5,
  y: 7,
  radius: 1.05,
  targetRadius: 1.05,
};
export function ferryAt(time) {
  return {
    ...FERRY,
    x: FERRY.x + Math.sin(time * FERRY.frequency) * FERRY.amplitude,
  };
}
export function createState() {
  return {
    x: 0,
    y: 0,
    z: 3,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    completed: CHALLENGES.map(() => false),
    time: 0,
    support: null,
    rideTime: 0,
    returnArmed: false,
    justLanded: false,
    landingSpeed: 0,
    rescued: false,
  };
}
export function resetPosition(s) {
  Object.assign(s, {
    x: 0,
    y: 0,
    z: 3,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    rescued: false,
    support: null,
    rideTime: 0,
    returnArmed: false,
    justLanded: false,
    landingSpeed: 0,
  });
}
export function setGravity(value) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_GRAVITY
  )
    throw new RangeError(`La gravedad debe estar entre 0 y ${MAX_GRAVITY}.`);
  return value;
}
/** Advance a fixed physics step. y is the height of the feet, in metres. */
export function step(s, input, gravity, dt = STEP) {
  // The purple ring is a holding field: choosing gravity has no time limit.
  if (s.returnArmed && gravity === 0) {
    s.time += dt;
    s.vx = s.vy = s.vz = 0;
    s.justLanded = false;
    s.rescued = false;
    return s;
  }
  const oldY = s.y;
  const wasGrounded = s.grounded;
  const oldFerry = ferryAt(s.time);
  s.time += dt;
  const moving = ferryAt(s.time);
  const riding = s.grounded && s.support === 'ferry';
  if (riding) s.x += moving.x - oldFerry.x;
  s.justLanded = false;
  s.rescued = false;
  let ix = input.x || 0,
    iz = input.z || 0;
  const length = Math.hypot(ix, iz);
  if (length > 1) {
    ix /= length;
    iz /= length;
  }
  const acceleration = s.grounded ? 30 : 8;
  s.vx += ix * acceleration * dt;
  s.vz += iz * acceleration * dt;
  if (s.grounded) {
    const friction = Math.exp(-7 * dt);
    s.vx *= friction;
    s.vz *= friction;
  }
  const speed = Math.hypot(s.vx, s.vz);
  if (speed > 5.5) {
    s.vx *= 5.5 / speed;
    s.vz *= 5.5 / speed;
  }
  if (input.jump && s.grounded) {
    s.vy = JUMP_SPEED;
    if (riding) s.vx += (moving.x - oldFerry.x) / dt;
    s.grounded = false;
  }
  s.x += s.vx * dt;
  s.z += s.vz * dt;
  s.y += s.vy * dt - 0.5 * gravity * dt * dt;
  s.vy -= gravity * dt;
  s.grounded = false;
  s.support = null;
  const impactSpeed = Math.max(0, -s.vy);
  for (const platform of [
    { ...PLATFORM, id: 'lookout' },
    { ...moving, id: 'ferry' },
  ]) {
    const dx = s.x - platform.x,
      dz = s.z - platform.z,
      distance = Math.hypot(dx, dz);
    if (
      distance <= platform.radius &&
      oldY >= platform.top - 0.001 &&
      s.y <= platform.top &&
      s.vy <= 0
    ) {
      s.y = platform.top;
      s.vy = 0;
      s.grounded = true;
      s.support = platform.id;
      if (platform.id === 'lookout') s.completed[1] = true;
    } else if (
      distance < platform.radius + 0.6 &&
      s.y < platform.top - 0.015 &&
      s.y + 1.5 > 0
    ) {
      const nx = distance > 0.0001 ? dx / distance : 1,
        nz = distance > 0.0001 ? dz / distance : 0;
      s.x = platform.x + nx * (platform.radius + 0.6);
      s.z = platform.z + nz * (platform.radius + 0.6);
      const into = s.vx * nx + s.vz * nz;
      if (into < 0) {
        s.vx -= into * nx;
        s.vz -= into * nz;
      }
    }
  }
  if (s.y <= 0) {
    s.y = 0;
    s.vy = 0;
    s.grounded = true;
  }
  s.justLanded = !wasGrounded && s.grounded;
  if (s.justLanded) s.landingSpeed = impactSpeed;
  s.rideTime = s.support === 'ferry' ? s.rideTime + dt : 0;
  if (s.rideTime >= 3 - 1e-8) s.completed[3] = true;
  if (
    !s.completed[4] &&
    !s.grounded &&
    gravity === 0 &&
    Math.min(oldY, s.y) + 0.25 <= RETURN_RING.y &&
    Math.max(oldY, s.y) + 1.35 >= RETURN_RING.y &&
    Math.hypot(s.x - RETURN_RING.x, s.z - RETURN_RING.z) <=
      RETURN_RING.radius + 0.6
  ) {
    s.returnArmed = true;
    s.x = RETURN_RING.x;
    s.z = RETURN_RING.z;
    s.y = RETURN_RING.y - 0.8;
    s.vx = s.vy = s.vz = 0;
  }
  if (s.grounded && s.returnArmed) {
    if (
      s.y === 0 &&
      gravity > 0 &&
      Math.hypot(s.x - RETURN_RING.x, s.z - RETURN_RING.z) <=
        RETURN_RING.targetRadius
    )
      s.completed[4] = true;
    s.returnArmed = false;
  }
  const radial = Math.hypot(s.x, s.z);
  if (radial > 11.4) {
    const nx = s.x / radial,
      nz = s.z / radial;
    s.x = nx * 11.4;
    s.z = nz * 11.4;
    const outward = s.vx * nx + s.vz * nz;
    if (outward > 0) {
      s.vx -= outward * nx;
      s.vz -= outward * nz;
    }
  }
  if (touchesCollectible(s, STAR, 0.7)) s.completed[0] = true;
  if (
    (oldY + 0.8 - HOOP.y) * (s.y + 0.8 - HOOP.y) <= 0 &&
    Math.hypot(s.x - HOOP.x, s.z - HOOP.z) <= HOOP.radius
  )
    s.completed[2] = true;
  if (s.y > 38) {
    resetPosition(s);
    s.rescued = true;
  }
  return s;
}
