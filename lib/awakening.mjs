import {
  createFinale,
  advanceFinale,
  finaleTarget,
  finaleHint,
  FINALE_TREE,
  FINALE_FLOWERS,
  FINALE_SOLIDS,
} from './finale-course.mjs';
import {
  WORLD_REGIONS,
  placeInRegion,
  placeDecoration,
} from './world-layout.mjs';
import { canopyCollider } from './canopy.mjs';
import {
  PLANET_RADIUS,
  normalizeDirection,
  surfaceDistance,
  PLANET_SOLIDS,
  offsetDirection,
} from './planet-world.mjs';

// Shared by the scene, challenges, collisions and explorer map.
export const forestPoint = (x, z) => normalizeDirection({ x, y: 45, z });
export const FOREST_CENTER = WORLD_REGIONS[0].direction;
export const inForest = (direction) =>
  WORLD_REGIONS.some(
    (region) => surfaceDistance(direction, region.direction) < 16,
  );
export const LANTERN_STOPS = [
  [25, 6],
  [31, 11],
  [39, 14],
  [46, 19],
].map(([x, z]) => forestPoint(x, z));
export const RIDGE_STEPS = [
  [34, -3, 0.9],
  [42, -5, 2.2],
  [51, -7, 3.5],
].map(([x, z, height], i) => ({
  id: `ridge-${i + 1}`,
  direction: forestPoint(x, z),
  radius: 2,
  height,
  kind: 'platform',
  supportTop: true,
}));
export const PETAL_STOPS = [
  [6, -3],
  [11, -8],
  [8, -15],
  [2, -19],
].map(([x, z]) => forestPoint(x, z));
export const SKY_STEPS = [
  { id: 'sky-1', direction: forestPoint(-9, -14), radius: 2, height: 0.8 },
  { id: 'sky-2', direction: forestPoint(-13, -18), radius: 2, height: 2.0 },
  { id: 'sky-3', direction: forestPoint(-12, -23), radius: 2, height: 3.4 },
  { id: 'sky-4', direction: forestPoint(-7, -27), radius: 2.5, height: 4.8 },
].map((item) => ({ ...item, kind: 'platform', supportTop: true }));

