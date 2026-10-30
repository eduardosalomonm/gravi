import { PRESETS } from './physics.mjs';

// Shared gravity presets. Mobile uses explicit tap-to-select buttons; G cycles
// on desktop.

export const WHEEL_OPTIONS = Object.entries(PRESETS).map(([name, value]) => ({
  name,
  value,
}));

/**
 * Symbol shown for each preset on the wheel, the button and the desktop bar.
 * @type {Record<string, string>}
 */
export const GRAVITY_ICONS = {
  Cero: '∞',
  Luna: '☾',
  Marte: '●',
  Tierra: '◉',
  Júpiter: '♃',
};

/** Next preset for a short tap. Custom values jump to the next larger preset. */
export function nextPreset(gravity) {
  const next = WHEEL_OPTIONS.find((option) => option.value > gravity + 0.001);
  return (next ?? WHEEL_OPTIONS[0]).value;
}

/** Nearest preset name for an exact value, or null for custom gravity. */
export function presetName(gravity) {
  return WHEEL_OPTIONS.find((option) => option.value === gravity)?.name ?? null;
}
