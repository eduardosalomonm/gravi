import { createCharacter } from './character-model';
import { createCameraGesture } from './camera-gesture.mjs';
import { CHARACTERS, characterId } from './characters.mjs';
import * as THREE from 'three';
import { reactionPose } from './personality.mjs';
import {
  advanceAwakening,
  journeyHint,
  resetAwakeningChallenges,
  awakeningById,
  createAwakeningState,
  awakenedSolids,
  inForest,
} from './awakening.mjs';
import { createForest } from './forest-scene';
import {
  feedbackEvents,
  footstepInterval,
  progressSteps,
} from './feedback.mjs';
import { sound } from './sound';
import { revealExploration } from './exploration.mjs';
import { setGravity as validateGravity } from './physics.mjs';
import {
  createPlanetState,
  planetHeight,
  resetPlanetState,
  stepPlanet,
  PLANET_RADIUS,
  PLANET_STEP,
  planetSupportAt,
} from './planet-physics.mjs';
import {
  offsetDirection,
  surfaceDistance,
  normalizeDirection,
  PLANET_FLOWERS as ALL_FLOWERS,
  PLANET_GRASS as ALL_GRASS,
  PLANET_LANDMARKS,
  PLANET_MEADOW_PATCHES as ALL_MEADOWS,
  PLANET_PLATFORMS as ALL_PLATFORMS,
  PLANET_ROCKS as ALL_ROCKS,
  PLANET_SHRUBS as ALL_SHRUBS,
  PLANET_TRAIL as ALL_TRAIL,
  PLANET_TREES as ALL_TREES,
} from './planet-world.mjs';
import type { GameHandle, Snapshot } from './game';
import type { defaultProgress } from './progress.mjs';

const PLANET_FLOWERS = ALL_FLOWERS.filter((item) => !inForest(item.direction));
const PLANET_GRASS = ALL_GRASS.filter((item) => !inForest(item));
const PLANET_MEADOW_PATCHES = ALL_MEADOWS.filter(
  (item) => !inForest(item.direction),
);
const PLANET_PLATFORMS = ALL_PLATFORMS.filter(
  (item) => !inForest(item.direction),
);
const PLANET_ROCKS = ALL_ROCKS.filter((item) => !inForest(item.direction));
const PLANET_SHRUBS = ALL_SHRUBS.filter((item) => !inForest(item.direction));
const PLANET_TRAIL = ALL_TRAIL.filter((item) => !inForest(item.direction));
const PLANET_TREES = ALL_TREES.filter((item) => !inForest(item.direction));