export const AWAKENINGS = [
  {
    id: 'flowers',
    level: 1,
    difficulty: 'Intuir',
    help: '',
    title: 'El claro que respira',
    category: 'Descubrir',
    sakura: 'nube',
    label: 'Sakura Nube',
    direction: forestPoint(-6, -5),
    tree: forestPoint(-9, -5),
    height: 0,
    hint: 'Un remolino de flores pálidas. Sus pétalos parecen querer despegar.',
    success: 'El claro respira otra vez. Las mariposas han vuelto.',
    reward: 'Un jardín vivo con mariposas',
    icon: 'Flower2',
  },
  {
    id: 'petals',
    level: 1,
    difficulty: 'Intuir',
    help: '',
    title: 'El sendero de pétalos',
    category: 'Recorrer',
    sakura: 'espiral',
    label: 'Sakura Espiral',
    direction: PETAL_STOPS[0],
    tree: forestPoint(2, -22),
    height: 0,
    hint: 'Sigue los cuatro grupos de pétalos desde la entrada del sendero.',
    success: 'El sendero ha despertado. Se ilumina el camino de vuelta.',
    reward: 'Un sendero que permanece iluminado',
    icon: 'Route',
  },
  {
    id: 'sky',
    level: 1,
    difficulty: 'Intuir',
    help: '',
    title: 'Peldaños al cielo',
    category: 'Saltar',
    sakura: 'constelacion',
    label: 'Sakura Constelación',
    direction: SKY_STEPS[0].direction,
    tree: forestPoint(-7, -33),
    height: 0.8,
    hint: 'Aterriza en los cuatro peldaños, de abajo arriba. Luna te da tiempo.',
    success: 'La constelación ha florecido sobre el mirador.',
    reward: 'Un mirador entre copas suspendidas',
    icon: 'Sparkles',
  },
];
AWAKENINGS.push(
  {
    id: 'jupiter',
    title: 'El abrazo de Júpiter',
    category: 'Descubrir',
    sakura: 'nube',
    label: 'Sakura del Abrazo',
    direction: forestPoint(30, 21),
    tree: forestPoint(34, 25),
    height: 0,
    hint: 'En el círculo de piedras, apoya las patitas y siente el peso de Júpiter.',
    success: 'El Sakura del Abrazo ha despertado entre las piedras.',
    reward: 'Un círculo de flores doradas',
    icon: 'Flower2',
  },
  {
    id: 'lanterns',
    title: 'La senda de las luciérnagas',
    category: 'Recorrer',
    sakura: 'espiral',
    label: 'Sakura de las Luces',
    direction: LANTERN_STOPS[0],
    tree: forestPoint(50, 23),
    height: 0,
    hint: 'Sigue los cuatro faroles de semillas desde la entrada. Se encenderán a tu paso.',
    success: 'Las luciérnagas iluminan la senda y su sakura.',
    reward: 'Una senda de luces encendidas',
    icon: 'Route',
  },
  {
    id: 'ridge',
    title: 'Las tres cornisas',
    category: 'Saltar',
    sakura: 'constelacion',
    label: 'Sakura de la Brisa',
    direction: RIDGE_STEPS[0].direction,
    tree: forestPoint(59, -9),
    height: 0.9,
    hint: 'Enlaza tres cornisas sin tocar el suelo. Prueba Marte y suelta el joystick para frenar.',
    success: 'El Sakura de la Brisa ha florecido en lo alto.',
    reward: 'Un mirador de flores al viento',
    icon: 'Sparkles',
  },
);
export const WIND_STEPS = [
  [-25, 10, 0.8],
  [-31, 12, 2],
  [-38, 13, 3.5],
  [-45, 15, 4.8],
  [-53, 17, 6.2],
].map(([x, z, height], i) => ({
  id: `wind-${i + 1}`,
  direction: forestPoint(x, z),
  height,
  radius: i === 2 ? 2.1 : 1.65,
  kind: 'platform',
  supportTop: true,
}));
export const RIVER_STOPS = [
  [-24, 26, 0],
  [-30, 30, 0.8],
  [-37, 32, 0],
  [-44, 35, 1.4],
  [-52, 38, 0],
].map(([x, z, height], i) => ({
  id: `river-${i + 1}`,
  direction: forestPoint(x, z),
  height,
  radius: 1.8,
  kind: 'platform',
  supportTop: true,
}));
export const RESONANCE_STONES = [0, 1, 2].map((i) =>
  offsetDirection(
    AWAKENINGS[3].direction,
    Math.cos((i * Math.PI * 2) / 3) * 3.3,
    Math.sin((i * Math.PI * 2) / 3) * 3.3,
  ),
);
export const REFLECTION_POINTS = [
  forestPoint(-38, 23),
  forestPoint(-43, 20),
  forestPoint(-48, 24),
];
AWAKENINGS.push(
  {
    id: 'reflection',
    title: 'El reflejo imposible',
    category: 'Descubrir',
    sakura: 'nube',
    label: 'Sakura del Reflejo',
    direction: REFLECTION_POINTS[0],
    tree: forestPoint(-46, 27),
    height: 0,
    hint: 'Tres reflejos guardan un cielo distinto. Despiértalos de ligero a pesado.',
    help: 'Visita los tres espejos en orden: Luna, Tierra y Júpiter. Permanece un segundo en cada uno.',
    success: 'Un cielo de estrellas ha nacido sobre el estanque.',
    reward: 'Un estanque con estrellas suspendidas',
    icon: 'Flower2',
  },
  {
    id: 'river',
    title: 'El río que sube',
    category: 'Recorrer',
    sakura: 'espiral',
    label: 'Sakura del Río',
    direction: RIVER_STOPS[0].direction,
    tree: forestPoint(-58, 40),
    height: 0,
    hint: 'Sigue cinco remolinos. El agua trepa sobre las rocas: salta para acompañarla.',
    help: 'Sigue los aros en orden, aterrizando en las dos rocas. Luna facilita los saltos; cada remolino conserva tu avance.',
    success: 'El río de luz fluye hacia el cielo.',
    reward: 'Un río de luz que asciende entre pétalos',
    icon: 'Route',
  },
  {
    id: 'wind',
    title: 'La escalera del viento',
    category: 'Saltar',
    sakura: 'constelacion',
    label: 'Sakura del Viento',
    direction: WIND_STEPS[0].direction,
    tree: forestPoint(-60, 17),
    height: 0.8,
    hint: 'Cinco peldaños más estrechos. La tercera terraza guarda tu avance.',
    help: 'Usa Luna para subir. Suelta el movimiento para frenar sobre cada aro. Si caes después del tercero, retoma desde el cuarto.',
    success: 'Una constelación abraza la escalera del viento.',
    reward: 'Una corona de estrellas sobre las alturas',
    icon: 'Sparkles',
  },
);
AWAKENINGS.forEach((item, i) => {
  item.level = Math.floor(i / 3) + 1;
  item.difficulty = ['Intuir', 'Experimentar', 'Dominar'][item.level - 1];
});
AWAKENINGS[3].hint =
  'Tres semillas de piedra duermen alrededor del círculo. El peso despierta su luz.';
