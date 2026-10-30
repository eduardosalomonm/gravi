export const PLANET_RADIUS = 36;

const length = (v) => Math.hypot(v.x, v.y, v.z);
export const normalizeDirection = (v) => {
  const magnitude = length(v) || 1;
  return { x: v.x / magnitude, y: v.y / magnitude, z: v.z / magnitude };
};
const direction = (x, y, z) => normalizeDirection({ x, y, z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export function surfaceDistance(a, b) {
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * PLANET_RADIUS;
}

export function offsetDirection(base, eastOffset, northOffset) {
  const up = normalizeDirection(base);
  const reference =
    Math.abs(up.y) > 0.92 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const east = normalizeDirection(cross(reference, up));
  const north = normalizeDirection(cross(up, east));
  return normalizeDirection({
    x: up.x * PLANET_RADIUS + east.x * eastOffset + north.x * northOffset,
    y: up.y * PLANET_RADIUS + east.y * eastOffset + north.y * northOffset,
    z: up.z * PLANET_RADIUS + east.z * eastOffset + north.z * northOffset,
  });
}

export const PLANET_PLATFORMS = [
  {
    id: 'near-coral',
    direction: direction(5, 45, -5),
    radius: 2.4,
    height: 0.72,
    color: 'coral',
  },
  {
    id: 'near-moss',
    direction: direction(-7, 45, -9),
    radius: 2.7,
    height: 1.18,
    color: 'moss',
  },
  {
    id: 'near-sun',
    direction: direction(11, 45, -13),
    radius: 2.9,
    height: 1.7,
    color: 'sun',
  },
  {
    id: 'near-cloud',
    direction: direction(-14, 45, -16),
    radius: 3.1,
    height: 2.2,
    color: 'cloud',
  },
  {
    id: 'east',
    direction: direction(38, 17, 21),
    radius: 2.8,
    height: 1.35,
    color: 'moss',
  },
  {
    id: 'west',
    direction: direction(-37, 24, 12),
    radius: 2.5,
    height: 0.9,
    color: 'cloud',
  },
  {
    id: 'south-east',
    direction: direction(25, -33, -18),
    radius: 3,
    height: 1.8,
    color: 'sun',
  },
  {
    id: 'south-west',
    direction: direction(-28, -31, 17),
    radius: 2.7,
    height: 1.1,
    color: 'coral',
  },
  {
    id: 'far-side',
    direction: direction(8, -17, 41),
    radius: 3.2,
    height: 2.35,
    color: 'summit',
  },
];

export const PLANET_LANDMARKS = {
  pinkTree: direction(24, 30, -24),
  moonRock: direction(-30, 10, 32),
  twinTrees: direction(-32, 26, -19),
  hiddenGrove: direction(10, -41, 15),
  flowerRing: direction(35, -8, -28),
  stoneCircle: direction(-4, -44, -6),
};

const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const blendDirections = (a, b, amount) =>
  normalizeDirection({
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
    z: a.z + (b.z - a.z) * amount,
  });

const trailNodes = [
  direction(0, 1, 0),
  PLANET_PLATFORMS[0].direction,
  PLANET_PLATFORMS[2].direction,
  PLANET_PLATFORMS[3].direction,
];
export const PLANET_TRAIL = trailNodes.slice(0, -1).flatMap((from, segment) => {
  const to = trailNodes[segment + 1];
  const count = Math.max(2, Math.ceil(surfaceDistance(from, to) / 0.75));
  return Array.from({ length: count }, (_, index) => ({
    direction: blendDirections(from, to, (index + 0.5) / count),
    width: 0.24 + ((index + segment) % 3) * 0.06,
    spin: index * 1.17 + segment,
  }));
});

const meadowZones = [
  { direction: direction(0, 1, 0), variant: 'mint' },
  { direction: PLANET_LANDMARKS.pinkTree, variant: 'rose' },
  { direction: PLANET_LANDMARKS.moonRock, variant: 'blue' },
  { direction: PLANET_LANDMARKS.hiddenGrove, variant: 'cream' },
  { direction: PLANET_LANDMARKS.flowerRing, variant: 'rose' },
  { direction: PLANET_LANDMARKS.stoneCircle, variant: 'cream' },
];
export const PLANET_MEADOW_PATCHES = meadowZones.flatMap((zone, zoneIndex) =>
  Array.from({ length: 13 }, (_, index) => {
    const angle = index * goldenAngle + zoneIndex * 0.7;
    const distance = 0.45 + (index % 5) * 0.65;
    return {
      direction: offsetDirection(
        zone.direction,
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
      ),
      radius: 0.48 + (index % 4) * 0.16,
      spin: angle,
      variant: zone.variant,
    };
  }),
);

const flowerZones = [
  PLANET_LANDMARKS.pinkTree,
  PLANET_LANDMARKS.twinTrees,
  PLANET_LANDMARKS.hiddenGrove,
  PLANET_LANDMARKS.flowerRing,
];
export const PLANET_FLOWERS = flowerZones.flatMap((center, zoneIndex) =>
  Array.from({ length: 14 }, (_, index) => {
    const angle = index * goldenAngle + zoneIndex;
    const distance = 1.15 + (index % 5) * 0.55;
    return {
      direction: offsetDirection(
        center,
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
      ),
      size: 0.1 + (index % 3) * 0.025,
      variant: (index + zoneIndex) % 3,
    };
  }),
);

export const fibonacciDirections = (count, phase = 0) =>
  Array.from({ length: count }, (_, index) => {
    const y = 1 - (2 * (index + 0.5)) / count;
    const radial = Math.sqrt(1 - y * y);
    const angle = index * goldenAngle + phase;
    return direction(Math.cos(angle) * radial, y, Math.sin(angle) * radial);
  });

const farFromPlatforms = (candidate, padding) =>
  PLANET_PLATFORMS.every(
    (platform) =>
      surfaceDistance(candidate, platform.direction) >
      platform.radius + padding,
  );
const farFromLandmarks = (candidate, padding) =>
  Object.values(PLANET_LANDMARKS).every(
    (landmark) => surfaceDistance(candidate, landmark) > padding,
  );

const generatedTrees = fibonacciDirections(126, 0.31)
  .filter(
    (candidate) =>
      candidate.y < 0.992 &&
      farFromPlatforms(candidate, 1.8) &&
      farFromLandmarks(candidate, 2.6),
  )
  .map((treeDirection, index) => ({
    id: `tree-${index}`,
    direction: treeDirection,
    height: 2.55 + (index % 6) * 0.22,
    width: 0.78 + (index % 4) * 0.09,
    spin: (index % 12) * (Math.PI / 6),
    variant: index % 7 === 0 ? 'cream' : 'green',
  }));

const specialTrees = [
  {
    id: 'pink-tree',
    direction: PLANET_LANDMARKS.pinkTree,
    height: 3.25,
    width: 1.03,
    spin: 0.4,
    variant: 'pink',
  },
  {
    id: 'twin-tree-a',
    direction: offsetDirection(PLANET_LANDMARKS.twinTrees, -0.9, 0),
    height: 3.05,
    width: 0.9,
    spin: 0.2,
    variant: 'cream',
  },
  {
    id: 'twin-tree-b',
    direction: offsetDirection(PLANET_LANDMARKS.twinTrees, 0.9, 0),
    height: 3.35,
    width: 0.98,
    spin: 1.1,
    variant: 'green',
  },
  {
    id: 'grove-a',
    direction: offsetDirection(PLANET_LANDMARKS.hiddenGrove, -1.2, -0.4),
    height: 3,
    width: 0.92,
    spin: 0.3,
    variant: 'cream',
  },
  {
    id: 'grove-b',
    direction: offsetDirection(PLANET_LANDMARKS.hiddenGrove, 1.15, -0.25),
    height: 3.3,
    width: 0.98,
    spin: 1.4,
    variant: 'cream',
  },
  {
    id: 'grove-c',
    direction: offsetDirection(PLANET_LANDMARKS.hiddenGrove, 0, 1.15),
    height: 2.8,
    width: 0.86,
    spin: 2.3,
    variant: 'cream',
  },
];

export const PLANET_TREES = [...generatedTrees, ...specialTrees];

export const PLANET_SHRUBS = fibonacciDirections(184, 1.73)
  .filter(
    (candidate) =>
      candidate.y < 0.997 &&
      farFromPlatforms(candidate, 0.7) &&
      farFromLandmarks(candidate, 1.4) &&
      PLANET_TREES.every(
        (tree) => surfaceDistance(candidate, tree.direction) > 1.2,
      ),
  )
  .map((shrubDirection, index) => ({
    id: `shrub-${index}`,
    direction: shrubDirection,
    width: 0.38 + (index % 5) * 0.075,
    height: 0.54 + (index % 3) * 0.1,
    spin: (index % 16) * (Math.PI / 8),
  }));

const generatedRocks = fibonacciDirections(112, 0.92)
  .filter(
    (candidate) =>
      candidate.y < 0.998 &&
      farFromPlatforms(candidate, 0.8) &&
      farFromLandmarks(candidate, 1.5) &&
      PLANET_TREES.every(
        (tree) => surfaceDistance(candidate, tree.direction) > 1.25,
      ) &&
      PLANET_SHRUBS.every(
        (shrub) => surfaceDistance(candidate, shrub.direction) > 1.25,
      ),
  )
  .map((rockDirection, index) => {
    const size = 0.38 + (index % 7) * 0.09;
    return {
      id: `rock-${index}`,
      direction: rockDirection,
      size,
      height: size * 0.62,
      spin: index * 0.77,
      variant: index % 2 ? 'light' : 'dark',
    };
  });

const circleRocks = Array.from({ length: 7 }, (_, index) => ({
  id: `stone-circle-${index}`,
  direction: offsetDirection(
    PLANET_LANDMARKS.stoneCircle,
    Math.cos((index / 7) * Math.PI * 2) * 1.55,
    Math.sin((index / 7) * Math.PI * 2) * 1.55,
  ),
  size: 0.72,
  height: 0.58,
  spin: index * 0.8,
  variant: index % 2 ? 'light' : 'dark',
}));

export const PLANET_ROCKS = [
  ...generatedRocks,
  ...circleRocks,
  {
    id: 'moon-rock',
    direction: PLANET_LANDMARKS.moonRock,
    size: 1.35,
    height: 2.15,
    spin: 0.45,
    variant: 'moon',
  },
];

export const PLANET_GRASS = fibonacciDirections(260, 2.58).filter(
  (candidate) =>
    candidate.y < 0.999 &&
    farFromPlatforms(candidate, 0.35) &&
    farFromLandmarks(candidate, 0.8),
);

export const PLANET_SOLIDS = [
  ...PLANET_PLATFORMS.map((item) => ({
    ...item,
    kind: 'platform',
    supportTop: true,
  })),
  ...PLANET_TREES.map((item) => ({
    id: item.id,
    direction: item.direction,
    radius: item.width * 0.82,
    height: item.height + 1.75,
    kind: 'tree',
    supportTop: true,
  })),
  ...PLANET_ROCKS.map((item) => ({
    id: item.id,
    direction: item.direction,
    radius: Math.max(0.38, item.size * 0.85),
    height: item.height,
    kind: 'rock',
    supportTop: true,
  })),
  ...PLANET_SHRUBS.map((item) => ({
    id: item.id,
    direction: item.direction,
    radius: item.width * 0.85,
    height: item.height,
    kind: 'shrub',
    supportTop: true,
  })),
];
