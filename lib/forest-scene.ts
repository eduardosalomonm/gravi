import {
  FINALE_FLOWERS,
  FINALE_PATH,
  FINALE_STEPS,
  FINALE_SOLIDS,
} from './finale-course.mjs';
import { WORLD_REGIONS, placeInRegion } from './world-layout.mjs';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  AWAKENINGS,
  finaleUnlocked,
  FOREST_TREES,
  FOREST_ROCKS,
  PETAL_STOPS,
  SKY_STEPS,
  RIDGE_STEPS,
  WIND_STEPS,
  WIND_PILLARS,
  RIVER_STOPS,
  REFLECTION_POINTS,
  RESONANCE_STONES,
  LANTERN_STOPS,
  SAKURA_CENTERS,
  RUIN_POSTS,
  forestPoint,
} from './awakening.mjs';
import {
  PLANET_RADIUS,
  offsetDirection,
  surfaceDistance,
} from './planet-world.mjs';
import { meadowResponse } from './meadow-response.mjs';

type AwakeningState = {
  finale: {
    stage: number;
    flower: number;
    path: number;
    jump: number;
    dwell: number;
  };
  lanternStep: number;
  ridgeStep: number;
  stoneTime: number;
  stones: number[];
  reflectionStep: number;
  reflectionTime: number;
  riverStep: number;
  windStep: number;
  completed: string[];
  petalStep: number;
  skyStep: number;
  flowerTime: number;
};
const Y = new THREE.Vector3(0, 1, 0);