AWAKENINGS[3].help =
  'Acércate a cada una de las tres luces con Júpiter durante un segundo. Después vuelve al centro.';
AWAKENINGS[0].help =
  'Quédate entre las flores con gravedad Luna durante un instante. Observa cómo se abren.';
// Move complete challenge footprints together, before constructing any colliders.
AWAKENINGS.forEach((item, i) => {
  item.direction = placeInRegion(item.direction, i);
  item.tree = placeInRegion(item.tree, i);
  item.region = WORLD_REGIONS[i].name;
});
[
  [PETAL_STOPS, 1],
  [LANTERN_STOPS, 4],
  [RESONANCE_STONES, 3],
  [REFLECTION_POINTS, 6],
].forEach(([points, region]) =>
  points.forEach((point, i) => {
    points[i] = placeInRegion(point, region);
  }),
);
[
  [SKY_STEPS, 2],
  [RIDGE_STEPS, 5],
  [RIVER_STOPS, 7],
  [WIND_STEPS, 8],
].forEach(([steps, region]) =>
  steps.forEach((step) => {
    step.direction = placeInRegion(step.direction, region);
  }),
);
AWAKENINGS.push({
  id: 'journey',
  title: 'El último florecer',
  category: 'Viajar',
  sakura: 'constelacion',
  label: 'Sakura del Horizonte',
  level: 0,
  difficulty: 'Gran final',
  help: 'Completa los nueve retos. Abre las flores con Luna, Tierra y Marte; sigue cuatro señales y sube tres plataformas. Cada etapa queda guardada.',
  direction: FINALE_FLOWERS[0].direction,
  tree: FINALE_TREE,
  height: 0,
  hint: 'Despierta los otros nueve sakuras para combinar tus tres habilidades en el reto final.',
  success:
    'Diez regiones, diez sakuras. Has despertado todo el mundo de Gravi.',
  reward: 'El Sakura del Horizonte y su corona dorada',
  icon: 'Sparkles',
  region: WORLD_REGIONS[9].name,
});
export const awakeningById = (id) =>
  AWAKENINGS.find((item) => item.id === id) ?? null;
