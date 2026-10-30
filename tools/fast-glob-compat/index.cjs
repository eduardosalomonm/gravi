'use strict';
// oxlint-disable-next-line typescript/no-require-imports -- The upstream plugin also consumes this adapter through CommonJS.
const tinyglobby = require('tinyglobby');

// vite-plugin-dynamic-import 1.6 uses only sync(patterns, { cwd }). Replace
// that dependency edge while braces has no patched release (GHSA-vfj7-8cjw-p6xm).
// This is a deliberately bounded adapter, not a complete fast-glob reimplementation.
function checked(patterns, options = {}) {
  const items = typeof patterns === 'string' ? [patterns] : patterns;
  if (!Array.isArray(items))
    throw new TypeError('Expected glob pattern strings');
  for (const pattern of items) {
    if (typeof pattern !== 'string')
      throw new TypeError('Expected a glob pattern string');
    if (pattern.length > 4096)
      throw new RangeError('Glob pattern exceeds 4096 characters');
    let depth = 0;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '\\') {
        i++;
        continue;
      }
      if (pattern[i] === '{' && ++depth > 32)
        throw new RangeError('Glob nesting exceeds 32 levels');
      if (pattern[i] === '}' && depth > 0) depth--;
    }
  }
  for (const option of Object.keys(options)) {
    if (option !== 'cwd')
      throw new TypeError(
        `Unsupported fast-glob compatibility option: ${option}`,
      );
  }
  // fast-glob does not implicitly expand directory patterns.
  return { ...options, expandDirectories: false, onlyFiles: true };
}
/** @param {string | string[]} patterns @param {{cwd?: string}} [options] */
function fastGlob(patterns, options) {
  return tinyglobby.glob(patterns, checked(patterns, options));
}
/** @param {string | string[]} patterns @param {{cwd?: string}} [options] */
function sync(patterns, options) {
  return tinyglobby.globSync(patterns, checked(patterns, options));
}
fastGlob.sync = sync;
module.exports = fastGlob;
