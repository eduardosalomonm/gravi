/** Opening is a clue; only the existing grounded dwell rule awards the sakura. */
export function meadowResponse(gravity, flowerTime = 0, completed = false) {
  const weight = Math.max(0, Number.isFinite(gravity) ? gravity : 9.81);
  return {
    opening: completed
      ? 1
      : weight === 0
        ? 0.55
        : 0.2 + 0.8 * Math.max(0, 1 - weight / 12),
    progress: completed ? 1 : Math.max(0, Math.min(1, flowerTime / 1.5)),
    floating: !completed && weight === 0,
  };
}