export function createAwakeningState(saved = {}) {
  const known = new Set(AWAKENINGS.map((item) => item.id));
  return {
    completed: [
      ...new Set((saved.completed ?? []).filter((id) => known.has(id))),
    ],
    discovered: [
      ...new Set(
        [...(saved.discovered ?? []), ...(saved.completed ?? [])].filter((id) =>
          known.has(id),
        ),
      ),
    ],
    visitedRegions: [
      ...new Set(
        (saved.visitedRegions ?? []).filter((id) =>
          WORLD_REGIONS.some((r) => r.id === id),
        ),
      ),
    ],
    finale: createFinale(
      saved.completed?.includes('journey') ? 3 : saved.finaleStage,
    ),
    petalStep: 0,
    skyStep: 0,
    flowerTime: 0,
    newlyCompleted: null,
    lanternStep: 0,
    ridgeStep: 0,
    stoneTime: 0,
    seedTimes: [0, 0, 0],
    stones: [],
    reflectionStep: 0,
    reflectionTime: 0,
    riverStep: 0,
    windStep: 0,
  };
}
export function advanceAwakening(progress, state, gravity, dt) {
  progress.newlyCompleted = null;
  const up = normalizeDirection(state.position);
  const altitude =
    Math.hypot(state.position.x, state.position.y, state.position.z) -
    PLANET_RADIUS;
  if (altitude < 8)
    for (const region of WORLD_REGIONS) {
      if (
        surfaceDistance(up, region.direction) < 14 &&
        !progress.visitedRegions.includes(region.id)
      )
        progress.visitedRegions.push(region.id);
    }
  for (const item of AWAKENINGS) {
    if (
      altitude < 10 &&
      surfaceDistance(up, item.direction) < 10 &&
      !progress.discovered.includes(item.id)
    )
      progress.discovered.push(item.id);
  }
  const complete = (id) => {
    if (progress.completed.includes(id)) return;
    progress.completed.push(id);
    if (!progress.discovered.includes(id)) progress.discovered.push(id);
    progress.newlyCompleted = id;
  };
  if (!progress.completed.includes('flowers')) {
    const within =
      surfaceDistance(up, AWAKENINGS[0].direction) < 2.5 &&
      state.grounded &&
      altitude < 1;
    progress.flowerTime =
      within && gravity > 0 && gravity <= 2 ? progress.flowerTime + dt : 0;
    if (progress.flowerTime >= 1.5) complete('flowers');
  }
  if (
    !progress.completed.includes('petals') &&
    state.grounded &&
    altitude < 0.5 &&
    surfaceDistance(up, PETAL_STOPS[progress.petalStep]) < 1.7
  ) {
    progress.petalStep += 1;
    if (progress.petalStep === PETAL_STOPS.length) complete('petals');
  }
  if (!progress.completed.includes('sky') && state.justLanded) {
    if (state.supportId === SKY_STEPS[progress.skyStep]?.id) {
      progress.skyStep += 1;
      if (progress.skyStep === SKY_STEPS.length) complete('sky');
    } else if (state.supportKind === 'planet') progress.skyStep = 0;
  }
  if (!progress.completed.includes('jupiter')) {
    for (let i = 0; i < RESONANCE_STONES.length; i++) {
      progress.seedTimes[i] =
        state.grounded &&
        gravity >= 24 &&
        surfaceDistance(up, RESONANCE_STONES[i]) < 1.2
          ? progress.seedTimes[i] + dt
          : 0;
      if (progress.seedTimes[i] >= 1 && !progress.stones.includes(i))
        progress.stones.push(i);
    }
    progress.stoneTime =
      progress.stones.length === 3 &&
      state.grounded &&
      altitude < 0.5 &&
      gravity >= 24 &&
      surfaceDistance(up, awakeningById('jupiter').direction) < 2.4
        ? progress.stoneTime + dt
        : 0;
    if (progress.stoneTime >= 1.5) complete('jupiter');
  }
  if (
    !progress.completed.includes('lanterns') &&
    state.grounded &&
    altitude < 0.5 &&
    surfaceDistance(up, LANTERN_STOPS[progress.lanternStep]) < 1.7
  ) {
    progress.lanternStep++;
    if (progress.lanternStep === 4) complete('lanterns');
  }
  if (!progress.completed.includes('ridge') && state.justLanded) {
    if (state.supportId === RIDGE_STEPS[progress.ridgeStep]?.id) {
      progress.ridgeStep++;
      if (progress.ridgeStep === 3) complete('ridge');
    } else if (state.supportKind === 'planet') progress.ridgeStep = 0;
  }
  if (!progress.completed.includes('reflection')) {
    const expected = [1.62, 9.81, 24.79][progress.reflectionStep];
    const near =
      surfaceDistance(up, REFLECTION_POINTS[progress.reflectionStep]) < 1.3;
    progress.reflectionTime =
      state.grounded &&
      altitude < 0.5 &&
      near &&
      Math.abs(gravity - expected) < 0.2
        ? progress.reflectionTime + dt
        : 0;
    if (progress.reflectionTime >= 1) {
      progress.reflectionStep++;
      progress.reflectionTime = 0;
      if (progress.reflectionStep === 3) complete('reflection');
    }
  }
  if (!progress.completed.includes('river')) {
    const stop = RIVER_STOPS[progress.riverStep];
    if (
      state.grounded &&
      surfaceDistance(up, stop.direction) < 1.25 &&
      (stop.height === 0 ? altitude < 0.5 : state.supportId === stop.id)
    ) {
      progress.riverStep++;
      if (progress.riverStep === 5) complete('river');
    }
  }
  if (!progress.completed.includes('wind') && state.justLanded) {
    if (state.supportId === WIND_STEPS[progress.windStep]?.id) {
      progress.windStep++;
      if (progress.windStep === 5) complete('wind');
    } else if (state.supportKind === 'planet')
      progress.windStep = progress.windStep >= 3 ? 3 : 0;
  }
  if (
    !progress.completed.includes('journey') &&
    finaleUnlocked(progress) &&
    advanceFinale(progress.finale, state, gravity, dt)
  )
    complete('journey');
  return progress;
}
export const finaleUnlocked = (progress) =>
  AWAKENINGS.filter((a) => a.id !== 'journey').every((a) =>
    progress.completed.includes(a.id),
  );
