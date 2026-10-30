import { AWAKENINGS, awakeningTarget, finaleUnlocked } from './awakening.mjs';
import { normalizeDirection, surfaceDistance } from './planet-world.mjs';

// What each family of adventures asks from the player, shown in the mission
// card and the explorer's notebook.
export const ADVENTURE_KINDS = [
  {
    category: 'Descubrir',
    icon: '✿',
    summary: 'Encuentra un lugar especial y usa la gravedad adecuada allí.',
  },
  {
    category: 'Recorrer',
    icon: '➶',
    summary: 'Sigue un camino de señales, una tras otra, hasta el final.',
  },
  {
    category: 'Saltar',
    icon: '⤒',
    summary:
      'Sube por plataformas; si caes al suelo, vuelves al primer peldaño.',
  },
];

/** Closest adventure still asleep (the finale only once it is unlocked). */
export function nearestOpenAdventure(forest) {
  if (!forest) return null;
  const here = normalizeDirection(forest.position);
  let best = null;
  for (const item of AWAKENINGS) {
    if (forest.completed.includes(item.id)) continue;
    if (item.id === 'journey' && !finaleUnlocked(forest)) continue;
    const target = awakeningTarget(item.id, forest);
    if (!target) continue;
    const distance = surfaceDistance(
      here,
      normalizeDirection(target.direction),
    );
    if (!best || distance < best.distance)
      best = {
        id: item.id,
        title: item.title,
        category: item.category,
        distance,
      };
  }
  return best;
}
