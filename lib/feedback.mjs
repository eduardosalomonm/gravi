// Pure detection of the moments that deserve a sound or a vibration.
// The game loop compares two snapshots of the simulation; nothing here touches
// audio, so the rules can be tested without a browser.

/** Sum of every partial step shown by the adventures, used for progress chimes. */
export function progressSteps(awakenings) {
  if (!awakenings) return 0;
  const finale = awakenings.finale ?? {};
  return (
    (awakenings.petalStep ?? 0) +
    (awakenings.skyStep ?? 0) +
    (awakenings.ridgeStep ?? 0) +
    (awakenings.lanternStep ?? 0) +
    (awakenings.windStep ?? 0) +
    (awakenings.riverStep ?? 0) +
    (awakenings.reflectionStep ?? 0) +
    (awakenings.stones?.length ?? 0) +
    (finale.flower ?? 0) +
    (finale.path ?? 0) +
    (finale.jump ?? 0)
  );
}

/**
 * @param {{jumps: number, grounded: boolean, impact: number, steps: number, completed: number}} before
 * @param {{jumps: number, grounded: boolean, impact: number, steps: number, completed: number}} after
 * @returns {{type: 'jump' | 'land' | 'progress' | 'bloom', strength?: number}[]}
 */
export function feedbackEvents(before, after) {
  const events = [];
  if (after.jumps > before.jumps) events.push({ type: 'jump' });
  if (!before.grounded && after.grounded) {
    // Impact speed in m/s mapped to 0–1: 2 m/s is a gentle hop, 14 m/s a hard fall.
    const strength = Math.min(1, Math.max(0, (after.impact - 2) / 12));
    events.push({ type: 'land', strength });
  }
  if (after.completed > before.completed) events.push({ type: 'bloom' });
  else if (after.steps > before.steps) events.push({ type: 'progress' });
  return events;
}

/** Interval between footsteps for a ground speed in m/s; null when standing. */
export function footstepInterval(speed) {
  if (!(speed > 0.6)) return null;
  return Math.max(0.2, 0.42 - speed * 0.035);
}
