/** Screen-space joystick vector; up maps to positive forward. */
export function joystickVector(
  dx,
  dy,
  radius,
  { deadZone = 0, response = 1 } = {},
) {
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || radius <= 0)
    return { x: 0, z: 0 };
  const zone = Math.max(0, Math.min(0.5, deadZone));
  const amount = Math.min(1, distance / radius);
  if (distance === 0 || amount <= zone) return { x: 0, z: 0 };
  const strength = ((amount - zone) / (1 - zone)) ** response;
  return { x: (dx / distance) * strength, z: (-dy / distance) * strength };
}
