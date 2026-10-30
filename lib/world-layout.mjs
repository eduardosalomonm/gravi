import { PLANET_RADIUS, normalizeDirection } from './planet-world.mjs';
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const mul = (a, n) => ({ x: a.x * n, y: a.y * n, z: a.z * n });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const legacy = (x, z) => normalizeDirection({ x, y: 45, z });
const names = [
  'Claro del comienzo',
  'Valle de los pétalos',
  'Mirador lunar',
  'Círculo de las semillas',
  'Bosque de luciérnagas',
  'Costa de las cornisas',
  'Lagunas del reflejo',
  'Cauce del cielo',
  'Cumbre del viento',
  'Jardín del horizonte',
];
const ids = [
  'flowers',
  'petals',
  'sky',
  'jupiter',
  'lanterns',
  'ridge',
  'reflection',
  'river',
  'wind',
  'journey',
];
// Two staggered rings plus the poles leave each adventure its own clear space.
export const WORLD_REGIONS = ids.map((id, i) => {
  const latitude =
    i === 0 ? Math.PI / 2 : i === 9 ? -Math.PI / 2 : i <= 4 ? 0.36 : -0.36;
  const longitude =
    i === 0 || i === 9
      ? 0
      : (((i - 1) % 4) * Math.PI) / 2 + (i >= 5 ? Math.PI / 4 : 0);
  return {
    id,
    name: names[i],
    direction: {
      x: Math.cos(latitude) * Math.sin(longitude),
      y: Math.sin(latitude),
      z: Math.cos(latitude) * Math.cos(longitude),
    },
  };
});
// The ninth ordinary challenge reaches the opposite pole; the finale occupies its former clearing.
[WORLD_REGIONS[8].direction, WORLD_REGIONS[9].direction] = [
  WORLD_REGIONS[9].direction,
  WORLD_REGIONS[8].direction,
];
const centers = [
  [-6, -5],
  [6, -11],
  [-10, -23],
  [30, 21],
  [36, 13],
  [44, -5],
  [-43, 23],
  [-40, 33],
  [-40, 14],
];
const frame = (up) => {
  const ref =
    Math.abs(up.y) > 0.95 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
  const right = normalizeDirection(cross(ref, up));
  return { right, forward: cross(up, right) };
};
// Log/exp mapping keeps authored distances in metres when the planet changes size.
export function placeInRegion(direction, index) {
  const source = legacy(...centers[index]),
    destination = WORLD_REGIONS[index].direction;
  const cosine = Math.max(-1, Math.min(1, dot(source, direction))),
    angle = Math.acos(cosine);
  if (angle < 1e-8) return { ...destination };
  const tangent = normalizeDirection(add(direction, mul(source, -cosine))),
    a = frame(source),
    b = frame(destination);
  const mapped = add(
    mul(b.right, dot(tangent, a.right)),
    mul(b.forward, dot(tangent, a.forward)),
  );
  const theta = (angle * 45) / PLANET_RADIUS;
  return normalizeDirection(
    add(mul(destination, Math.cos(theta)), mul(mapped, Math.sin(theta))),
  );
}
export function placeDecoration(direction) {
  let closest = 0,
    best = -Infinity;
  centers.forEach(([x, z], i) => {
    const d = dot(direction, legacy(x, z));
    if (d > best) {
      best = d;
      closest = i;
    }
  });
  return placeInRegion(direction, closest);
}
