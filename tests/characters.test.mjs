import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import * as THREE from 'three';
import { CHARACTERS, characterId } from '../lib/characters.mjs';
import {
  decodeProgress,
  defaultProgress,
  saveProgress,
} from '../lib/progress.mjs';

// Exercise the actual shared render model without a browser or WebGL context.
const source = await readFile(
  new URL('../lib/character-model.ts', import.meta.url),
  'utf8',
);
const code = stripTypeScriptTypes(source)
  .replace("from 'three'", `from '${import.meta.resolve('three')}'`)
  .replace(
    "from './characters.mjs'",
    `from '${new URL('../lib/characters.mjs', import.meta.url)}'`,
  );
const { createCharacter } = await import(
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
);

test('companions share foot placement and switching changes no world transform', () => {
  const materials = [],
    model = createCharacter(materials, 'gravi');
  model.pet.position.set(2, 36, -3);
  const original = model.pet.position.clone(),
    feet = model.feet.map((f) => f.position.toArray());
  for (const id of Object.keys(CHARACTERS)) {
    model.setCharacter(id);
    model.animate(2, 3, true, false);
    assert.deepEqual(model.pet.position, original);
    assert.deepEqual(
      model.feet.map((f) => f.position.toArray()),
      feet,
    );
    assert.equal(model.pet.userData.character, id);
    assert.equal(
      model.body.children.filter((n) => n instanceof THREE.Group && n.visible)
        .length,
      1,
    );
    assert.equal(
      model.arms[0].material.color.getHexString(),
      CHARACTERS[id].color.slice(1),
    );
  }
  const geometry = new Set();
  model.pet.traverse((n) => {
    if (n.geometry) geometry.add(n.geometry);
  });
  geometry.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
});

test('all three choices persist without changing sakuras, checkpoints or exploration', () => {
  for (const id of Object.keys(CHARACTERS)) {
    let raw;
    const progress = defaultProgress();
    progress.character = id;
    progress.awakenings.completed = ['flowers', 'wind'];
    progress.awakenings.discovered = ['flowers', 'wind'];
    progress.awakenings.finaleStage = 2;
    progress.hasChosenWorld = true;
    saveProgress({ setItem: (_, value) => (raw = value) }, progress);
    assert.deepEqual(decodeProgress(raw), progress);
  }
});

test('old saves choose Gravi and preserve prior achievements and personality', () => {
  const old = {
    version: 7,
    achievements: ['star'],
    gravity: 3.71,
    personality: 'cheeky',
    awakenings: { completed: ['flowers', 'wind'], finaleStage: 1 },
  };
  const result = decodeProgress(JSON.stringify(old));
  assert.equal(result.character, 'gravi');
  assert.equal(result.personality, 'cheeky');
  assert.deepEqual(result.awakenings.completed, old.awakenings.completed);
  assert.equal(result.awakenings.finaleStage, 1);
  for (const value of ['bad', null, {}, [], 'constructor', '__proto__'])
    assert.equal(characterId(value), 'gravi');
});
