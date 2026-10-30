import { createCharacter } from './character-model';
import { CHARACTERS, characterId } from './characters.mjs';
import { sound } from './sound';
import * as THREE from 'three';
import { nearbyChallenge } from './nearby-challenge.mjs';
import { reactionPose } from './personality.mjs';
import { CHALLENGES } from './challenges.mjs';
import { defaultProgress } from './progress.mjs';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  createState,
  resetPosition,
  step,
  setGravity as validateGravity,
  STEP,
  PLATFORM,
  STAR,
  HOOP,
  FERRY,
  RETURN_RING,
  ferryAt,
} from './physics.mjs';
export type Snapshot = {
  height: number;
  speed: number;
  completed: boolean[];
  planetSecrets: string[];
  forest?: {
    finale: {
      stage: number;
      flower: number;
      path: number;
      jump: number;
      dwell: number;
    };
    explored: string[];
    visitedRegions: string[];
    lanternStep: number;
    ridgeStep: number;
    stoneTime: number;
    stones: number[];
    reflectionStep: number;
    reflectionTime: number;
    riverStep: number;
    windStep: number;
    position: { x: number; y: number; z: number };
    forward: { x: number; y: number; z: number };
    completed: string[];
    discovered: string[];
    petalStep: number;
    skyStep: number;
    flowerTime: number;
  };
  grounded: boolean;
  rideTime: number;
  returnArmed: boolean;
  nearby: ReturnType<typeof nearbyChallenge>;
  distanceTravelled: number;
  jumps: number;
};
export type GameHandle = {
  setGravity: (g: number) => void;
  setMove: (x: number, z: number) => void;
  requestJump: () => void;
  setPersonality: (value: string) => void;
  setCharacter: (value: string) => void;
  setInputEnabled: (enabled: boolean) => void;
  reset: () => void;
  restart: () => void;
  togglePause: () => void;
  setPaused?: (value: boolean) => void;
  setMapOpen?: (value: boolean) => void;
  dispose: () => void;
};
export function createGame(
  host: HTMLDivElement,
  report: (s: Snapshot) => void,
  notify: (s: string) => void,
  onPause: (p: boolean) => void,
  initialProgress: ReturnType<typeof defaultProgress> = defaultProgress(),
  onSave: (progress: ReturnType<typeof defaultProgress>) => void = () => {},
): GameHandle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eaf3ef');
  scene.fog = new THREE.Fog('#eaf3ef', 45, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      matchMedia('(pointer: coarse)').matches ? 1.5 : 2,
    ),
  );
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor('#eaf3ef');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  host.appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    'aria-label',
    'Jardín de Gravi: WASD o flechas para moverte, espacio para saltar, R para volver.',
  );
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 150);
  camera.position.set(19, 22, 29);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target.set(0, 0, 0);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.07;
  orbit.enablePan = false;
  orbit.minDistance = 17;
  orbit.maxDistance = 48;
  orbit.minPolarAngle = 0.35;
  orbit.maxPolarAngle = 1.28;
  const hemi = new THREE.HemisphereLight('#fff9e7', '#7fae9a', 2.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d1', 4.5);
  sun.position.set(-8, 20, 10);
  sun.castShadow = true;
  const shadowSize = matchMedia('(pointer: coarse)').matches ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, {
    left: -17,
    right: 17,
    top: 17,
    bottom: -17,
    near: 1,
    far: 65,
  });
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.0001;
  scene.add(sun);
  const materials: THREE.Material[] = [];
  const mat = (color: string, roughness = 0.68) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness });
    materials.push(m);
    return m;
  };
  const cream = mat('#fff5d7'),
    pink = mat('#f1a9b4'),
    green = mat('#68b998'),
    darkGreen = mat('#398e77'),
    yellow = mat('#ffcf57'),
    blue = mat('#71c9e8');
  const sphereGeo = new THREE.SphereGeometry(1, 32, 24);
  function sphere(
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy = sx,
    sz = sx,
  ) {
    const m = new THREE.Mesh(sphereGeo, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function cylinder(
    parent: THREE.Object3D,
    material: THREE.Material,
    radius: number,
    height: number,
    x: number,
    y: number,
    z: number,
  ) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 80),
      material,
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(250, 250),
    mat('#e4efe8'),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.05;
  floor.receiveShadow = true;
  scene.add(floor);
  cylinder(scene, mat('#9fc8a7'), 12.6, 0.75, 0, -0.64, 0);
  cylinder(scene, mat('#b8d9ac'), 12.7, 0.35, 0, -0.2, 0);
  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(12.3, 0.095, 12, 160),
    mat('#d1e6b9'),
  );
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.005;
  scene.add(trim);
  // Flat stepping stones guide exploration without blocking movement.
  const stoneMat = mat('#d7e3bd');
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const stone = cylinder(
      scene,
      stoneMat,
      0.52,
      0.035,
      Math.cos(a) * 5.5,
      0.013,
      Math.sin(a) * 5.5,
    );
    stone.scale.z = 0.7;
  }
  cylinder(
    scene,
    pink,
    PLATFORM.radius,
    PLATFORM.top,
    PLATFORM.x,
    PLATFORM.top / 2,
    PLATFORM.z,
  );
  cylinder(
    scene,
    mat('#ffcbd1'),
    PLATFORM.radius + 0.03,
    0.13,
    PLATFORM.x,
    PLATFORM.top - 0.065,
    PLATFORM.z,
  );
  const platformDecal = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.035, 8, 60),
    cream,
  );
  platformDecal.rotation.x = Math.PI / 2;
  platformDecal.position.set(PLATFORM.x, PLATFORM.top + 0.005, PLATFORM.z);
  scene.add(platformDecal);
  const ferryGroup = new THREE.Group();
  scene.add(ferryGroup);
  const ferryMaterial = mat('#70b9a5');
  cylinder(
    ferryGroup,
    ferryMaterial,
    FERRY.radius,
    FERRY.top,
    0,
    FERRY.top / 2,
    0,
  );
  cylinder(
    ferryGroup,
    mat('#c9eed7'),
    FERRY.radius + 0.02,
    0.12,
    0,
    FERRY.top - 0.06,
    0,
  );
  const rail = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, FERRY.amplitude * 2, 4, 12),
    mat('#7caa94'),
  );
  rail.rotation.z = Math.PI / 2;
  rail.position.set(FERRY.x, 0.02, FERRY.z);
  scene.add(rail);
  const purple = mat('#b295dd');
  const returnHoop = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.14, 20, 80),
    purple,
  );
  returnHoop.rotation.x = Math.PI / 2;
  returnHoop.position.set(RETURN_RING.x, RETURN_RING.y, RETURN_RING.z);
  scene.add(returnHoop);
  const returnTarget = cylinder(
    scene,
    mat('#ddccec'),
    RETURN_RING.targetRadius,
    0.035,
    RETURN_RING.x,
    0.018,
    RETURN_RING.z,
  );
  const targetMark = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.05, 10, 60),
    purple,
  );
  targetMark.rotation.x = Math.PI / 2;
  targetMark.position.set(RETURN_RING.x, 0.045, RETURN_RING.z);
  scene.add(targetMark);
  for (let i = 0; i < 7; i++)
    sphere(scene, purple, RETURN_RING.x, 0.6 + i * 0.75, RETURN_RING.z, 0.03);
  let character = characterId(initialProgress.character);
  const companion = createCharacter(materials, character);
  const { pet, body, eyes, arms, feet, mouth, surprisedMouth } = companion;
  scene.add(pet);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: '#386f54',
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
  });
  materials.push(shadowMat);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.83, 48), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  // Extruded, rounded star: a real object, not a flat UI marker.
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 + Math.PI / 2,
      r = i % 2 ? 0.32 : 0.68;
    if (!i) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  starShape.closePath();
  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.07,
      bevelThickness: 0.07,
    }),
    yellow,
  );
  star.position.set(STAR.x, STAR.y, STAR.z);
  star.castShadow = true;
  scene.add(star);
  cylinder(scene, mat('#e8d89a'), 0.95, 0.05, STAR.x, 0.025, STAR.z);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.14, 20, 80), blue);
  hoop.rotation.x = Math.PI / 2;
  hoop.position.set(HOOP.x, HOOP.y, HOOP.z);
  hoop.castShadow = true;
  scene.add(hoop);
  const hoopBase = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.055, 10, 60),
    blue,
  );
  hoopBase.rotation.x = Math.PI / 2;
  hoopBase.position.set(HOOP.x, 0.04, HOOP.z);
  scene.add(hoopBase);
  for (let i = 0; i < 5; i++)
    sphere(scene, blue, HOOP.x, 0.5 + i * 0.72, HOOP.z, 0.035);
  // Handmade-looking shrubs and flowers live along the garden edge.
  for (let i = 0; i < 13; i++) {
    const a = (i * Math.PI * 2) / 13,
      x = Math.cos(a) * 11.9,
      z = Math.sin(a) * 11.9;
    const shrub = new THREE.Group();
    shrub.position.set(x, 0, z);
    scene.add(shrub);
    sphere(shrub, i % 3 === 0 ? darkGreen : green, 0, 0.48, 0, 0.6, 0.67, 0.57);
    sphere(shrub, green, 0.42, 0.32, 0.15, 0.42, 0.45, 0.4);
    if (i % 2 === 0) {
      const trunk = cylinder(shrub, mat('#b79c70'), 0.09, 1.6, -0.3, 0.8, -0.3);
      sphere(
        shrub,
        i % 4 === 0 ? mat('#f3cc83') : green,
        trunk.position.x,
        1.9,
        -0.3,
        0.8,
        1.05,
        0.75,
      );
    }
    for (let j = 0; j < 3; j++) {
      const fx = -0.6 + j * 0.35,
        fz = 0.75;
      cylinder(shrub, darkGreen, 0.025, 0.25, fx, 0.125, fz);
      for (let k = 0; k < 5; k++) {
        const fa = (k * Math.PI * 2) / 5;
        sphere(
          shrub,
          i % 2 ? pink : cream,
          fx + Math.cos(fa) * 0.11,
          0.28,
          fz + Math.sin(fa) * 0.11,
          0.085,
          0.05,
          0.085,
        );
      }
      sphere(shrub, yellow, fx, 0.3, fz, 0.065);
    }
  }
  const sceneLabels: THREE.Sprite[] = [];
  function label(text: string, x: number, y: number, z: number, color: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#173a30';
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font =
      text.length > 1 ? 'bold 96px sans-serif' : 'bold 138px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 134);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
      sizeAttenuation: false,
    });
    materials.push(material);
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.renderOrder = 10;
    sceneLabels.push(sprite);
    scene.add(sprite);
    return sprite;
  }
  const markers = [
    label('1', STAR.x, 2.3, STAR.z, '#e3b349'),
    label('2', PLATFORM.x, 2.8, PLATFORM.z, '#de8b9e'),
    label('3', HOOP.x, HOOP.y + 1.2, HOOP.z, '#69bace'),
    label('4', FERRY.x, FERRY.top + 1, FERRY.z, '#5ba68a'),
    label('5', RETURN_RING.x, RETURN_RING.y + 1, RETURN_RING.z, '#a085cc'),
  ];
  const state = createState();
  state.completed = [...initialProgress.completed];
  let personality = initialProgress.personality;
  let gravity = initialProgress.gravity,
    paused = false,
    jump = false,
    disposed = false;
  let inputEnabled = true;
  let needsRender = true;
  let previous = performance.now(),
    accumulator = 0,
    tick = 0,
    elapsed = 0,
    frame = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reaction = '',
    reactionUntil = 0,
    idleSince = 0;
  let distanceTravelled = 0,
    jumps = 0;
  const react = (event: string, force = false) => {
    if (reaction === 'celebrate' && elapsed < reactionUntil && !force) return;
    reaction = event;
    reactionUntil = elapsed + (event === 'land' ? 0.55 : 2.3);
  };
  const persist = () =>
    onSave({
      ...initialProgress,
      completed: [...state.completed],
      planetSecrets: [...initialProgress.planetSecrets],
      gravity,
      personality,
      character,
    });
  const keys = new Set<string>();
  const touch = { x: 0, z: 0 };
  const reportState = () =>
    report({
      height: state.y,
      speed: state.vy,
      completed: [...state.completed],
      planetSecrets: [...initialProgress.planetSecrets],
      grounded: state.grounded,
      rideTime: state.rideTime,
      returnArmed: state.returnArmed,
      nearby: nearbyChallenge(state, gravity),
      distanceTravelled,
      jumps,
    });
  const reset = () => {
    needsRender = true;
    resetPosition(state);
    keys.clear();
    touch.x = 0;
    touch.z = 0;
    jump = false;
    distanceTravelled = 0;
    jumps = 0;
    accumulator = 0;
    reportState();
    reactionUntil = 0;
    notify('De vuelta en casa. Tus retos siguen guardados.');
  };
  const setPaused = (value: boolean) => {
    needsRender = true;
    paused = value;
    keys.clear();
    touch.x = 0;
    touch.z = 0;
    jump = false;
    accumulator = 0;
    previous = performance.now();
    orbit.enabled = inputEnabled && !paused;
    onPause(paused);
  };
  const restart = () => {
    state.completed.fill(false);
    persist();
    reset();
    notify('Un jardín entero de posibilidades. ¡Empezamos de nuevo!');
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!inputEnabled) return;
    const target = event.target as HTMLElement;
    if (target.matches('input, textarea, select') || target.isContentEditable)
      return;
    if (event.code === 'KeyP' && !event.repeat) {
      event.preventDefault();
      setPaused(!paused);
      return;
    }
    if (event.code === 'KeyR' && !event.repeat) {
      event.preventDefault();
      reset();
      return;
    }
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
      if (paused) return;
      keys.add(event.code);
      if (event.code === 'Space' && !event.repeat) jump = true;
    }
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
  const onBlur = () => setPaused(true);
  const onVisibility = () => {
    if (document.hidden) setPaused(true);
  };
  const onPointer = () => {
    renderer.domElement.focus({ preventScroll: true });
  };
  const onContext = (e: Event) => e.preventDefault();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  renderer.domElement.addEventListener('pointerdown', onPointer);
  renderer.domElement.addEventListener('contextmenu', onContext);
  const resize = () => {
    needsRender = true;
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    // Maintain useful horizontal framing in portrait without moving the controls.
    camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          Math.tan(THREE.MathUtils.degToRad(38 / 2)) /
            Math.min(1, camera.aspect),
        ),
    );
    camera.fov =
      height < 350 && width > height * 1.5 ? 30 : Math.min(80, camera.fov);
    camera.updateProjectionMatrix();
    const labelScale =
      (44 / Math.max(1, height)) *
      2 *
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    sceneLabels.forEach((marker) => marker.scale.setScalar(labelScale));
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const direction = new THREE.Vector3(),
    right = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0);
  const names = [
    '¡Una estrella para ti! Primer hallazgo conseguido.',
    '¡Qué buenas vistas! Plataforma conquistada.',
    '¡Por todo lo alto! Has cruzado el aro.',
    '¡Un paseo perfecto! Has viajado sobre la nube.',
    '¡Ida y vuelta! Ya dominas la gravedad.',
  ];
  function animate(now: number) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const delta = Math.min((now - previous) / 1000, 0.1);
    previous = now;
    if (paused && !needsRender) return;
    if (!paused) {
      elapsed += delta;
      accumulator += delta;
      camera.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();
      right.crossVectors(direction, up).normalize();
      const x =
        Number(keys.has('KeyD') || keys.has('ArrowRight')) -
        Number(keys.has('KeyA') || keys.has('ArrowLeft')) +
        touch.x;
      const z =
        Number(keys.has('KeyW') || keys.has('ArrowUp')) -
        Number(keys.has('KeyS') || keys.has('ArrowDown')) +
        touch.z;
      while (accumulator >= STEP) {
        const before = [...state.completed];
        const wasArmed = state.returnArmed;
        const oldX = state.x;
        const oldZ = state.z;
        if (jump && state.grounded) {
          react('jump');
          sound.jump(gravity);
          jumps += 1;
        }
        step(
          state,
          {
            x: right.x * x + direction.x * z,
            z: right.z * x + direction.z * z,
            jump,
          },
          gravity,
        );
        jump = false;
        distanceTravelled += Math.hypot(state.x - oldX, state.z - oldZ);
        accumulator -= STEP;
        if (state.justLanded) {
          react('land');
          sound.land(0.3, gravity);
        }
        state.completed.forEach((done: boolean, i: number) => {
          if (done && !before[i]) {
            persist();
            react('celebrate', true);
            notify(
              state.completed.every(Boolean)
                ? `¡${CHALLENGES.length} de ${CHALLENGES.length}! Ahora, a jugar con el universo.`
                : names[i],
            );
          }
        });
        if (!wasArmed && state.returnArmed)
          notify(
            '¡Capturado! El aro te sostiene. Pon Marte para bajar a la diana.',
          );
        if (state.rescued) {
          react('rescue', true);
          notify('¡Qué viaje! Gravi ha vuelto al jardín al llegar a 38 m.');
        }
      }
      const speed = Math.hypot(state.vx, state.vz);
      pet.position.set(state.x, state.y, state.z);
      const moving = ferryAt(state.time);
      ferryGroup.position.set(moving.x, 0, moving.z);
      markers[3].position.x = moving.x;
      returnHoop.material =
        state.returnArmed || state.completed[4] ? green : purple;
      returnTarget.scale.setScalar(
        state.returnArmed && !reducedMotion
          ? 1 + Math.sin(elapsed * 3) * 0.02
          : 1,
      );
      if (!state.grounded && gravity === 0 && elapsed > reactionUntil)
        react('float');
      if (speed > 0.1 || !state.grounded) idleSince = elapsed;
      if (elapsed - idleSince > 18) {
        react('idle');
        idleSince = elapsed;
      }
      companion.animate(elapsed, speed, state.grounded, reducedMotion);
      const pose = reactionPose(
        reaction,
        reactionUntil - elapsed,
        personality,
        reducedMotion,
      );
      body.scale.set(
        1 / Math.sqrt(pose.stretch),
        pose.stretch,
        1 / Math.sqrt(pose.stretch),
      );
      arms.forEach((arm, i) => {
        arm.rotation.z = (i === 0 ? -1 : 1) * (-0.4 - pose.arm);
      });
      mouth.visible = !pose.surprise;
      surprisedMouth.visible = pose.surprise;
      body.rotation.z =
        reaction === 'celebrate' && elapsed < reactionUntil && !reducedMotion
          ? Math.sin(elapsed * 15) * 0.14
          : body.rotation.z;
      if (speed > 0.2) {
        const angle = Math.atan2(state.vx, state.vz);
        pet.rotation.y +=
          Math.atan2(
            Math.sin(angle - pet.rotation.y),
            Math.cos(angle - pet.rotation.y),
          ) * Math.min(1, delta * 12);
      }
      body.position.y = state.grounded
        ? Math.sin(elapsed * (speed > 0.3 ? 13 : 2.5)) *
          (speed > 0.3 ? 0.045 : 0.025)
        : 0;
      feet.forEach((foot, i) => {
        foot.rotation.x = state.grounded
          ? Math.sin(elapsed * 13 + i * Math.PI) * Math.min(speed / 7, 0.5)
          : -0.3;
      });
      const blink = elapsed % 4.7 > 4.55 ? 0.12 : 1;
      eyes.forEach((eye) => {
        eye.scale.y = 0.17 * blink * pose.eyes;
      });
      shadow.position.set(
        state.x,
        Math.hypot(state.x - PLATFORM.x, state.z - PLATFORM.z) <=
          PLATFORM.radius
          ? PLATFORM.top + 0.015
          : Math.hypot(state.x - moving.x, state.z - moving.z) <= FERRY.radius
            ? FERRY.top + 0.015
            : 0.02,
        state.z,
      );
      shadow.scale.setScalar(1 + state.y * 0.045);
      shadowMat.opacity = Math.max(0.03, 0.17 - state.y * 0.012);
      star.rotation.y = elapsed * 0.8;
      star.position.y = STAR.y + Math.sin(elapsed * 2) * 0.13;
      star.visible = !state.completed[0];
      // The garden is now only the tutorial: its old challenge numbers stay hidden.
      markers.forEach((m) => {
        m.visible = false;
      });
      const desiredY = Math.max(0, state.y - 4),
        changeY = (desiredY - orbit.target.y) * Math.min(1, delta * 4);
      orbit.target.y += changeY;
      camera.position.y += changeY;
      tick += delta;
      if (tick >= 0.1) {
        reportState();
        tick = 0;
      }
    }
    orbit.update();
    needsRender = false;
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);
  return {
    setGravity: (g) => {
      needsRender = true;
      const next = validateGravity(g);
      if (next !== gravity) sound.gravity(next);
      gravity = next;
      persist();
      react(gravity === 0 ? 'float' : 'gravity', true);
    },
    setMove: (x, z) => {
      if (!paused && inputEnabled) {
        touch.x = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
        touch.z = Number.isFinite(z) ? Math.max(-1, Math.min(1, z)) : 0;
      }
    },
    requestJump: () => {
      if (!paused && inputEnabled) jump = true;
    },
    setInputEnabled: (enabled) => {
      inputEnabled = enabled;
      keys.clear();
      touch.x = touch.z = 0;
      jump = false;
      orbit.enabled = enabled && !paused;
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
      react('idle', true);
    },
    reset,
    restart,
    togglePause: () => setPaused(!paused),
    setPaused,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      orbit.dispose();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('pointerdown', onPointer);
      renderer.domElement.removeEventListener('contextmenu', onContext);
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) geometries.add(object.geometry);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => {
        if (m instanceof THREE.SpriteMaterial) m.map?.dispose();
        m.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
