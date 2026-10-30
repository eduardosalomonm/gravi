import {
  PLANET_RADIUS,
  offsetDirection,
  surfaceDistance,
  normalizeDirection,
} from './planet-world.mjs';
import { WORLD_REGIONS } from './world-layout.mjs';
const point = (x, z) => offsetDirection(WORLD_REGIONS[9].direction, x, z);
export const FINALE_FLOWERS = [
  [-7, 6, 1.62],
  [-3, 6, 9.81],
  [1, 6, 3.71],
].map(([x, z, gravity]) => ({ direction: point(x, z), gravity }));
const platform = (id, x, z, height, radius = 1.7) => ({
  id,
  direction: point(x, z),
  height,
  radius,
  kind: 'platform',
  supportTop: true,
});
export const FINALE_PATH = [
  platform('final-path-1', 2, 3, 0),
  platform('final-path-2', 1, 0, 0.6),
  platform('final-path-3', -3, -1, 0),
  platform('final-path-4', -6, -2, 0.9),
];
export const FINALE_STEPS = [
  platform('final-step-1', -5, -5, 1.6),
  platform('final-step-2', -1, -6, 3.6),
  platform('final-step-3', 3, -6, 6.4, 2),
];
export const FINALE_TREE = point(6, -6);
export const FINALE_SOLIDS = [
  ...FINALE_PATH.filter((p) => p.height > 0),
  ...FINALE_STEPS,
];
export function createFinale(stage = 0) {
  const safe = [0, 1, 2, 3].includes(stage) ? stage : 0;
  return {
    stage: safe,
    flower: safe > 0 ? 3 : 0,
    path: safe > 1 ? 4 : 0,
    jump: safe > 2 ? 3 : 0,
    dwell: 0,
  };
}
export function advanceFinale(finale, state, gravity, dt) {
  const up = normalizeDirection(state.position),
    height =
      Math.hypot(state.position.x, state.position.y, state.position.z) -
      PLANET_RADIUS;
  if (finale.stage === 0) {
    const flower = FINALE_FLOWERS[finale.flower];
    finale.dwell =
      state.grounded &&
      height < 0.5 &&
      surfaceDistance(up, flower.direction) < 1.4 &&
      Math.abs(gravity - flower.gravity) < 0.2
        ? finale.dwell + dt
        : 0;
    if (finale.dwell >= 1) {
      finale.flower++;
      finale.dwell = 0;
      if (finale.flower === 3) finale.stage = 1;
    }
  } else if (finale.stage === 1) {
    const stop = FINALE_PATH[finale.path];
    if (
      state.grounded &&
      surfaceDistance(up, stop.direction) < 1.35 &&
      (stop.height > 0 ? state.supportId === stop.id : height < 0.5)
    ) {
      finale.path++;
      if (finale.path === 4) finale.stage = 2;
    }
  } else if (finale.stage === 2 && state.justLanded) {
    if (
      state.supportId === FINALE_STEPS[finale.jump]?.id &&
      (finale.jump < 2 || (gravity > 0 && gravity <= 3.8))
    ) {
      finale.jump++;
      if (finale.jump === 3) finale.stage = 3;
    } else if (state.supportKind === 'planet') finale.jump = 0;
  }
  return finale.stage === 3;
}
export function finaleTarget(finale) {
  if (finale.stage === 0)
    return { ...FINALE_FLOWERS[Math.min(2, finale.flower)], height: 0 };
  if (finale.stage === 1) return FINALE_PATH[Math.min(3, finale.path)];
  return FINALE_STEPS[Math.min(2, finale.jump)];
}
export function finaleHint(finale) {
  if (finale.stage === 0)
    return `Descubrir · ${finale.flower}/3 flores. Observa la flor iluminada y busca la gravedad que la abre.`;
  if (finale.stage === 1)
    return `Recorrer · ${finale.path}/4 señales. Sigue los pétalos y aterriza en las rocas iluminadas.`;
  if (finale.stage === 2)
    return `Saltar · ${finale.jump}/3 plataformas. El último aterrizaje necesita Luna o Marte. Si caes, repite solo los saltos.`;
  return 'El Sakura del Horizonte ha florecido.';
}
