import {
  PLANET_RADIUS,
  normalizeDirection,
  surfaceDistance,
} from './planet-world.mjs';
export const MAP_ROWS = 12,
  MAP_COLUMNS = 24;
export const MAP_CELLS = Array.from(
  { length: MAP_ROWS * MAP_COLUMNS },
  (_, i) => {
    const row = Math.floor(i / MAP_COLUMNS),
      column = i % MAP_COLUMNS;
    const theta = ((row + 0.5) * Math.PI) / MAP_ROWS,
      phi = ((column + 0.5) * 2 * Math.PI) / MAP_COLUMNS;
    return {
      id: String(i),
      row,
      column,
      direction: {
        x: -Math.cos(phi) * Math.sin(theta),
        y: Math.cos(theta),
        z: Math.sin(phi) * Math.sin(theta),
      },
    };
  },
);
export const cleanExploration = (value) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id) =>
              typeof id === 'string' && MAP_CELLS.some((c) => c.id === id),
          ),
        ),
      ]
    : [];
export function revealExploration(visited, position) {
  if (Math.hypot(position.x, position.y, position.z) > PLANET_RADIUS + 8)
    return visited;
  const up = normalizeDirection(position),
    known = new Set(visited);
  for (const cell of MAP_CELLS)
    if (surfaceDistance(up, cell.direction) < 12) known.add(cell.id);
  return [...known];
}
export function isRevealed(visited, direction) {
  const up = normalizeDirection(direction);
  const row = Math.min(
    MAP_ROWS - 1,
    Math.floor(
      (Math.acos(Math.max(-1, Math.min(1, up.y))) * MAP_ROWS) / Math.PI + 1e-5,
    ),
  );
  const phi = (Math.atan2(up.z, -up.x) + 2 * Math.PI) % (2 * Math.PI);
  return visited.includes(
    String(
      row * MAP_COLUMNS +
        (Math.floor((phi * MAP_COLUMNS) / (2 * Math.PI) + 1e-5) % MAP_COLUMNS),
    ),
  );
}
