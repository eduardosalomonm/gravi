import * as THREE from 'three';
import { CHARACTERS, characterId } from './characters.mjs';

/** One visual model in both worlds. This module never reads or changes physics. */
export function createCharacter(materials: THREE.Material[], initial: string) {
  const pet = new THREE.Group();
  pet.scale.setScalar(0.82);
  const body = new THREE.Group();
  pet.add(body);
  const mat = (color: string) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1 });
    materials.push(m);
    return m;
  };
  const skin = mat('#f38d77'),
    footMaterial = mat('#ce7660'),
    cream = mat('#fff5d7'),
    dark = mat('#253c40'),
    pink = mat('#f1a9b4'),
    green = mat('#708b4f');
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const add = (
    parent: THREE.Object3D,
    m: THREE.Material,
    p: number[],
    s: number[],
  ) => {
    const mesh = new THREE.Mesh(sphere, m);
    mesh.position.set(p[0], p[1], p[2]);
    mesh.scale.set(s[0], s[1], s[2]);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  add(body, skin, [0, 0.85, 0], [0.83, 0.81, 0.72]);
  const outline = new THREE.MeshBasicMaterial({
    color: '#2b4a44',
    side: THREE.BackSide,
  });
  materials.push(outline);
  add(body, outline, [0, 0.85, 0], [0.86, 0.84, 0.75]);
  add(body, cream, [0, 0.64, 0.63], [0.53, 0.41, 0.17]);
  const eyes: THREE.Mesh[] = [],
    arms: THREE.Mesh[] = [],
    feet: THREE.Mesh[] = [];
  for (const sign of [-1, 1]) {
    add(body, cream, [sign * 0.3, 1.03, 0.62], [0.24, 0.29, 0.14]);
    eyes.push(add(body, dark, [sign * 0.28, 1.04, 0.738], [0.115, 0.17, 0.06]));
    add(body, cream, [sign * 0.28 - 0.028, 1.1, 0.79], [0.035, 0.042, 0.012]);
    add(body, pink, [sign * 0.55, 0.77, 0.59], [0.145, 0.075, 0.05]);
    arms.push(add(body, skin, [sign * 0.68, 0.56, 0], [0.21, 0.32, 0.24]));
    feet.push(
      add(pet, footMaterial, [sign * 0.4, 0.15, 0.12], [0.27, 0.16, 0.37]),
    );
  }
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.018, 8, 24, Math.PI),
    dark,
  );
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, 0.69, 0.803);
  body.add(mouth);
  const surprisedMouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.075, 0.018, 8, 24),
    dark,
  );
  surprisedMouth.position.copy(mouth.position);
  surprisedMouth.visible = false;
  body.add(surprisedMouth);
  const variants = Object.fromEntries(
    Object.keys(CHARACTERS).map((id) => {
      const g = new THREE.Group();
      body.add(g);
      return [id, g];
    }),
  );
  const curve = (
    parent: THREE.Object3D,
    points: number[][],
    radius: number,
    material: THREE.Material,
  ) => {
    const geometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      ),
      16,
      radius,
      8,
      false,
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const ears: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sign * 0.48, 1.47, -0.02);
    variants.gravi.add(ear);
    ears.push(ear);
    curve(
      ear,
      [
        [0, 0, 0],
        [sign * 0.25, 0.08, 0],
        [sign * 0.5, -0.12, 0],
        [sign * 0.64, -0.28, 0],
      ],
      0.15,
      skin,
    );
    add(ear, skin, [sign * 0.64, -0.28, 0], [0.16, 0.17, 0.16]);
  }
  const pack = mat('#6d8764');
  add(variants.gravi, pack, [0, 0.78, -0.67], [0.47, 0.5, 0.2]);
  for (const sign of [-1, 1])
    add(variants.gravi, pack, [sign * 0.53, 0.82, -0.1], [0.045, 0.43, 0.55]);
  add(variants.gravi, cream, [0, 0.85, -0.88], [0.22, 0.16, 0.035]);
  const sprout = add(
    variants.gravi,
    green,
    [0.04, 1.75, 0],
    [0.12, 0.24, 0.05],
  );
  sprout.rotation.z = -0.4;
  add(variants.gravi, green, [-0.1, 1.77, 0], [0.1, 0.2, 0.05]).rotation.z =
    0.5;
  const moss = mat(CHARACTERS.mimo.color);
  for (const sign of [-1, 1]) {
    add(variants.mimo, moss, [sign * 0.51, 1.5, -0.03], [0.23, 0.23, 0.18]);
    for (let n = 0; n < 3; n++)
      add(
        variants.mimo,
        moss,
        [sign * (0.58 + n * 0.03), 0.45 + n * 0.24, -0.03],
        [0.29, 0.24, 0.59],
      );
  }
  const leaves = new THREE.Group();
  variants.mimo.add(leaves);
  for (let i = -1; i <= 1; i++) {
    const leaf = add(
      leaves,
      green,
      [i * 0.21, 1.76 - Math.abs(i) * 0.06, 0],
      [0.13, 0.27, 0.065],
    );
    leaf.rotation.z = -i * 0.6;
  }
  const lavender = mat(CHARACTERS.pipo.color);
  for (const sign of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.52, 5), lavender);
    ear.position.set(sign * 0.52, 1.55, -0.02);
    ear.rotation.z = -sign * 0.45;
    variants.pipo.add(ear);
  }
  const curl = curve(
    variants.pipo,
    [
      [0, 1.61, 0],
      [0.25, 1.82, 0],
      [0.27, 2.02, 0],
      [0.08, 2.1, 0],
      [-0.02, 1.98, 0],
    ],
    0.115,
    lavender,
  );
  let selected = characterId(initial);
  const setCharacter = (id: string) => {
    selected = characterId(id);
    const config = CHARACTERS[selected as keyof typeof CHARACTERS];
    skin.color.set(config.color);
    footMaterial.color.set(config.feet);
    Object.entries(variants).forEach(([key, g]) => {
      g.visible = key === selected;
    });
    mouth.rotation.z = Math.PI + (selected === 'pipo' ? -0.18 : 0);
    pet.userData.character = selected;
  };
  setCharacter(initial);
  const animate = (
    time: number,
    speed: number,
    grounded: boolean,
    reduced: boolean,
  ) => {
    const amount = reduced ? 0 : Math.min(1, speed / 4);
    ears.forEach((ear, i) => {
      ear.rotation.z = (i ? 1 : -1) * Math.sin(time * 8) * amount * 0.14;
    });
    leaves.rotation.z = reduced ? 0 : Math.sin(time * 1.6) * 0.05;
    curl.rotation.z = reduced ? 0 : Math.sin(time * 3) * 0.025;
    // Personality lives in the gesture, while all support heights stay identical.
    body.rotation.z =
      reduced || !grounded
        ? 0
        : selected === 'pipo'
          ? Math.sin(time * (speed > 0.2 ? 10 : 2)) * 0.05
          : selected === 'mimo'
            ? Math.sin(time * 1.5) * 0.025
            : 0;
  };
  return {
    pet,
    body,
    eyes,
    arms,
    feet,
    mouth,
    surprisedMouth,
    setCharacter,
    animate,
  };
}