export function createForest(scene: THREE.Scene, materials: THREE.Material[]) {
  const root = new THREE.Group();
  scene.add(root);
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = textureCanvas.height = 64;
  const context = textureCanvas.getContext('2d')!;
  // A small repeating pigment texture softens the geometry without remote assets.
  let seed = 421;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const value = 205 + Math.floor(random() * 50);
      context.fillStyle = `rgb(${value},${value},${value})`;
      context.fillRect(x, y, 1, 1);
    }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = (color: string) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      map: texture,
    });
    materials.push(material);
    return material;
  };
  const bark = mat('#6d5945'),
    moss = mat('#6b8954'),
    rock = mat('#7d8267'),
    top = mat('#bfbd8c');
  const greens = [mat('#456851'), mat('#6f8951'), mat('#87965e')];
  const gold = mat('#ffdc81');
  gold.emissive.set('#a77b25');
  gold.emissiveIntensity = 0.3;
  const pink = mat('#dc8c9d'),
    lightPink = mat('#f4b5b8'),
    buds = mat('#ae7780'),
    cream = mat('#f9d98f');
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const leafShape = new THREE.IcosahedronGeometry(1, 1);
  const stoneShape = new THREE.CylinderGeometry(1, 1.12, 1, 14);
  const circle = new THREE.CircleGeometry(1, 20);
  circle.rotateX(-Math.PI / 2);
  const make = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    p: number[],
    s: number[],
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(p[0], p[1], p[2]);
    mesh.scale.set(s[0], s[1], s[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const anchor = (direction: THREE.Vector3Like, height = 0) => {
    const group = new THREE.Group();
    const up = new THREE.Vector3().copy(direction).normalize();
    group.position.copy(up).multiplyScalar(PLANET_RADIUS + height);
    group.quaternion.setFromUnitVectors(Y, up);
    root.add(group);
    return group;
  };
  const branch = (
    parent: THREE.Object3D,
    points: number[][],
    radius: number,
    material: THREE.Material = bark,
  ) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    );
    return make(
      parent,
      new THREE.TubeGeometry(curve, 12, radius, 7, false),
      material,
      [0, 0, 0],
      [1, 1, 1],
    );
  };

  // Paths lie just above the sphere, with no decorative height disguising a collider.
  const trailDots: THREE.Mesh[] = [];
  const path = (
    points: THREE.Vector3Like[],
    color: THREE.Material,
    width: number,
  ) => {
    for (let i = 0; i < points.length - 1; i++) {
      const a = new THREE.Vector3().copy(points[i]),
        b = new THREE.Vector3().copy(points[i + 1]);
      const count = Math.ceil((a.angleTo(b) * PLANET_RADIUS) / 0.65);
      for (let j = 0; j < count; j++) {
        const direction = a
          .clone()
          .lerp(b, j / count)
          .normalize();
        const g = anchor(direction, 0.025);
        const patch = make(
          g,
          circle,
          color,
          [0, 0, 0],
          [width * (0.88 + random() * 0.2), 1, width * 0.7],
        );
        patch.rotation.y = random() * Math.PI;
        patch.castShadow = false;
        trailDots.push(patch);
      }
    }
  };
  const earth = mat('#a7a67b'),
    litPath = mat('#d3b98a');
  litPath.emissive.set('#8c682d');
  litPath.emissiveIntensity = 0.16;
  path(
    [placeInRegion(forestPoint(0, 3), 0), AWAKENINGS[0].direction],
    earth,
    0.8,
  );
  path([...PETAL_STOPS, AWAKENINGS[1].tree], earth, 0.8);
  path([...LANTERN_STOPS, AWAKENINGS[4].tree], earth, 0.8);
  path(REFLECTION_POINTS, earth, 0.5);
  const duskLeaves = [mat('#446d72'), mat('#658b86'), mat('#90a99b')];
  FOREST_TREES.forEach((tree, i) => {
    const inLanternWood =
      surfaceDistance(tree.direction, WORLD_REGIONS[4].direction) < 17;
    const group = anchor(tree.direction);
    const bend = (i % 2 ? 1 : -1) * 0.24;
    branch(
      group,
      [
        [0, -0.12, 0],
        [bend, 1.3, 0.06],
        [bend * 0.5, tree.height, 0],
      ],
      0.25,
    );
    for (let k = 0; k < 3; k++) {
      const angle = (k * Math.PI * 2) / 3 + i;
      const x = Math.cos(angle) * 0.85,
        z = Math.sin(angle) * 0.85;
      branch(
        group,
        [
          [bend, 1.8, 0],
          [x * 0.55, tree.height - 0.4, z * 0.55],
          [x, tree.height + 0.15, z],
        ],
        0.12,
      );
      const canopy = make(
        group,
        sphere,
        (inLanternWood ? duskLeaves : greens)[(i + k) % 3],
        [x, tree.height + k * 0.26, z],
        [tree.width, 0.85, tree.width * 0.8],
      );
      canopy.rotation.y = angle;
    }
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      make(
        group,
        sphere,
        bark,
        [Math.cos(a) * 0.25, 0.06, Math.sin(a) * 0.25],
        [0.4, 0.12, 0.2],
      ).rotation.y = -a;
    }
  });

  const stepRings: { ring: THREE.Mesh; index: number; challenge: string }[] =
    [];
  const litRing = mat('#a9f4bf');
  litRing.emissive.set('#71d98b');
  litRing.emissiveIntensity = 0.9;
  [
    ...SKY_STEPS,
    ...RIDGE_STEPS,
    ...WIND_STEPS,
    ...RIVER_STOPS.filter((s) => s.height > 0),
    ...FINALE_SOLIDS,
  ].forEach((platform, i) => {
    const group = anchor(platform.direction);
    make(
      group,
      stoneShape,
      rock,
      [0, platform.height / 2 - 0.04, 0],
      [platform.radius, platform.height + 0.08, platform.radius],
    );
    make(
      group,
      new THREE.CylinderGeometry(1, 1, 0.06, 14),
      top,
      [0, platform.height - 0.03, 0],
      [platform.radius, 1, platform.radius],
    );
    // Engraved stepping marker, no numbers needed in the landscape.
    const ring = make(
      group,
      new THREE.TorusGeometry(platform.radius * 0.65, 0.045, 6, 40),
      buds,
      [0, platform.height + 0.035, 0],
      [1, 1, 1],
    );
    ring.rotation.x = -Math.PI / 2;
    stepRings.push({
      ring,
      index: platform.id.startsWith('final-path')
        ? FINALE_PATH.findIndex((p) => p.id === platform.id)
        : platform.id.startsWith('final-step')
          ? FINALE_STEPS.findIndex((p) => p.id === platform.id)
          : i < 4
            ? i
            : i < 7
              ? i - 4
              : i < 12
                ? i - 7
                : i === 12
                  ? 1
                  : 3,
      challenge: platform.id.startsWith('final-path')
        ? 'final-path'
        : platform.id.startsWith('final-step')
          ? 'final-step'
          : i < 4
            ? 'sky'
            : i < 7
              ? 'ridge'
              : i < 12
                ? 'wind'
                : 'river',
    });
    for (let k = 0; k < 3; k++)
      make(
        group,
        leafShape,
        moss,
        [
          Math.cos(k * 2 + i) * platform.radius * 0.8,
          platform.height - 0.18,
          Math.sin(k * 2 + i) * platform.radius * 0.8,
        ],
        [0.4, 0.16, 0.28],
      );
  });
  FOREST_ROCKS.forEach((rockData) => {
    const group = anchor(rockData.direction);
    make(
      group,
      new THREE.CylinderGeometry(
        rockData.radius,
        rockData.radius,
        rockData.height + 0.06,
        7,
      ),
      rock,
      [0, rockData.height / 2 - 0.03, 0],
      [1, 1, 1],
    );
    make(
      group,
      circle,
      moss,
      [0, rockData.height + 0.003, 0],
      [rockData.radius * 0.7, 1, rockData.radius * 0.7],
    );
  });

  // Small ruins frame the destination without obstructing the landing area.
  RUIN_POSTS.forEach((post) => {
    const ruin = anchor(post.direction);
    for (let n = 0; n < 3; n++)
      make(ruin, stoneShape, rock, [0, 0.4 + n * 0.8, 0], [0.42, 0.8, 0.42]);
  });

  const blossomParts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5;
    const petal = new THREE.SphereGeometry(1, 6, 4);
    petal.scale(0.12, 0.065, 0.18);
    petal.rotateY(a);
    petal.translate(Math.sin(a) * 0.13, 0, Math.cos(a) * 0.13);
    blossomParts.push(petal);
  }
  const flowerGeometry = mergeGeometries(blossomParts);
  blossomParts.forEach((g) => g.dispose());
  const dummy = new THREE.Object3D();
  const awakenedMeadow = new THREE.Group();
  root.add(awakenedMeadow);
  for (let i = 0; i < 55; i++) {
    const a = i * 2.4,
      r = 2 + random() * 3;
    const point = offsetDirection(
      AWAKENINGS[0].direction,
      Math.cos(a) * r,
      Math.sin(a) * r,
    );
    const g = anchor(point, 0.16);
    awakenedMeadow.attach(g);
    make(
      g,
      flowerGeometry,
      i % 3 ? lightPink : cream,
      [0, 0, 0],
      [0.65, 0.65, 0.65],
    );
  }
  // Dormant sakuras are grey and their buds breathe softly; each tree owns its
  // bark material so it can warm up while it blooms.
  const sleepBuds = mat('#b9aeb2');
  sleepBuds.emissive.set('#f4b5b8');
  const dormantBark = new THREE.Color('#8f8a84');
  const awakeBark = new THREE.Color('#6d5945');
  const sakuras = AWAKENINGS.map((item) => {
    const index =
      item.sakura === 'nube' ? 0 : item.sakura === 'espiral' ? 1 : 2;
    const direction = item.tree;
    const group = anchor(direction);
    const treeBark = mat('#8f8a84');
    const h = index === 2 ? 5.5 : 3.7;
    branch(
      group,
      [
        [0, -0.1, 0],
        [-0.28, 1, 0],
        [0.25, 2.1, 0.1],
        [index === 1 ? -0.25 : 0, h, 0],
      ],
      0.28,
      treeBark,
    );
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      make(
        group,
        sphere,
        treeBark,
        [Math.sin(a) * 0.32, 0.03, Math.cos(a) * 0.32],
        [0.5, 0.16, 0.24],
      ).rotation.y = a;
    }
    const centers =
      SAKURA_CENTERS[index === 0 ? 'flowers' : index === 1 ? 'petals' : 'sky'];
    const blooming = new THREE.Group();
    group.add(blooming);
    const sleeping = new THREE.Group();
    group.add(sleeping);
    centers.forEach((p, k) => {
      branch(
        group,
        [
          [0, 1.8 + k * 0.6, 0],
          [p[0] * 0.6, p[1] - 0.5, p[2]],
          [p[0], p[1] - (index === 2 ? 0.6 : 0), p[2]],
        ],
        0.11,
        treeBark,
      );
      const count = 48;
      const blossoms = new THREE.InstancedMesh(
        flowerGeometry,
        item.id === 'journey' ? gold : k % 2 ? pink : lightPink,
        count,
      );
      const cloud = make(
        blooming,
        sphere,
        item.id === 'journey' ? gold : pink,
        p,
        [1.1, 0.58, 0.92],
      );
      cloud.castShadow = true;
      for (let n = 0; n < count; n++) {
        const a = n * 2.39996;
        const y = 1 - (2 * (n + 0.5)) / count;
        const r = Math.sqrt(1 - y * y);
        dummy.position.set(
          p[0] + Math.cos(a) * r * 1.1,
          p[1] + y * 0.6,
          p[2] + Math.sin(a) * r * 0.94,
        );
        dummy.rotation.set(
          random() * Math.PI,
          random() * Math.PI,
          random() * Math.PI,
        );
        dummy.scale.setScalar(0.65 + random() * 0.55);
        dummy.updateMatrix();
        blossoms.setMatrixAt(n, dummy.matrix);
      }
      blossoms.castShadow = true;
      blooming.add(blossoms);
      for (let n = 0; n < 5; n++) {
        const a = n * 1.25;
        const end = [
          p[0] + Math.cos(a) * 0.6,
          p[1] + 0.2 + Math.sin(a) * 0.3,
          p[2] + Math.sin(a) * 0.55,
        ];
        branch(group, [p, end], 0.035, treeBark);
        make(sleeping, sphere, sleepBuds, end, [0.1, 0.16, 0.1]);
      }
    });
    blooming.scale.setScalar(0.001);
    const crown = new THREE.Vector3(0, index === 2 ? 5.2 : 4.2, 0);
    return {
      blooming,
      sleeping,
      amount: 0,
      id: item.id,
      bark: treeBark,
      direction: new THREE.Vector3().copy(direction).normalize(),
      crown,
      gold: item.id === 'journey',
    };
  });

  // The flowers respond in place; the character never needs to touch an opaque trigger.
  const flowerBed = anchor(AWAKENINGS[0].direction);
  const responsive: THREE.Mesh[] = [];
  for (let n = 0; n < 9; n++) {
    const a = n * 2.4,
      r = 0.5 + (n % 3) * 0.55;
    make(
      flowerBed,
      new THREE.CylinderGeometry(0.025, 0.035, 0.35, 5),
      moss,
      [Math.cos(a) * r, 0.16, Math.sin(a) * r],
      [1, 1, 1],
    );
    responsive.push(
      make(
        flowerBed,
        flowerGeometry,
        cream,
        [Math.cos(a) * r, 0.37, Math.sin(a) * r],
        [0.3, 1, 0.3],
      ),
    );
  }
  // A spiral of pale botanical rosettes makes this clearing identifiable from
  // the ground. Each is anchored to the sphere rather than a flat tangent disc.
  for (let n = 0; n < 72; n++) {
    const a = n * 0.3;
    const r = 2.8 + (n / 72) * 3.6;
    const g = anchor(
      offsetDirection(
        AWAKENINGS[0].direction,
        Math.cos(a) * r,
        Math.sin(a) * r,
      ),
      0.025,
    );
    make(g, circle, moss, [0, 0, 0], [0.24, 1, 0.24]);
    for (let leaf = 0; leaf < 3; leaf++) {
      const angle = (leaf * Math.PI * 2) / 3;
      const mesh = make(
        g,
        leafShape,
        lightPink,
        [Math.cos(angle) * 0.09, 0.08, Math.sin(angle) * 0.09],
        [0.055, 0.16, 0.13],
      );
      mesh.rotation.y = angle;
      mesh.rotation.z = 0.5;
    }
  }
  const meadowGlow = mat('#ffe4ab');
  meadowGlow.emissive.set('#ffd680');
  meadowGlow.emissiveIntensity = 0.6;
  // Small light seeds fill only while the actual completion dwell advances.
  const meadowSeeds = Array.from({ length: 18 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 18;
    const radius = 2.15;
    const y =
      Math.sqrt(PLANET_RADIUS ** 2 - radius ** 2) - PLANET_RADIUS + 0.06;
    return make(
      flowerBed,
      sphere,
      buds,
      [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      [0.07, 0.04, 0.07],
    );
  });
  const butterflies = Array.from({ length: 7 }, (_, i) => {
    const g = new THREE.Group();
    flowerBed.add(g);
    const wings = [-1, 1].map((side) => {
      const wing = make(
        g,
        leafShape,
        i % 2 ? lightPink : cream,
        [side * 0.09, 0, 0],
        [0.12, 0.025, 0.17],
      );
      wing.castShadow = false;
      return wing;
    });
    return { g, wings };
  });
  const markers = PETAL_STOPS.map((direction, i) => {
    const g = anchor(direction, 0.07);
    for (let n = 0; n < 5; n++)
      make(
        g,
        flowerGeometry,
        lightPink,
        [Math.cos(n * 1.25) * 0.6, 0, Math.sin(n * 1.25) * 0.6],
        [0.8, 0.8, 0.8],
      );
    const core = make(
      g,
      new THREE.TorusGeometry(0.76, 0.028, 6, 24),
      buds,
      [0, 0, 0],
      [1, 1, 1],
    );
    core.rotation.x = -Math.PI / 2;
    return { core, index: i };
  });
  const lanternMarkers = LANTERN_STOPS.map((direction, i) => {
    const g = anchor(direction, 0.04);
    make(
      g,
      new THREE.CylinderGeometry(0.025, 0.04, 0.55, 6),
      bark,
      [0, 0.25, 0],
      [1, 1, 1],
    );
    const bulb = make(g, sphere, buds, [0, 0.6, 0], [0.18, 0.23, 0.18]);
    const ring = make(
      g,
      new THREE.TorusGeometry(0.75, 0.04, 6, 32),
      buds,
      [0, 0, 0],
      [1, 1, 1],
    );
    ring.rotation.x = -Math.PI / 2;
    return { bulb, ring, index: i };
  });
  const fireflyMaterial = mat('#e7e9a0');
  fireflyMaterial.emissive.set('#e6ee9a');
  fireflyMaterial.emissiveIntensity = 0.65;
  const lanternFireflies = LANTERN_STOPS.slice(0, -1).flatMap((point, index) =>
    Array.from({ length: 14 }, (_, n) => {
      const next = LANTERN_STOPS[index + 1];
      const direction = new THREE.Vector3()
        .copy(point)
        .lerp(new THREE.Vector3().copy(next), n / 14)
        .normalize();
      const group = anchor(direction, 0);
      const light = make(
        group,
        sphere,
        fireflyMaterial,
        [0, 0.7 + (n % 4) * 0.35, 0],
        [0.045, 0.045, 0.045],
      );
      light.castShadow = false;
      return { light, index, n, base: light.position.y };
    }),
  );
  const cliffStone = mat('#d5d0b6'),
    cliffTop = mat('#eae3c9');
  WIND_PILLARS.forEach((p) => {
    const g = anchor(p.direction);
    make(
      g,
      new THREE.CylinderGeometry(p.radius, p.radius, p.height, 10),
      cliffStone,
      [0, p.height / 2, 0],
      [1, 1, 1],
    );
    make(
      g,
      new THREE.CylinderGeometry(p.radius, p.radius, 0.04, 10),
      cliffTop,
      [0, p.height - 0.02, 0],
      [1, 1, 1],
    );
    for (let n = 0; n < 3; n++)
      make(
        g,
        new THREE.ConeGeometry(0.07, 0.4, 4),
        moss,
        [(n - 1) * 0.16, p.height + 0.15, 0],
        [1, 1, 1],
      );
  });
  const windWisps = WIND_PILLARS.map((p, i) => {
    const g = anchor(p.direction, p.height + 0.7);
    const wisp = make(g, sphere, cream, [0, 0, 0], [0.18, 0.025, 0.025]);
    wisp.castShadow = false;
    return { wisp, i };
  });
  const embrace = anchor(AWAKENINGS[3].direction, 0.035);
  const embraceRing = make(
    embrace,
    new THREE.TorusGeometry(2.35, 0.045, 6, 48),
    buds,
    [0, 0, 0],
    [1, 1, 1],
  );
  embraceRing.rotation.x = -Math.PI / 2;
  const embraceFlowers = new THREE.Group();
  embrace.add(embraceFlowers);
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI) / 9;
    make(
      embraceFlowers,
      flowerGeometry,
      cream,
      [Math.cos(a) * 2.35, 0.05, Math.sin(a) * 2.35],
      [0.8, 0.8, 0.8],
    );
  }
  const magic = mat('#bdeff7');
  magic.emissive.set('#7ce9e4');
  magic.emissiveIntensity = 0.8;
  const signals = [
    ...RESONANCE_STONES,
    ...REFLECTION_POINTS,
    ...RIVER_STOPS.map((s) => s.direction),
  ].map((direction, i) => {
    const height = i >= 6 ? RIVER_STOPS[i - 6].height : 0;
    const g = anchor(direction, height + 0.045);
    const ring = make(
      g,
      new THREE.TorusGeometry(i >= 3 && i < 6 ? 1.15 : 0.8, 0.045, 6, 32),
      cream,
      [0, 0, 0],
      [1, 1, 1],
    );
    ring.rotation.x = -Math.PI / 2;
    if (i >= 3 && i < 6) make(g, circle, magic, [0, -0.02, 0], [1.1, 1, 1.1]);
    const orb = make(g, sphere, cream, [0, 0.6, 0], [0.12, 0.12, 0.12]);
    return { ring, orb };
  });
  path([WIND_STEPS[0].direction, WORLD_REGIONS[8].direction], earth, 0.7);
  const finalFlowers = FINALE_FLOWERS.map((flower, i) => {
    const g = anchor(flower.direction, 0.06);
    const petals = make(g, flowerGeometry, cream, [0, 0.35, 0], [1, 1, 1]);
    const ring = make(
      g,
      new THREE.TorusGeometry(0.9, 0.055, 6, 32),
      buds,
      [0, 0, 0],
      [1, 1, 1],
    );
    ring.rotation.x = -Math.PI / 2;
    for (let n = 0; n <= i; n++)
      make(
        g,
        sphere,
        cream,
        [(n - i / 2) * 0.25, 0.12, -0.55],
        [0.06, 0.06, 0.06],
      );
    return { petals, ring };
  });
  const finalPathMarkers = FINALE_PATH.map((stop) => {
    const g = anchor(stop.direction, stop.height + 0.045);
    for (let n = 0; n < 5; n++)
      make(
        g,
        flowerGeometry,
        lightPink,
        [Math.cos(n * 1.25) * 0.62, 0.04, Math.sin(n * 1.25) * 0.62],
        [0.65, 0.65, 0.65],
      );
    const ring = make(
      g,
      new THREE.TorusGeometry(0.85, 0.045, 6, 32),
      buds,
      [0, 0, 0],
      [1, 1, 1],
    );
    ring.rotation.x = -Math.PI / 2;
    return ring;
  });
  const finalBeacon = anchor(FINALE_FLOWERS[0].direction);
  for (let i = 0; i < 10; i++)
    make(
      finalBeacon,
      sphere,
      gold,
      [Math.sin(i) * 0.4, 1 + i * 0.7, Math.cos(i) * 0.4],
      [0.07, 0.07, 0.07],
    );
  const riverLight = new THREE.Group();
  root.add(riverLight);
  for (let i = 0; i < RIVER_STOPS.length - 1; i++) {
    const a = RIVER_STOPS[i],
      b = RIVER_STOPS[i + 1];
    for (let n = 0; n < 12; n++) {
      const t = n / 12,
        d = new THREE.Vector3()
          .copy(a.direction)
          .lerp(new THREE.Vector3().copy(b.direction), t)
          .normalize();
      const g = anchor(d, 0.15 + a.height * (1 - t) + b.height * t);
      riverLight.attach(g);
      make(g, sphere, magic, [0, 0, 0], [0.08, 0.08, 0.08]);
    }
  }
  const wonders = AWAKENINGS.map((item) => {
    const g = anchor(item.tree);
    const motes = new THREE.InstancedMesh(sphere, magic, 18);
    g.add(motes);
    const vertices = [];
    for (let n = 0; n < 9; n++) {
      const a = (n * Math.PI) / 4;
      vertices.push(
        new THREE.Vector3(
          Math.cos(a) * 2.3,
          7 + Math.sin(a * 2) * 0.5,
          Math.sin(a) * 2.3,
        ),
      );
    }
    const lineMaterial = new THREE.LineBasicMaterial({
      color: '#b9f8ef',
      transparent: true,
      opacity: 0.7,
    });
    materials.push(lineMaterial);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(vertices),
      lineMaterial,
    );
    g.add(line);
    return { g, motes, line, item };
  });
  // Ferns and patches frame paths rather than filling the walkable space.
  const fernGeometry = new THREE.ConeGeometry(0.2, 0.7, 5);
  const fernDirections = FOREST_TREES.flatMap((tree, i) =>
    Array.from({ length: 7 }, (_, k) => {
      return new THREE.Vector3().copy(
        offsetDirection(
          tree.direction,
          Math.cos(k * 2.4 + i) * 2.2,
          Math.sin(k * 2.4 + i) * 2.2,
        ),
      );
    }),
  );
  const ferns = new THREE.InstancedMesh(
    fernGeometry,
    moss,
    fernDirections.length,
  );
  fernDirections.forEach((direction, i) => {
    dummy.position.copy(direction).multiplyScalar(PLANET_RADIUS + 0.26);
    dummy.quaternion.setFromUnitVectors(Y, direction);
    dummy.scale.set(0.8, 0.6 + random() * 0.5, 0.8);
    dummy.updateMatrix();
    ferns.setMatrixAt(i, dummy.matrix);
  });
  root.add(ferns);
  const PETALS_PER_TREE = 12;
  const petals = new THREE.InstancedMesh(
    flowerGeometry,
    lightPink,
    PETALS_PER_TREE * AWAKENINGS.length,
  );
  petals.frustumCulled = false;
  root.add(petals);
  // A one-off burst of petals when a sakura blooms.
  const BURST = 90;
  const burstMesh = new THREE.InstancedMesh(flowerGeometry, pink, BURST);
  burstMesh.frustumCulled = false;
  burstMesh.visible = false;
  root.add(burstMesh);
  const burstGold = mat('#ffdc81');
  burstGold.emissive.set('#c8962f');
  burstGold.emissiveIntensity = 0.4;
  const burstParticles = Array.from({ length: BURST }, () => ({
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    spin: new THREE.Vector3(),
  }));
  let burstAge = Infinity;
  let settled = false;
  const burstUp = new THREE.Vector3();
  // Batch static trunks, ruins and foliage by material. Animated rewards keep
  // their own transforms; mobile GPUs avoid hundreds of separate draw calls.
  const protectedNodes = new Set<THREE.Object3D>([
    finalBeacon,
    ...finalFlowers.flatMap((f) => [f.petals, f.ring]),
    ...finalPathMarkers,
    riverLight,
    ...signals.flatMap((s) => [s.ring, s.orb]),
    ...wonders.map((w) => w.g),
    awakenedMeadow,
    ...trailDots,
    ...responsive,
    ...meadowSeeds,
    ...butterflies.map((b) => b.g),
    ...markers.map((m) => m.core),
    ...stepRings.map((m) => m.ring),
    ...lanternMarkers.flatMap((m) => [m.ring, m.bulb]),
    ...lanternFireflies.map((f) => f.light),
    ...windWisps.map((w) => w.wisp),
    embraceRing,
    embraceFlowers,
    ...sakuras.flatMap((s) => [s.blooming, s.sleeping]),
    burstMesh,
  ]);
  const originals = new Set<THREE.BufferGeometry>();
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const staticMeshes: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      object instanceof THREE.InstancedMesh ||
      Array.isArray(object.material)
    )
      return;
    let ancestor: THREE.Object3D | null = object;
    while (ancestor) {
      if (protectedNodes.has(ancestor)) return;
      ancestor = ancestor.parent;
    }
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    const list = batches.get(object.material) ?? [];
    list.push(geometry);
    batches.set(object.material, list);
    originals.add(object.geometry);
    staticMeshes.push(object);
  });
  staticMeshes.forEach((mesh) => mesh.removeFromParent());
  batches.forEach((geometries, material) => {
    const combined = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(combined, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
  return {
    update(
      state: AwakeningState,
      gravity: number,
      time: number,
      dt: number,
      reduced: boolean,
    ) {
      const finalReady = finaleUnlocked(state),
        f = state.finale;
      finalBeacon.visible = finalReady && !state.completed.includes('journey');
      finalFlowers.forEach(({ petals, ring }, i) => {
        const opened =
          finalReady &&
          (i < f.flower || Math.abs(gravity - FINALE_FLOWERS[i].gravity) < 0.2);
        petals.scale.setScalar(opened ? 1.4 : 0.35);
        ring.material =
          i < f.flower ? litRing : finalReady && i === f.flower ? cream : buds;
      });
      finalPathMarkers.forEach((ring, i) => {
        ring.material =
          i < f.path
            ? litRing
            : finalReady && f.stage === 1 && i === f.path
              ? cream
              : buds;
      });
      riverLight.visible = state.completed.includes('river');
      signals.forEach(({ ring, orb }, i) => {
        const lit =
          i < 3
            ? state.stones.includes(i) || state.completed.includes('jupiter')
            : i < 6
              ? i - 3 < state.reflectionStep ||
                state.completed.includes('reflection')
              : i - 6 < state.riverStep || state.completed.includes('river');
        const reflecting = i >= 3 && i < 6;
        const current = reflecting && i - 3 === state.reflectionStep;
        const resonating =
          i < 3
            ? gravity >= 24
            : current && Math.abs(gravity - [1.62, 9.81, 24.79][i - 3]) < 0.2;
        ring.material = orb.material = lit
          ? litRing
          : resonating
            ? magic
            : current
              ? cream
              : buds;
        orb.scale.setScalar(lit || resonating ? 0.18 : current ? 0.14 : 0.1);
        orb.position.y = 0.6 + (reduced ? 0 : Math.sin(time * 1.2 + i) * 0.13);
      });
      wonders.forEach(({ g, motes, line, item }) => {
        g.visible = state.completed.includes(item.id);
        line.visible = item.sakura === 'constelacion';
        for (let n = 0; n < 18; n++) {
          const a = n * 2.399 + (reduced ? 0 : time * 0.12),
            r = 1.8 + (n % 3) * 0.4;
          const h =
            item.sakura === 'constelacion'
              ? 6.4 + Math.sin(a) * 0.8
              : item.sakura === 'espiral'
                ? 0.3 + (n / 18) * 5
                : 0.5 + (n % 4) * 0.4;
          dummy.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(0.045 + (n % 3) * 0.015);
          dummy.updateMatrix();
          motes.setMatrixAt(n, dummy.matrix);
        }
        motes.instanceMatrix.needsUpdate = true;
      });
      awakenedMeadow.visible = state.completed.includes('flowers');
      embraceFlowers.visible = state.completed.includes('jupiter');
      embraceRing.material = state.completed.includes('jupiter')
        ? litRing
        : gravity >= 24
          ? cream
          : buds;
      stepRings.forEach(({ ring, index, challenge }) => {
        const step =
          challenge === 'final-path'
            ? state.finale.path
            : challenge === 'final-step'
              ? state.finale.jump
              : challenge === 'sky'
                ? state.skyStep
                : challenge === 'ridge'
                  ? state.ridgeStep
                  : challenge === 'wind'
                    ? state.windStep
                    : state.riverStep;
        const locked =
          challenge.startsWith('final-') &&
          (!finalReady || f.stage < (challenge === 'final-path' ? 1 : 2));
        ring.material = locked
          ? buds
          : state.completed.includes(challenge) || index < step
            ? litRing
            : index === step
              ? cream
              : buds;
      });
      lanternFireflies.forEach(({ light, index, n, base }) => {
        const awake =
          state.completed.includes('lanterns') || index < state.lanternStep;
        light.visible = awake || n % 7 === 0;
        light.position.y =
          base + (reduced ? 0 : Math.sin(time * 0.9 + n) * 0.15);
        light.position.x = reduced ? 0 : Math.sin(time * 0.5 + n) * 0.25;
        light.scale.setScalar(awake ? 0.055 : 0.025);
      });
      windWisps.forEach(({ wisp, i }) => {
        wisp.position.x = reduced ? 0 : Math.sin(time * 0.8 + i) * 0.7;
        wisp.scale.x = state.completed.includes('wind') ? 0.28 : 0.18;
      });
      lanternMarkers.forEach(({ ring, bulb, index }) => {
        ring.material = bulb.material =
          state.completed.includes('lanterns') || index < state.lanternStep
            ? litRing
            : buds;
      });
      sakuras.forEach((tree) => {
        const goal = state.completed.includes(tree.id) ? 1 : 0;
        // Sakuras saved as bloomed appear open on load; only new blooms grow.
        tree.amount =
          reduced || !settled
            ? goal
            : THREE.MathUtils.damp(tree.amount, goal, 2.2, dt);
        tree.blooming.visible = tree.amount > 0.001;
        tree.blooming.scale.setScalar(Math.max(0.001, tree.amount));
        tree.sleeping.visible = tree.amount < 0.85;
        (tree.bark as THREE.MeshStandardMaterial).color
          .copy(dormantBark)
          .lerp(awakeBark, Math.min(1, tree.amount * 1.4));
      });
      settled = true;
      sleepBuds.emissiveIntensity = reduced
        ? 0.2
        : 0.18 + Math.sin(time * 1.6) * 0.16;
      if (burstAge < 3.4) {
        burstAge += dt;
        const drag = Math.exp(-1.6 * dt);
        burstParticles.forEach((particle, n) => {
          particle.velocity.multiplyScalar(drag);
          particle.velocity.addScaledVector(burstUp, -0.9 * dt);
          particle.position.addScaledVector(particle.velocity, dt);
          dummy.position.copy(particle.position);
          dummy.rotation.set(
            particle.spin.x * burstAge,
            particle.spin.y * burstAge,
            particle.spin.z * burstAge,
          );
          const fade = 1 - Math.max(0, (burstAge - 2.2) / 1.2);
          dummy.scale.setScalar(Math.max(0.001, 0.5 * fade));
          dummy.updateMatrix();
          burstMesh.setMatrixAt(n, dummy.matrix);
        });
        burstMesh.instanceMatrix.needsUpdate = true;
        burstMesh.visible = burstAge < 3.4;
      }
      const meadowDone = state.completed.includes('flowers');
      const response = meadowResponse(gravity, state.flowerTime, meadowDone);
      meadowSeeds.forEach((mesh, i) => {
        mesh.material =
          i < response.progress * meadowSeeds.length ? meadowGlow : buds;
      });
      butterflies.forEach(({ g, wings }, i) => {
        g.visible = meadowDone;
        const angle = i * 2.4 + (reduced ? 0 : time * (0.12 + i * 0.015));
        const radius = 2.7 + i * 0.32;
        g.position.set(
          Math.cos(angle) * radius,
          reduced ? 0.22 : 0.8 + Math.sin(time * 0.7 + i) * 0.3,
          Math.sin(angle) * radius,
        );
        g.rotation.y = -angle;
        wings.forEach((wing, side) => {
          wing.rotation.z = reduced
            ? side
              ? 0.3
              : -0.3
            : Math.sin(time * 8 + i) * (side ? 0.7 : -0.7);
        });
      });
      responsive.forEach((mesh, i) => {
        mesh.scale.x = mesh.scale.z = THREE.MathUtils.damp(
          mesh.scale.x,
          response.opening,
          5,
          dt,
        );
        mesh.position.y = THREE.MathUtils.damp(
          mesh.position.y,
          response.floating ? 0.65 : 0.37,
          5,
          dt,
        );
        mesh.rotation.y = reduced ? 0 : Math.sin(time * 0.7 + i) * 0.14;
      });
      markers.forEach(({ core, index }) => {
        core.material =
          state.completed.includes('petals') || index < state.petalStep
            ? cream
            : buds;
      });
      trailDots.forEach((mesh) => {
        mesh.material = state.completed.includes('petals') ? litPath : earth;
      });
      petals.visible = state.completed.length > 0 && !reduced;
      const bloomed = AWAKENINGS.filter((it) =>
        state.completed.includes(it.id),
      );
      petals.count = bloomed.length * PETALS_PER_TREE;
      for (let n = 0; n < petals.count; n++) {
        const item = bloomed[n % bloomed.length];
        if (!item) break;
        const center = new THREE.Vector3()
          .copy(item.tree)
          .multiplyScalar(PLANET_RADIUS);
        const orientation = new THREE.Quaternion().setFromUnitVectors(
          Y,
          new THREE.Vector3().copy(item.tree),
        );
        dummy.position
          .set(
            Math.sin(n * 3 + time * 0.3) * 2,
            1 + ((((n * 0.27 - time * 0.32) % 3) + 3) % 3),
            Math.cos(n * 2 + time * 0.3) * 2,
          )
          .applyQuaternion(orientation)
          .add(center);
        dummy.rotation.set(time * 0.4 + n, n, time * 0.3);
        dummy.scale.setScalar(0.18);
        dummy.updateMatrix();
        petals.setMatrixAt(n, dummy.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
    },
    /** Throws a cloud of petals from the crown of the sakura that just bloomed. */
    burst(id: string, reduced: boolean) {
      const tree = sakuras.find((item) => item.id === id);
      if (!tree || reduced) return;
      burstMesh.material = tree.gold ? burstGold : pink;
      burstUp.copy(tree.direction);
      const orientation = new THREE.Quaternion().setFromUnitVectors(
        Y,
        tree.direction,
      );
      const origin = tree.direction
        .clone()
        .multiplyScalar(PLANET_RADIUS)
        .add(tree.crown.clone().applyQuaternion(orientation));
      burstParticles.forEach((particle) => {
        particle.position.copy(origin);
        const a = random() * Math.PI * 2;
        const lift = 0.6 + random() * 1.8;
        const spread = 2 + random() * 3.5;
        particle.velocity
          .set(Math.cos(a) * spread, lift * 2.2, Math.sin(a) * spread)
          .applyQuaternion(orientation);
        particle.spin.set(random() * 6, random() * 6, random() * 6);
      });
      burstAge = 0;
      burstMesh.visible = true;
    },
    dispose() {
      texture.dispose();
      originals.forEach((g) => g.dispose());
    },
  };
}