export function journeyHint(progress) {
  const missing = AWAKENINGS.filter(
    (a) => a.id !== 'journey' && !progress.completed.includes(a.id),
  );
  return missing.length
    ? `Faltan ${missing.length} sakuras: ${`empieza por ${missing[0].title}`}.`
    : finaleHint(progress.finale ?? createFinale(progress.finaleStage));
}
export function resetAwakeningChallenges(progress) {
  return createAwakeningState({ visitedRegions: progress.visitedRegions });
}
export function awakeningTarget(id, progress) {
  const item = awakeningById(id);
  if (!item) return null;
  if (progress.completed.includes(id))
    return {
      ...item,
      direction: item.tree,
      height: 0,
      title: item.label,
      hint: item.reward,
      category: 'Florecido',
    };
  if (id === 'journey')
    return {
      ...item,
      ...(finaleUnlocked(progress)
        ? finaleTarget(progress.finale ?? createFinale(progress.finaleStage))
        : {}),
      id: item.id,
      hint: journeyHint(progress),
    };
  if (id === 'reflection')
    return {
      ...item,
      direction: REFLECTION_POINTS[Math.min(2, progress.reflectionStep)],
    };
  if (id === 'river' || id === 'wind')
    return {
      ...item,
      ...(id === 'river'
        ? RIVER_STOPS[Math.min(4, progress.riverStep)]
        : WIND_STEPS[Math.min(4, progress.windStep)]),
      id,
    };
  if (id === 'petals')
    return { ...item, direction: PETAL_STOPS[Math.min(3, progress.petalStep)] };
  if (id === 'sky')
    return {
      ...item,
      ...SKY_STEPS[Math.min(3, progress.skyStep)],
      id: item.id,
    };
  if (id === 'lanterns')
    return {
      ...item,
      direction: LANTERN_STOPS[Math.min(3, progress.lanternStep)],
    };
  if (id === 'ridge')
    return {
      ...item,
      ...RIDGE_STEPS[Math.min(2, progress.ridgeStep)],
      id: item.id,
    };
  return item;
}

