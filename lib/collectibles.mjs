/** A forgiving body-volume pickup test, rather than a distance to the pet's centre. */
export function touchesCollectible(player, target, itemRadius) {
  const closestY = Math.max(
    player.y + 0.25,
    Math.min(player.y + 1.35, target.y),
  );
  return (
    Math.hypot(player.x - target.x, player.z - target.z, closestY - target.y) <=
    0.7 + itemRadius + 0.15
  );
}