export function createPlanetGame(
  host: HTMLDivElement,
  report: (snapshot: Snapshot) => void,
  notify: (message: string) => void,
  onPause: (paused: boolean) => void,
  initialProgress: ReturnType<typeof defaultProgress>,
  onSave: (progress: ReturnType<typeof defaultProgress>) => void,
): GameHandle {
  const scene = new THREE.Scene();
  const sky = new THREE.Color('#dbeef2');
  scene.background = sky;
  const fog = new THREE.Fog('#dbeef2', 48, 105);
  scene.fog = fog;
  // Each gravity tints the sky: lavender dusk without gravity, cool Moon,
  // peach Mars, the usual Earth blue and a warm amber under Jupiter.
  const skyStops: [number, THREE.Color][] = [
    [0, new THREE.Color('#cdd2f0')],
    [1.62, new THREE.Color('#d7e2f6')],
    [3.71, new THREE.Color('#f5dfd0')],
    [9.81, new THREE.Color('#dbeef2')],
    [24.79, new THREE.Color('#f4ddb0')],
  ];
  const skyFor = (value: number, out: THREE.Color) => {
    for (let i = 1; i < skyStops.length; i++) {
      const [g1, c1] = skyStops[i];
      const [g0, c0] = skyStops[i - 1];
      if (value <= g1 || i === skyStops.length - 1)
        return out
          .copy(c0)
          .lerp(c1, THREE.MathUtils.clamp((value - g0) / (g1 - g0), 0, 1));
    }
    return out;
  };
  const skyTarget = new THREE.Color();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  host.appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    'aria-label',
    'Planeta de Gravi: muévete por toda la esfera, salta y cambia la gravedad.',
  );

  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 250);
  const hemi = new THREE.HemisphereLight('#fff3dc', '#46707a', 2.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe7c2', 3.2);
  sun.position.set(48, 72, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -54,
    right: 54,
    top: 54,
    bottom: -54,
    near: 1,
    far: 180,
  });
  scene.add(sun);

  const materials: THREE.Material[] = [];
  const mat = (color: string, roughness = 0.72) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness });
    materials.push(material);
    return material;
  };
  const planetMaterial = mat('#ffffff', 1);
  planetMaterial.vertexColors = true;
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS, 72, 48),
    planetMaterial,
  );
  planet.receiveShadow = true;
  const vertices = planet.geometry.getAttribute('position');
  const colors = [];
  for (let i = 0; i < vertices.count; i++) {
    const point = new THREE.Vector3()
      .fromBufferAttribute(vertices, i)
      .normalize();
    const variation =
      (Math.sin(point.x * 34) +
        Math.cos(point.z * 29) +
        Math.sin(point.y * 41)) *
      0.018;
    const color = new THREE.Color(inForest(point) ? '#839766' : '#9bbb87');
    color.offsetHSL(0, 0, variation);
    colors.push(color.r, color.g, color.b);
  }
  planet.geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3),
  );
  scene.add(planet);
  const forest = createForest(scene, materials);
  const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: '#dff8ec',
    transparent: true,
    opacity: 0.13,
    side: THREE.BackSide,
  });
  materials.push(atmosphereMaterial);
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS + 1, 48, 32),
    atmosphereMaterial,
  );
  scene.add(atmosphere);

  const sphereGeometry = new THREE.SphereGeometry(1, 24, 18);
  const trunkGeometry = new THREE.CylinderGeometry(0.72, 1, 1, 12);
  const decorative = new THREE.Group();
  scene.add(decorative);
  const leaf = mat('#4fa982');
  const leafLight = mat('#b8e5b6');
  const cream = mat('#fff4d2');
  const trunk = mat('#a98563');
  const stone = mat('#78928a', 0.9);
  const stoneLight = mat('#adc0af', 0.94);
  const moss = mat('#79b78a', 0.92);
  const flower = mat('#f4b879', 0.78);
  const pinkTree = new THREE.Color('#ec82a3');
  const moonStone = new THREE.Color('#74b6d8');
  // The planet starts a little faded and regains its colour as sakuras bloom.
  const livingMaterials = [planetMaterial, leaf, leafLight, moss, flower].map(
    (material) => ({
      material,
      hsl: material.color.getHSL({ h: 0, s: 0, l: 0 }),
    }),
  );
  let vitality = -1;
  const setVitality = (bloomed: number) => {
    const t = THREE.MathUtils.clamp(bloomed / 10, 0, 1);
    if (t === vitality) return;
    vitality = t;
    livingMaterials.forEach(({ material, hsl }) =>
      material.color.setHSL(hsl.h, hsl.s * (0.6 + 0.4 * t), hsl.l),
    );
    // The white planet material only carries vertex colours: dim it instead.
    planetMaterial.color.setScalar(0.9 + 0.1 * t);
  };
  const localUp = new THREE.Vector3(0, 1, 0);
  const placeOnPlanet = (
    object: THREE.Object3D,
    direction: THREE.Vector3Like,
  ) => {
    const up = new THREE.Vector3().copy(direction).normalize();
    object.position.copy(up.multiplyScalar(PLANET_RADIUS));
    object.quaternion.setFromUnitVectors(localUp, up);
    decorative.add(object);
  };
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const surfaceMatrix = (
    direction: THREE.Vector3Like,
    altitude: number,
    scale: THREE.Vector3,
    spin = 0,
    offset = new THREE.Vector3(),
  ) => {
    const up = new THREE.Vector3().copy(direction).normalize();
    const orientation = new THREE.Quaternion().setFromUnitVectors(localUp, up);
    if (spin)
      orientation.multiply(
        new THREE.Quaternion().setFromAxisAngle(localUp, spin),
      );
    const worldOffset = offset.clone().applyQuaternion(orientation);
    return new THREE.Matrix4().compose(
      up.multiplyScalar(PLANET_RADIUS + altitude).add(worldOffset),
      orientation,
      scale,
    );
  };
  const makeInstances = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number,
    shadow = false,
  ) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    decorative.add(mesh);
    return mesh;
  };

  // Small surface-following marks create recognizable regions and a path near
  // the starting area without changing the collision surface.
  const meadowGeometry = new THREE.CircleGeometry(1, 18);
  meadowGeometry.rotateX(-Math.PI / 2);
  const meadowMaterial = mat('#c4dfad', 0.96);
  const meadows = makeInstances(
    meadowGeometry,
    meadowMaterial,
    PLANET_MEADOW_PATCHES.length,
  );
  const meadowColors: Record<string, THREE.Color> = {
    mint: new THREE.Color('#b4d9a6'),
    rose: new THREE.Color('#f3c4af'),
    blue: new THREE.Color('#b9dcd4'),
    cream: new THREE.Color('#eadfb5'),
  };
  PLANET_MEADOW_PATCHES.forEach(
    ({ direction, radius, spin, variant }, index) => {
      meadows.setMatrixAt(
        index,
        surfaceMatrix(
          direction,
          0.018,
          new THREE.Vector3(radius, 1, radius * 0.72),
          spin,
        ),
      );
      meadows.setColorAt(index, meadowColors[variant]);
    },
  );

  const trailMaterial = mat('#f5dfb5', 0.98);
  const trail = makeInstances(
    sphereGeometry,
    trailMaterial,
    PLANET_TRAIL.length,
  );
  PLANET_TRAIL.forEach(({ direction, width, spin }, index) =>
    trail.setMatrixAt(
      index,
      surfaceMatrix(
        direction,
        0.035,
        new THREE.Vector3(width, 0.035, width * 0.72),
        spin,
      ),
    ),
  );

  const flowerStemGeometry = new THREE.CylinderGeometry(0.025, 0.035, 1, 6);
  const flowerStems = makeInstances(
    flowerStemGeometry,
    moss,
    PLANET_FLOWERS.length,
  );
  const flowerHeads = makeInstances(
    sphereGeometry,
    flower,
    PLANET_FLOWERS.length,
  );
  const flowerColors = [
    new THREE.Color('#f38d77'),
    new THREE.Color('#f2b8ca'),
    new THREE.Color('#fff0ad'),
  ];
  PLANET_FLOWERS.forEach(({ direction, size, variant }, index) => {
    flowerStems.setMatrixAt(
      index,
      surfaceMatrix(direction, 0.1, new THREE.Vector3(1, 0.2, 1)),
    );
    flowerHeads.setMatrixAt(
      index,
      surfaceMatrix(
        direction,
        0.23,
        new THREE.Vector3(size, size * 0.72, size),
      ),
    );
    flowerHeads.setColorAt(index, flowerColors[variant]);
  });

  // Compact 4–5.3 m trees fit Gravi's 1.5 m scale. Tapered trunks and root
  // bulbs keep every tree visibly anchored and perpendicular to the surface.
  const trunks = makeInstances(trunkGeometry, trunk, PLANET_TREES.length, true);
  const crowns = makeInstances(sphereGeometry, leaf, PLANET_TREES.length, true);
  const crownTufts = makeInstances(
    sphereGeometry,
    leafLight,
    PLANET_TREES.length,
    true,
  );
  const roots = makeInstances(sphereGeometry, trunk, PLANET_TREES.length, true);
  PLANET_TREES.forEach(({ direction, height, width, spin, variant }, index) => {
    trunks.setMatrixAt(
      index,
      surfaceMatrix(
        direction,
        height / 2,
        new THREE.Vector3(0.22, height, 0.22),
        spin,
      ),
    );
    roots.setMatrixAt(
      index,
      surfaceMatrix(direction, 0.12, new THREE.Vector3(0.5, 0.18, 0.5), spin),
    );
    crowns.setMatrixAt(
      index,
      surfaceMatrix(
        direction,
        height + 0.72,
        new THREE.Vector3(width, 1.05 + (index % 3) * 0.12, width),
        spin,
      ),
    );
    crownTufts.setMatrixAt(
      index,
      surfaceMatrix(
        direction,
        height + 1.05,
        new THREE.Vector3(width * 0.68, 0.74, width * 0.68),
        spin,
        new THREE.Vector3(0.55, 0, 0),
      ),
    );
    const crownColor =
      variant === 'pink'
        ? pinkTree
        : variant === 'cream'
          ? new THREE.Color('#fff0c6')
          : new THREE.Color('#4fa982');
    const tuftColor =
      variant === 'pink'
        ? new THREE.Color('#f6b2c4')
        : variant === 'cream'
          ? new THREE.Color('#fff8dc')
          : new THREE.Color('#9bd6a8');
    crowns.setColorAt(index, crownColor);
    crownTufts.setColorAt(index, tuftColor);
  });

  const shrubs = makeInstances(sphereGeometry, leafLight, PLANET_SHRUBS.length);
  const blooms = makeInstances(sphereGeometry, cream, PLANET_SHRUBS.length);
  PLANET_SHRUBS.forEach(({ direction, width, height, spin }, index) => {
    shrubs.setMatrixAt(
      index,
      surfaceMatrix(
        direction,
        height / 2,
        new THREE.Vector3(width, height / 2, width),
        spin,
      ),
    );
    blooms.setMatrixAt(
      index,
      surfaceMatrix(
        direction,
        height + 0.06,
        new THREE.Vector3(0.1, 0.1, 0.1),
        spin,
        new THREE.Vector3(width * 0.45, 0, 0),
      ),
    );
  });

  const grassGeometry = new THREE.ConeGeometry(0.28, 0.85, 5);
  const grasses = makeInstances(grassGeometry, moss, PLANET_GRASS.length);
  PLANET_GRASS.forEach((direction, index) =>
    grasses.setMatrixAt(
      index,
      surfaceMatrix(
        direction,
        0.4,
        new THREE.Vector3(
          0.75 + (index % 3) * 0.12,
          0.8 + (index % 4) * 0.08,
          0.75 + (index % 3) * 0.12,
        ),
        index * goldenAngle,
      ),
    ),
  );

  const rockGeometry = new THREE.IcosahedronGeometry(1, 1);
  const rocks = makeInstances(rockGeometry, stone, PLANET_ROCKS.length, true);
  PLANET_ROCKS.forEach(({ direction, size, height, spin, variant }, index) => {
    rocks.setMatrixAt(
      index,
      surfaceMatrix(
        direction,
        height / 2,
        new THREE.Vector3(size, height / 2, size * 0.82),
        spin,
      ),
    );
    rocks.setColorAt(
      index,
      variant === 'moon'
        ? moonStone
        : variant === 'light'
          ? new THREE.Color('#adc0af')
          : new THREE.Color('#78928a'),
    );
  });

  const ledgeGeometry = new THREE.CylinderGeometry(1, 1.08, 1, 22);
  const ledgeTopGeometry = new THREE.CylinderGeometry(1, 1, 0.12, 22);
  PLANET_PLATFORMS.forEach((platform, index) => {
    const direction = new THREE.Vector3(
      platform.direction.x,
      platform.direction.y,
      platform.direction.z,
    );
    const ledge = new THREE.Mesh(ledgeGeometry, index % 2 ? stoneLight : stone);
    ledge.scale.set(platform.radius, platform.height, platform.radius);
    ledge.position.y = platform.height / 2;
    ledge.castShadow = true;
    ledge.receiveShadow = true;
    const topMaterial =
      platform.color === 'coral' || platform.color === 'sun' ? flower : moss;
    const top = new THREE.Mesh(ledgeTopGeometry, topMaterial);
    top.scale.set(platform.radius * 0.98, 1, platform.radius * 0.98);
    // The upper face is exactly the support plane used by planet-physics.
    top.position.y = platform.height - 0.06;
    top.receiveShadow = true;
    const group = new THREE.Group();
    group.add(ledge, top);
    placeOnPlanet(group, direction);
  });

  const summit = PLANET_PLATFORMS.find(
    (platform) => platform.id === 'far-side',
  );
  if (summit) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 1, 8),
      trunk,
    );
    pole.matrix.copy(
      surfaceMatrix(
        summit.direction,
        summit.height + 0.9,
        new THREE.Vector3(1, 1.8, 1),
      ),
    );
    pole.matrixAutoUpdate = false;
    pole.castShadow = true;
    decorative.add(pole);
    const summitFlag = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), flower);
    summitFlag.matrix.copy(
      surfaceMatrix(
        summit.direction,
        summit.height + 1.55,
        new THREE.Vector3(0.72, 0.3, 0.045),
        0,
        new THREE.Vector3(0.36, 0, 0),
      ),
    );
    summitFlag.matrixAutoUpdate = false;
    summitFlag.castShadow = true;
    decorative.add(summitFlag);
  }

  const flowerRingPetals = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2;
    return offsetDirection(
      PLANET_LANDMARKS.flowerRing,
      Math.cos(angle) * 1.25,
      Math.sin(angle) * 1.25,
    );
  });
  const ringFlowers = makeInstances(
    sphereGeometry,
    flower,
    flowerRingPetals.length,
  );
  flowerRingPetals.forEach((direction, index) =>
    ringFlowers.setMatrixAt(
      index,
      surfaceMatrix(direction, 0.12, new THREE.Vector3(0.18, 0.12, 0.18)),
    ),
  );

  let character = characterId(initialProgress.character);
  const companion = createCharacter(materials, character);
  const { pet, body, eyes, arms, feet, mouth, surprisedMouth } = companion;
  scene.add(pet);
  const state = createPlanetState();
  let gravity = initialProgress.gravity;
  let personality = initialProgress.personality;
  const planetSecrets = [...initialProgress.planetSecrets];
  const awakenings = createAwakeningState(initialProgress.awakenings);
  let solids = awakenedSolids(awakenings.completed);
  let explored = [...initialProgress.explored];
  const landingMaterial = new THREE.MeshBasicMaterial({
    color: '#24433b',
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  materials.push(landingMaterial);
  const landingSpot = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 32),
    landingMaterial,
  );
  landingSpot.geometry.rotateX(-Math.PI / 2);
  scene.add(landingSpot);
  const landingRing = new THREE.Mesh(
    new THREE.RingGeometry(0.68, 0.74, 32),
    landingMaterial,
  );
  landingRing.geometry.rotateX(-Math.PI / 2);
  landingSpot.add(landingRing);
  let paused = false;
  let inputEnabled = true;
  let needsRender = true;
  let manualPaused = false;
  let mapOpen = false;
  let jump = false;
  let disposed = false;
  let previous = performance.now();
  let accumulator = 0;
  let elapsed = 0;
  let nearFinale = false;
  let reportTimer = 0;
  let frame = 0;
  let reaction = '';
  let reactionUntil = 0;
  let celebrateUntil = 0;
  let shake = 0;
  let footstepTimer = 0;
  let footstepSide = false;
  let fallSpeed = 0;
  const touch = { x: 0, z: 0 };
  const keys = new Set<string>();
  const up = new THREE.Vector3(0, 1, 0);
  const cameraBack = new THREE.Vector3(0, 0, 1);
  let cameraYaw = 0;
  let cameraPitch = 0.5;
  let cameraZoom = 12.8;
  const cameraGesture = createCameraGesture();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const persist = () =>
    onSave({
      ...initialProgress,
      gravity,
      personality,
      character,
      planetSecrets,
      explored,
      awakenings: {
        completed: [...awakenings.completed],
        discovered: [...awakenings.discovered],
        visitedRegions: [...awakenings.visitedRegions],
        finaleStage: awakenings.finale.stage,
      },
    });
  const makeSnapshot = (): Snapshot => ({
    height: planetHeight(state),
    speed: Math.hypot(state.velocity.x, state.velocity.y, state.velocity.z),
    completed: [...initialProgress.completed],
    planetSecrets: [...planetSecrets],
    grounded: state.grounded,
    rideTime: 0,
    returnArmed: false,
    nearby: null,
    distanceTravelled: state.distanceTravelled,
    jumps: state.jumps,
    forest: {
      explored: [...explored],
      finale: { ...awakenings.finale },
      lanternStep: awakenings.lanternStep,
      ridgeStep: awakenings.ridgeStep,
      stoneTime: awakenings.stoneTime,
      stones: awakenings.stones,
      reflectionStep: awakenings.reflectionStep,
      reflectionTime: awakenings.reflectionTime,
      riverStep: awakenings.riverStep,
      windStep: awakenings.windStep,
      position: { ...state.position },
      forward: { x: -cameraBack.x, y: -cameraBack.y, z: -cameraBack.z },
      completed: [...awakenings.completed],
      discovered: [...awakenings.discovered],
      visitedRegions: [...awakenings.visitedRegions],
      petalStep: awakenings.petalStep,
      skyStep: awakenings.skyStep,
      flowerTime: awakenings.flowerTime,
    },
  });
  const setPaused = (value: boolean) => {
    needsRender = true;
    manualPaused = value;
    paused = manualPaused || mapOpen;
    keys.clear();
    touch.x = 0;
    touch.z = 0;
    jump = false;
    accumulator = 0;
    previous = performance.now();
    cameraGesture.reset();
    cameraYaw = 0;
    onPause(paused);
  };
  const reset = () => {
    needsRender = true;
    resetPlanetState(state);
    awakenings.skyStep = 0;
    awakenings.flowerTime = 0;
    awakenings.ridgeStep = 0;
    awakenings.stoneTime = 0;
    if (awakenings.finale.stage === 2) awakenings.finale.jump = 0;
    keys.clear();
    touch.x = 0;
    touch.z = 0;
    jump = false;
    accumulator = 0;
    notify('De vuelta sobre el planeta.');
    report(makeSnapshot());
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!inputEnabled) return;
    const target = event.target as HTMLElement;
    if (target.matches('input, textarea, select') || target.isContentEditable)
      return;
    if (mapOpen) return;
    if (event.code === 'KeyP' && !event.repeat) return setPaused(!manualPaused);
    if (event.code === 'KeyR' && !event.repeat) return reset();
    if (event.code === 'Space' && target.closest('button')) return;
    if (
      [
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
      ].includes(event.code)
    ) {
      event.preventDefault();
      if (!paused) keys.add(event.code);
      if (!paused && event.code === 'Space' && !event.repeat) jump = true;
    }
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const onPointerDown = (event: PointerEvent) => {
    if (
      (event.target as HTMLElement) !== renderer.domElement ||
      paused ||
      !inputEnabled ||
      event.button !== 0
    )
      return;
    if (!cameraGesture.down(event.pointerId, event.clientX, event.clientY))
      return;
    event.preventDefault();
    renderer.domElement.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (paused || !inputEnabled) return;
    const gesture = cameraGesture.move(
      event.pointerId,
      event.clientX,
      event.clientY,
    );
    const sensitivity = event.pointerType === 'touch' ? 0.0055 : 0.006;
    cameraYaw -= gesture.x * sensitivity;
    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch + gesture.y * 0.004,
      0.24,
      1.05,
    );
    cameraZoom = THREE.MathUtils.clamp(
      cameraZoom + gesture.pinch * 0.035,
      10,
      30,
    );
  };
  const onPointerUp = (event: PointerEvent) => {
    cameraGesture.up(event.pointerId);
    if (renderer.domElement.hasPointerCapture(event.pointerId))
      renderer.domElement.releasePointerCapture(event.pointerId);
  };
  const onWheel = (event: WheelEvent) => {
    if (paused || !inputEnabled) return;
    event.preventDefault();
    cameraZoom = THREE.MathUtils.clamp(
      cameraZoom + event.deltaY * 0.015,
      12,
      30,
    );
  };
  const onBlur = () => setPaused(true);
  const onVisibility = () => {
    if (document.hidden) setPaused(true);
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  renderer.domElement.addEventListener('lostpointercapture', onPointerUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  const resize = () => {
    needsRender = true;
    cameraGesture.reset();
    cameraYaw = 0;
    const bounds = host.getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height);
    camera.aspect = bounds.width / Math.max(1, bounds.height);
    camera.fov = bounds.width < bounds.height ? 58 : 44;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const animate = (now: number) => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const delta = Math.min(0.1, (now - previous) / 1000);
    previous = now;
    if (paused && !needsRender) return;
    if (!paused) {
      elapsed += delta;
      accumulator += delta;
      up.copy(state.position as THREE.Vector3Like).normalize();
      const previousUp = up.clone();
      const yawStep = cameraYaw * (1 - Math.exp(-delta * 16));
      cameraYaw -= yawStep;
      const yawedBack = cameraBack
        .clone()
        .applyAxisAngle(up, yawStep)
        .projectOnPlane(up)
        .normalize();
      const forward = yawedBack.clone().negate();
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();
      const keyX =
        Number(keys.has('KeyD') || keys.has('ArrowRight')) -
        Number(keys.has('KeyA') || keys.has('ArrowLeft')) +
        touch.x;
      const keyZ =
        Number(keys.has('KeyW') || keys.has('ArrowUp')) -
        Number(keys.has('KeyS') || keys.has('ArrowDown')) +
        touch.z;
      let landedThisFrame = false;
      const feedbackBefore = {
        jumps: state.jumps,
        grounded: state.grounded,
        impact: 0,
        steps: progressSteps(awakenings),
        completed: awakenings.completed.length,
      };
      while (accumulator >= PLANET_STEP) {
        if (!state.grounded) {
          const radius = Math.hypot(
            state.position.x,
            state.position.y,
            state.position.z,
          );
          fallSpeed = Math.max(
            0,
            -(
              state.velocity.x * state.position.x +
              state.velocity.y * state.position.y +
              state.velocity.z * state.position.z
            ) / Math.max(radius, 1e-6),
          );
        }
        stepPlanet(
          state,
          {
            x: right.x * keyX + forward.x * keyZ,
            y: right.y * keyX + forward.y * keyZ,
            z: right.z * keyX + forward.z * keyZ,
            jump,
          },
          gravity,
          PLANET_STEP,
          solids,
        );
        const before =
          awakenings.discovered.length + awakenings.completed.length;
        const finalStageBefore = awakenings.finale.stage;
        const visitedBefore = awakenings.visitedRegions.length;
        advanceAwakening(awakenings, state, gravity, PLANET_STEP);
        if (
          visitedBefore !== awakenings.visitedRegions.length ||
          finalStageBefore !== awakenings.finale.stage
        )
          persist();
        if (
          finalStageBefore !== awakenings.finale.stage &&
          awakenings.finale.stage < 3
        )
          notify(`Etapa guardada. ${journeyHint(awakenings)}`);
        const arriving =
          planetHeight(state) < 8 &&
          surfaceDistance(
            normalizeDirection(state.position),
            awakeningById('journey')!.direction,
          ) < 7;
        if (
          arriving &&
          !nearFinale &&
          !awakenings.completed.includes('journey')
        )
          notify(journeyHint(awakenings));
        nearFinale = arriving;
        if (awakenings.newlyCompleted) {
          solids = awakenedSolids(awakenings.completed);
          reaction = 'celebrate';
          reactionUntil = elapsed + 2.3;
          celebrateUntil = elapsed + 2.8;
          forest.burst(awakenings.newlyCompleted, reducedMotion);
          setVitality(awakenings.completed.length);
          notify(
            awakeningById(awakenings.newlyCompleted)?.success ??
              'Un sakura ha florecido.',
          );
        }
        if (
          before !==
          awakenings.discovered.length + awakenings.completed.length
        )
          persist();
        landedThisFrame ||= state.justLanded;
        jump = false;
        accumulator -= PLANET_STEP;
      }
      for (const event of feedbackEvents(feedbackBefore, {
        jumps: state.jumps,
        grounded: state.grounded,
        impact: fallSpeed,
        steps: progressSteps(awakenings),
        completed: awakenings.completed.length,
      })) {
        if (event.type === 'jump') {
          sound.jump(gravity);
          reaction = 'jump';
          reactionUntil = elapsed + 0.35;
        } else if (event.type === 'land') {
          sound.land(event.strength ?? 0, gravity);
          if (gravity > 15 && !reducedMotion)
            shake = Math.max(shake, 0.12 + (event.strength ?? 0) * 0.35);
        } else if (event.type === 'progress') sound.progress();
        else if (event.type === 'bloom') sound.bloom();
      }
      const groundSpeed = Math.hypot(
        state.velocity.x,
        state.velocity.y,
        state.velocity.z,
      );
      const interval = state.grounded ? footstepInterval(groundSpeed) : null;
      if (interval === null) footstepTimer = 0;
      else {
        footstepTimer += delta;
        if (footstepTimer >= interval) {
          footstepTimer = 0;
          footstepSide = !footstepSide;
          sound.step(footstepSide);
        }
      }
      const nextUp = new THREE.Vector3()
        .copy(state.position as THREE.Vector3Like)
        .normalize();
      const surfaceTransport = new THREE.Quaternion().setFromUnitVectors(
        previousUp,
        nextUp,
      );
      yawedBack
        .applyQuaternion(surfaceTransport)
        .projectOnPlane(nextUp)
        .normalize();
      up.copy(nextUp);
      pet.position.copy(state.position as THREE.Vector3Like);
      const motion = new THREE.Vector3(
        state.velocity.x,
        state.velocity.y,
        state.velocity.z,
      ).projectOnPlane(up);
      pet.up.copy(up);
      if (motion.lengthSq() > 0.02)
        pet.lookAt(pet.position.clone().add(motion));
      else pet.quaternion.premultiply(surfaceTransport);

      companion.animate(
        elapsed,
        motion.length(),
        state.grounded,
        reducedMotion,
      );
      const pose = reactionPose(
        reaction,
        reactionUntil - elapsed,
        personality,
        reducedMotion,
      );
      if (landedThisFrame) {
        reaction = 'land';
        reactionUntil = elapsed + 0.55;
      } else if (!state.grounded && gravity === 0) reaction = 'float';
      body.scale.set(
        1 / Math.sqrt(pose.stretch),
        pose.stretch,
        1 / Math.sqrt(pose.stretch),
      );
      arms.forEach((arm, index) => {
        arm.rotation.z = (index ? 1 : -1) * (-0.4 - pose.arm);
      });
      mouth.visible = !pose.surprise;
      surprisedMouth.visible = pose.surprise;
      feet.forEach((foot, index) => {
        foot.rotation.x = state.grounded
          ? Math.sin(elapsed * 12 + index * Math.PI) *
            Math.min(0.25, motion.length() * 0.06)
          : -0.3;
      });
      const blink = elapsed % 4.7 > 4.55 ? 0.12 : 1;
      eyes.forEach((eye) => (eye.scale.y = 0.17 * blink * pose.eyes));

      const target = new THREE.Vector3()
        .copy(state.position as THREE.Vector3Like)
        .addScaledVector(up, 0.9);
      const celebrating = elapsed < celebrateUntil && !reducedMotion;
      const desiredFlightZoom =
        (cameraZoom + Math.min(18, planetHeight(state) * 0.45)) *
        (celebrating ? 0.68 : 1);
      const cameraPosition = target
        .clone()
        .addScaledVector(yawedBack, desiredFlightZoom * Math.cos(cameraPitch))
        .addScaledVector(up, desiredFlightZoom * Math.sin(cameraPitch) + 3.5);
      camera.position.lerp(cameraPosition, 1 - Math.exp(-delta * 4.5));
      if (shake > 0.001) {
        camera.position.addScaledVector(
          new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5,
          ),
          shake,
        );
        shake *= Math.exp(-delta * 9);
      }
      if (camera.position.length() < PLANET_RADIUS + 1)
        camera.position.setLength(PLANET_RADIUS + 1);
      camera.up.copy(up);
      camera.lookAt(target);
      cameraBack.copy(yawedBack);
      reportTimer += delta;
      if (reportTimer >= 0.1) {
        const revealed = revealExploration(explored, state.position);
        if (revealed.length !== explored.length) {
          explored = revealed;
          persist();
        }
        report(makeSnapshot());
        reportTimer = 0;
      }
    }
    forest.update(
      awakenings,
      gravity,
      elapsed,
      paused ? 0 : delta,
      reducedMotion,
    );
    const radial = new THREE.Vector3().copy(state.position).normalize();
    const support = planetSupportAt(
      state.position,
      solids,
      Math.hypot(state.position.x, state.position.y, state.position.z) + 0.05,
    );
    const floor =
      support.radius <=
      Math.hypot(state.position.x, state.position.y, state.position.z) + 0.1
        ? support.radius
        : PLANET_RADIUS;
    const altitude = Math.max(
      0,
      Math.hypot(state.position.x, state.position.y, state.position.z) - floor,
    );
    landingSpot.position.copy(radial).multiplyScalar(floor + 0.04);
    landingSpot.quaternion.setFromUnitVectors(localUp, radial);
    landingSpot.scale.setScalar(Math.max(0.38, 1 - altitude * 0.025));
    landingMaterial.opacity = Math.max(0.18, 0.5 - altitude * 0.01);
    landingRing.visible = !state.grounded;
    landingSpot.visible = altitude < 100;
    skyFor(gravity, skyTarget);
    sky.lerp(skyTarget, reducedMotion ? 1 : 1 - Math.exp(-delta * 2.5));
    fog.color.copy(sky);
    needsRender = false;
    renderer.render(scene, camera);
  };
  camera.position.set(0, PLANET_RADIUS + 8, 17);
  setVitality(awakenings.completed.length);
  skyFor(gravity, sky);
  fog.color.copy(sky);
  report(makeSnapshot());
  frame = requestAnimationFrame(animate);

  return {
    setGravity: (value) => {
      needsRender = true;
      const next = validateGravity(value);
      if (next !== gravity) sound.gravity(next);
      gravity = next;
      persist();
      reaction = gravity === 0 ? 'float' : 'gravity';
      reactionUntil = elapsed + 2.3;
    },
    setMove: (x, z) => {
      if (paused || !inputEnabled) return;
      touch.x = Number.isFinite(x) ? THREE.MathUtils.clamp(x, -1, 1) : 0;
      touch.z = Number.isFinite(z) ? THREE.MathUtils.clamp(z, -1, 1) : 0;
    },
    requestJump: () => {
      if (!paused && inputEnabled) jump = true;
    },
    setInputEnabled: (enabled) => {
      inputEnabled = enabled;
      keys.clear();
      touch.x = touch.z = 0;
      jump = false;
      cameraGesture.reset();
      cameraYaw = 0;
    },
    setCharacter: (value) => {
      needsRender = true;
      if (!Object.hasOwn(CHARACTERS, value)) return;
      character = characterId(value);
      companion.setCharacter(character);
      personality =
        CHARACTERS[character as keyof typeof CHARACTERS].personality;
      persist();
    },
    setPersonality: (value) => {
      needsRender = true;
      if (!['curious', 'cuddly', 'cheeky'].includes(value)) return;
      personality = value;
      persist();
    },
    reset,
    restart: () => {
      Object.assign(awakenings, resetAwakeningChallenges(awakenings));
      solids = awakenedSolids([]);
      nearFinale = false;
      reset();
      persist();
      notify('Retos reiniciados. Conservas el mapa explorado y tus ajustes.');
    },
    togglePause: () => setPaused(!manualPaused),
    setPaused,
    setMapOpen: (value) => {
      mapOpen = value;
      setPaused(manualPaused);
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener(
        'lostpointercapture',
        onPointerUp,
      );
      renderer.domElement.removeEventListener('wheel', onWheel);
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) geometries.add(object.geometry);
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      forest.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
