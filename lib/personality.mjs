export const PERSONALITIES = {
  curious: 'Curioso y juguetón',
  cuddly: 'Dulce y tranquilo',
  cheeky: 'Travieso y teatral',
};
export function reactionPose(
  event,
  remaining,
  personality = 'curious',
  reducedMotion = false,
) {
  const energy =
    personality === 'cuddly' ? 0.6 : personality === 'cheeky' ? 1.25 : 1;
  if (reducedMotion)
    return {
      stretch: 1,
      arm: 0,
      eyes: event === 'float' ? 1.12 : 1,
      surprise: event === 'float',
    };
  const strength = Math.min(1, Math.max(0, remaining) * 3) * energy;
  return {
    stretch:
      event === 'land'
        ? 1 - 0.2 * strength
        : event === 'jump'
          ? 1 + 0.12 * strength
          : 1,
    arm: ['float', 'celebrate'].includes(event) ? 0.85 * strength : 0,
    eyes: event === 'float' ? 1.2 : 1,
    surprise: event === 'float',
  };
}
