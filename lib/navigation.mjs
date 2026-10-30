import { PLANET_RADIUS, normalizeDirection } from './planet-world.mjs';
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const projected = (v, up) => ({
  x: v.x - up.x * dot(v, up),
  y: v.y - up.y * dot(v, up),
  z: v.z - up.z * dot(v, up),
});
export function coordinates(position) {
  const up = normalizeDirection(position);
  return {
    latitude: (Math.asin(Math.max(-1, Math.min(1, up.y))) * 180) / Math.PI,
    longitude:
      Math.abs(up.y) > 0.999999
        ? 0
        : (Math.atan2(-up.x, -up.z) * 180) / Math.PI,
  };
}
export function navigation(position, forward, target) {
  const up = normalizeDirection(position);
  const facing = normalizeDirection(projected(forward, up));
  const right = normalizeDirection(cross(facing, up));
  const north = projected({ x: 0, y: 1, z: 0 }, up);
  const atPole = Math.hypot(north.x, north.y, north.z) < 0.0001;
  const heading = atPole
    ? null
    : ((Math.atan2(-dot(north, right), dot(north, facing)) * 180) / Math.PI +
        360) %
      360;
  if (!target)
    return {
      heading,
      distance: 0,
      angle: 0,
      near: false,
      vertical: '',
      antipodal: false,
    };
  const direction = normalizeDirection(target.direction);
  const cosine = Math.max(-1, Math.min(1, dot(up, direction)));
  const distance = Math.acos(cosine) * PLANET_RADIUS;
  const toward = projected(direction, up);
  const antipodal = cosine < -0.9999;
  const angle = antipodal
    ? 0
    : (Math.atan2(dot(toward, right), dot(toward, facing)) * 180) / Math.PI;
  const difference =
    (target.height ?? 0) -
    (Math.hypot(position.x, position.y, position.z) - PLANET_RADIUS);
  return {
    heading,
    distance,
    angle,
    near: distance < 4,
    antipodal,
    vertical:
      Math.abs(difference) < 1.2
        ? ''
        : difference > 0
          ? 'Más arriba'
          : 'Más abajo',
  };
}
