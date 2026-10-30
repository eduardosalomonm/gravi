import { PLANET_RADIUS } from './planet-world.mjs';
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (v, n) => ({ x: v.x * n, y: v.y * n, z: v.z * n });
// The same radial frame used by Three's quaternion from +Y to the surface normal.
export function canopyCollider(
  id,
  direction,
  position,
  size,
  spin = 0,
  radius = PLANET_RADIUS,
) {
  const d = 1 + direction.y;
  const right =
    d < 1e-10
      ? { x: -1, y: 0, z: 0 }
      : {
          x: 1 - (direction.x * direction.x) / d,
          y: -direction.x,
          z: (-direction.x * direction.z) / d,
        };
  const forward =
    d < 1e-10
      ? { x: 0, y: 0, z: 1 }
      : {
          x: (-direction.x * direction.z) / d,
          y: -direction.z,
          z: 1 - (direction.z * direction.z) / d,
        };
  const center = add(
    scale(direction, radius + position[1]),
    add(scale(right, position[0]), scale(forward, position[2])),
  );
  const length = Math.hypot(center.x, center.y, center.z);
  return {
    id,
    kind: 'canopy',
    supportTop: true,
    center,
    axes: [
      add(scale(right, Math.cos(spin)), scale(forward, -Math.sin(spin))),
      direction,
      add(scale(right, Math.sin(spin)), scale(forward, Math.cos(spin))),
    ],
    size,
    direction: scale(center, 1 / length),
    radius: Math.max(...size) + 0.2,
    height: length - radius + size[1],
  };
}
export function canopySupport(up, solid) {
  let a = 0,
    b = 0,
    c = -1;
  solid.axes.forEach((axis, i) => {
    const u = dot(up, axis) / solid.size[i],
      p = dot(solid.center, axis) / solid.size[i];
    a += u * u;
    b -= 2 * u * p;
    c += p * p;
  });
  const disc = b * b - 4 * a * c;
  return disc < 0 ? 0 : (-b + Math.sqrt(disc)) / (2 * a);
}
export function canopySweep(
  oldFeet,
  nextFeet,
  solid,
  playerRadius,
  playerHeight,
) {
  const playerCenter = (feet) => {
    const r = Math.hypot(feet.x, feet.y, feet.z);
    return scale(feet, 1 + playerHeight / 2 / r);
  };
  const old = playerCenter(oldFeet),
    next = playerCenter(nextFeet);
  const delta = add(next, scale(old, -1)),
    relative = add(old, scale(solid.center, -1));
  const sizes = solid.size.map(
    (size, i) => size + (i === 1 ? playerHeight / 2 : playerRadius),
  );
  let a = 0,
    b = 0,
    c = -1;
  solid.axes.forEach((axis, i) => {
    const v = dot(delta, axis) / sizes[i],
      p = dot(relative, axis) / sizes[i];
    a += v * v;
    b += 2 * p * v;
    c += p * p;
  });
  // Moving away from a previous contact must remain possible.
  if (b >= 0 || a < 1e-12) return null;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const entry = (-b - Math.sqrt(disc)) / (2 * a);
  if (entry > 1 || (entry < -0.05 && c > 0)) return null;
  const contact = add(relative, scale(delta, Math.max(0, entry)));
  let normal = { x: 0, y: 0, z: 0 };
  solid.axes.forEach((axis, i) => {
    normal = add(
      normal,
      scale(axis, dot(contact, axis) / (sizes[i] * sizes[i])),
    );
  });
  const len = Math.hypot(normal.x, normal.y, normal.z) || 1;
  return scale(normal, 1 / len);
}