export const FOREST_TREES = [
  [-12, 2],
  [-15, -3],
  [-18, -8],
  [-19, -16],
  [-19, -24],
  [-16, -30],
  [-3, -31],
  [3, -30],
  [10, -26],
  [15, -20],
  [18, -13],
  [17, -5],
  [13, 3],
  [6, 6],
  [-5, 6],
  [-22, -11],
  [20, -22],
  [24, 18],
  [26, 27],
  [40, 29],
  [51, 30],
  [60, 20],
  [57, 9],
  [61, -1],
  [48, -16],
  [35, -15],
  [24, -8],
].map(([x, z], i) => ({
  id: `forest-tree-${i}`,
  direction: placeDecoration(forestPoint(x, z)),
  height: 3.4 + (i % 4) * 0.3,
  width: 1.4 + (i % 3) * 0.18,
}));
FOREST_TREES.push(
  ...WORLD_REGIONS.flatMap((region, i) =>
    Array.from({ length: 5 }, (_, k) => ({
      id: `region-tree-${i}-${k}`,
      direction: offsetDirection(
        region.direction,
        Math.cos((k * Math.PI * 2) / 5 + i) * 14,
        Math.sin((k * Math.PI * 2) / 5 + i) * 14,
      ),
      height: 3.6 + (k % 3) * 0.4,
      width: 1.45,
    })),
  ),
);
export const RUIN_POSTS = [-1, 1].map((sign, i) => ({
  id: `ruin-${i}`,
  direction: placeInRegion(
    offsetDirection(forestPoint(1, -12), sign * 1.7, 0),
    1,
  ),
  radius: 0.46,
  height: 2.4,
  kind: 'platform',
  supportTop: true,
}));
export const FOREST_ROCKS = [
  [-4, 3],
  [3, 2],
  [-12, -9],
  [15, -11],
  [7, -25],
  [20, -1],
  [-22, -20],
].map(([x, z], i) => ({
  id: `forest-rock-${i}`,
  direction: placeDecoration(forestPoint(x, z)),
  radius: 0.6 + (i % 3) * 0.2,
  height: 0.4 + (i % 3) * 0.35,
  kind: 'platform',
  supportTop: true,
}));
FOREST_ROCKS.push(
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `embrace-stone-${i}`,
    direction: offsetDirection(
      AWAKENINGS[3].direction,
      Math.cos((i * Math.PI) / 4) * 2.9,
      Math.sin((i * Math.PI) / 4) * 2.9,
    ),
    radius: 0.28,
    height: 0.25,
    kind: 'platform',
    supportTop: true,
  })),
);
// Pale spires frame the summit, outside the landing route and tree trunks.
// Rendering and physics use exactly these radial cylinders.
export const WIND_PILLARS = Array.from({ length: 12 }, (_, i) => ({
  id: `wind-pillar-${i}`,
  direction: offsetDirection(
    WIND_STEPS.at(-1).direction,
    Math.cos((i * Math.PI) / 6) * 10,
    Math.sin((i * Math.PI) / 6) * 10,
  ),
  radius: 0.8,
  height: 3.5 + (i % 4) * 0.8,
  kind: 'platform',
  supportTop: true,
})).filter((p) =>
  [
    ...WIND_STEPS,
    ...FOREST_ROCKS,
    ...FOREST_TREES.map((t) => ({ ...t, radius: 0.8 })),
    ...AWAKENINGS.map((a) => ({ direction: a.tree, radius: 1 })),
  ].every(
    (other) =>
      surfaceDistance(p.direction, other.direction) >
      p.radius + other.radius + 2,
  ),
);
export const FOREST_SOLIDS = [
  ...WIND_PILLARS,
  ...FINALE_SOLIDS,
  ...PLANET_SOLIDS.filter((solid) => !inForest(solid.direction)),
  ...SKY_STEPS,
  ...RIDGE_STEPS,
  ...WIND_STEPS,
  ...RIVER_STOPS.filter((s) => s.height > 0),
  ...RUIN_POSTS,
  ...FOREST_ROCKS,
  ...FOREST_TREES.map((tree) => ({
    id: tree.id,
    direction: tree.direction,
    radius: 0.38,
    height: tree.height,
    kind: 'tree',
    supportTop: false,
  })),
  ...AWAKENINGS.map((item) => ({
    id: `sakura-${item.id}`,
    direction: item.tree,
    radius: 0.45,
    height: item.sakura === 'constelacion' ? 5.5 : 3.7,
    kind: 'tree',
    supportTop: true,
  })),
];
export const FOREST_CANOPIES = FOREST_TREES.flatMap((tree, i) =>
  Array.from({ length: 3 }, (_, k) => {
    const angle = (k * Math.PI * 2) / 3 + i;
    return canopyCollider(
      `${tree.id}-canopy-${k}`,
      tree.direction,
      [Math.cos(angle) * 0.85, tree.height + k * 0.26, Math.sin(angle) * 0.85],
      [tree.width, 0.85, tree.width * 0.8],
      angle,
    );
  }),
);
FOREST_SOLIDS.push(...FOREST_CANOPIES);
export const SAKURA_CENTERS = {
  flowers: [
    [-1, 3.4, 0],
    [0.85, 3.65, 0.2],
    [0, 4.35, -0.35],
  ],
  petals: [
    [1, 2.7, 0],
    [-1, 3.7, 0.1],
    [0.4, 4.9, 0],
  ],
  sky: [
    [-1.15, 4.4, 0],
    [1, 5.5, 0],
    [0, 7.2, -0.25],
  ],
};
export const SAKURA_CANOPIES = AWAKENINGS.flatMap((item) =>
  SAKURA_CENTERS[
    item.sakura === 'nube'
      ? 'flowers'
      : item.sakura === 'espiral'
        ? 'petals'
        : 'sky'
  ].map((p, i) => ({
    ...canopyCollider(
      `sakura-${item.id}-crown-${i}`,
      item.tree,
      p,
      [1.1, 0.58, 0.92],
    ),
    awakening: item.id,
  })),
);
export const awakenedSolids = (completed) => [
  ...FOREST_SOLIDS,
  ...SAKURA_CANOPIES.filter((s) => completed.includes(s.awakening)),
];
