import { characterId } from './characters.mjs';
import { CHALLENGES } from './challenges.mjs';
import { MAX_GRAVITY } from './physics.mjs';
import { PLANET_SECRETS } from './planet-secrets.mjs';
import { createAwakeningState } from './awakening.mjs';
import { cleanExploration } from './exploration.mjs';
export const SAVE_KEY = 'gravi.progress.v1';
/** @returns {{completed: boolean[], planetSecrets: string[], explored: string[], awakenings: {completed: string[], discovered: string[], visitedRegions: string[], finaleStage: number}, gravity: number, personality: string, character: string, bestRace: number | null, tutorialDone: boolean, hasChosenWorld: boolean, preferredMode: 'planet' | 'practice'}} */
export function defaultProgress() {
  return {
    completed: CHALLENGES.map(() => false),
    planetSecrets: [],
    explored: [],
    awakenings: {
      completed: [],
      discovered: [],
      visitedRegions: [],
      finaleStage: 0,
    },
    gravity: 9.81,
    personality: 'curious',
    character: 'gravi',
    bestRace: null,
    tutorialDone: false,
    hasChosenWorld: false,
    preferredMode: 'planet',
  };
}
export function decodeProgress(raw) {
  const defaults = defaultProgress();
  try {
    const data = JSON.parse(raw);
    if (
      !data ||
      ![1, 2, 3, 4, 5, 6, 7].includes(data.version) ||
      !Array.isArray(data.achievements)
    )
      return defaults;
    return {
      completed: CHALLENGES.map((c) => data.achievements.includes(c.id)),
      explored: data.version >= 6 ? cleanExploration(data.explored) : [],
      planetSecrets:
        data.version >= 3 && Array.isArray(data.planetSecrets)
          ? PLANET_SECRETS.filter((secret) =>
              data.planetSecrets.includes(secret.id),
            ).map((secret) => secret.id)
          : [],
      awakenings: (() => {
        const normalized = createAwakeningState(
          data.version >= 4
            ? {
                finaleStage: data.awakenings?.finaleStage,
                visitedRegions: Array.isArray(data.awakenings?.visitedRegions)
                  ? data.awakenings.visitedRegions
                  : [],
                completed: Array.isArray(data.awakenings?.completed)
                  ? data.awakenings.completed
                  : [],
                discovered: Array.isArray(data.awakenings?.discovered)
                  ? data.awakenings.discovered
                  : [],
              }
            : {},
        );
        return {
          completed: normalized.completed,
          discovered: normalized.discovered,
          visitedRegions: normalized.visitedRegions,
          finaleStage: normalized.finale.stage,
        };
      })(),
      gravity:
        typeof data.gravity === 'number' &&
        Number.isFinite(data.gravity) &&
        data.gravity >= 0 &&
        data.gravity <= MAX_GRAVITY
          ? data.gravity
          : defaults.gravity,
      character: characterId(data.character),
      personality: ['curious', 'cuddly', 'cheeky'].includes(data.personality)
        ? data.personality
        : defaults.personality,
      bestRace:
        typeof data.bestRace === 'number' &&
        data.bestRace > 0 &&
        data.bestRace <= 30
          ? data.bestRace
          : null,
      tutorialDone: data.version >= 2 && data.tutorialDone === true,
      hasChosenWorld: data.version >= 2 && data.hasChosenWorld === true,
      preferredMode:
        data.version >= 2 && data.preferredMode === 'practice'
          ? 'practice'
          : 'planet',
    };
  } catch {
    return defaults;
  }
}
export function loadProgress(storage) {
  try {
    return decodeProgress(storage.getItem(SAVE_KEY));
  } catch {
    return defaultProgress();
  }
}
function encodeProgress(progress) {
  return JSON.stringify({
    version: 7,
    explored: cleanExploration(progress.explored),
    awakenings: progress.awakenings,
    achievements: CHALLENGES.filter(
      (_, i) => progress.completed[i] === true,
    ).map((c) => c.id),
    planetSecrets: PLANET_SECRETS.filter(
      (secret) =>
        Array.isArray(progress.planetSecrets) &&
        progress.planetSecrets.includes(secret.id),
    ).map((secret) => secret.id),
    gravity: progress.gravity,
    personality: progress.personality,
    character: characterId(progress.character),
    bestRace: progress.bestRace,
    tutorialDone: progress.tutorialDone === true,
    hasChosenWorld: progress.hasChosenWorld === true,
    preferredMode:
      progress.preferredMode === 'practice' ? 'practice' : 'planet',
  });
}
export function saveProgress(storage, progress) {
  try {
    storage.setItem(SAVE_KEY, encodeProgress(progress));
    return true;
  } catch {
    return false;
  }
}

/** A stale tab must reload instead of replacing a newer save, including resets. */
export function createProgressSession(storage) {
  let raw = null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    // Storage denial still allows an unsaved visit.
  }
  return {
    progress: decodeProgress(raw),
    isStale() {
      try {
        return storage.getItem(SAVE_KEY) !== raw;
      } catch {
        return false;
      }
    },
    save(progress) {
      try {
        if (storage.getItem(SAVE_KEY) !== raw) return 'conflict';
        const next = encodeProgress(progress);
        storage.setItem(SAVE_KEY, next);
        raw = next;
        return 'saved';
      } catch {
        return 'unavailable';
      }
    },
  };
}
