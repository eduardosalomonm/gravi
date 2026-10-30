import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// Resolve from the real consumer so this also verifies npm's scoped override.
const fromPlugin = createRequire(
  import.meta.resolve('vite-plugin-dynamic-import'),
);
const scan = fromPlugin('fast-glob');

test('build scanner resolves extension braces, nested modules and exclusions', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'gravi-glob-'));
  try {
    await mkdir(path.join(cwd, 'nested'));
    await mkdir(path.join(cwd, 'empty'));
    for (const file of [
      'one.js',
      'two.ts',
      'skip.js',
      '.hidden.js',
      'nested/index.js',
    ])
      await writeFile(path.join(cwd, file), 'export default 1;');
    const patterns = ['**/*.{js,ts}', '!skip.js'];
    const expected = ['nested/index.js', 'one.js', 'two.ts'];
    assert.deepEqual(scan.sync(patterns, { cwd }).sort(), expected);
    assert.deepEqual((await scan(patterns, { cwd })).sort(), expected);
    assert.deepEqual(scan.sync('empty', { cwd }), []);
    assert.deepEqual(scan.sync('missing/**/*.js', { cwd }), []);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('build scanner rejects pathological nested and oversized patterns before parsing', () => {
  assert.throws(
    () => scan.sync('{'.repeat(4000) + 'a' + '}'.repeat(4000)),
    /4096 characters/,
  );
  assert.throws(
    () => scan.sync('{'.repeat(33) + 'a' + '}'.repeat(33)),
    /32 levels/,
  );
  assert.throws(() => scan.sync(['*.js', 42]), /pattern string/);
  assert.throws(() => scan.sync('*.js', { objectMode: true }), /Unsupported/);
});
