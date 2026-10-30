import {
  AWAKENINGS,
  awakeningTarget,
  finaleUnlocked,
  RIVER_STOPS,
} from './awakening.mjs';
import { FINALE_FLOWERS } from './finale-course.mjs';
import {
  normalizeDirection,
  surfaceDistance,
  PLANET_RADIUS,
} from './planet-world.mjs';

// Step-by-step explanation shown when Gravi arrives at an adventure. Every text
// mirrors the real rule in awakening.mjs / finale-course.mjs.

const GRAVITY = {
  Cero: 0,
  Luna: 1.62,
  Marte: 3.71,
  Tierra: 9.81,
  Júpiter: 24.79,
};
const byValue = (value) =>
  Object.entries(GRAVITY).find(([, v]) => Math.abs(v - value) < 0.2)?.[0] ??
  null;

/** Distance (m over the surface) at which the explanation appears. */
export const GUIDE_RADIUS = 10;

const list = (count, done, label) =>
  Array.from({ length: count }, (_, i) => ({
    text: label(i),
    done: i < done,
  }));

function describe(id, forest) {
  const here = normalizeDirection(forest.position);
  switch (id) {
    case 'flowers':
      return {
        goal: 'Las flores del claro se abren cuando pesan poco.',
        steps: [
          {
            text: 'Ponte en medio del claro de flores',
            // Same 2.5 m radius the challenge itself uses.
            done:
              forest.flowerTime > 0 ||
              surfaceDistance(
                here,
                normalizeDirection(AWAKENINGS[0].direction),
              ) < 2.5,
          },
          { text: 'Con Luna, quédate quieto 1,5 segundos', done: false },
        ],
        gravity: 'Luna',
        status: forest.flowerTime > 0 ? 'Las flores se están abriendo…' : '',
      };
    case 'petals':
      return {
        goal: 'Pisa los cuatro grupos de pétalos en orden, desde la entrada.',
        steps: list(4, forest.petalStep, (i) => `Grupo de pétalos ${i + 1}`),
        gravity: null,
        status: 'Cada grupo cambia de color al pisarlo.',
      };
    case 'sky':
      return {
        goal: 'Sube cuatro peldaños aterrizando en cada uno, de abajo arriba.',
        steps: list(
          4,
          forest.skyStep,
          (i) => `Aterriza en el peldaño ${i + 1}`,
        ),
        gravity: 'Luna',
        status:
          'Si tocas el suelo, vuelves al primer peldaño. El aro claro marca el siguiente.',
      };
    case 'jupiter': {
      const stones = forest.stones ?? [];
      return {
        goal: 'El peso de Júpiter despierta tres semillas de piedra y el círculo.',
        steps: [
          ...[0, 1, 2].map((i) => ({
            text: `Semilla ${i + 1}: quédate 1 s sobre su luz`,
            done: stones.includes(i),
          })),
          {
            text: 'Vuelve al centro del círculo y quédate 1,5 s',
            done: false,
          },
        ],
        gravity: 'Júpiter',
        status:
          forest.stoneTime > 0
            ? 'El círculo está despertando…'
            : 'Las semillas se pueden despertar en cualquier orden.',
      };
    }
    case 'lanterns':
      return {
        goal: 'Enciende los cuatro faroles pasando junto a ellos, en orden.',
        steps: list(4, forest.lanternStep, (i) => `Farol ${i + 1}`),
        gravity: null,
        status: 'Empieza por el farol de la entrada de la senda.',
      };
    case 'ridge':
      return {
        goal: 'Enlaza tres cornisas saltando de una a otra sin tocar el suelo.',
        steps: list(
          3,
          forest.ridgeStep,
          (i) => `Aterriza en la cornisa ${i + 1}`,
        ),
        gravity: 'Marte',
        status:
          'Suelta el joystick en el aire para frenar. Si caes al suelo, vuelves a la primera.',
      };
    case 'reflection': {
      const order = ['Luna', 'Tierra', 'Júpiter'];
      return {
        goal: 'Tres espejos, cada uno con su gravedad, de ligera a pesada.',
        steps: order.map((name, i) => ({
          text: `Espejo ${i + 1}: quédate 1 s con ${name}`,
          done: i < forest.reflectionStep,
        })),
        gravity: order[Math.min(2, forest.reflectionStep)],
        status: 'Cambia la gravedad al llegar a cada espejo.',
      };
    }
    case 'river':
      return {
        goal: 'Sigue los cinco remolinos del río; dos están sobre rocas.',
        steps: list(5, forest.riverStep, (i) =>
          RIVER_STOPS[i].height > 0
            ? `Remolino ${i + 1}: salta y aterriza en la roca`
            : `Remolino ${i + 1}: pasa por encima`,
        ),
        gravity: 'Luna',
        status: 'Cada remolino guarda tu avance.',
      };
    case 'wind':
      return {
        goal: 'Sube cinco peldaños estrechos aterrizando en cada uno.',
        steps: list(5, forest.windStep, (i) =>
          i === 2
            ? 'Peldaño 3 · terraza: guarda tu avance'
            : `Aterriza en el peldaño ${i + 1}`,
        ),
        gravity: 'Luna',
        status:
          'Si caes antes de la terraza, vuelves al primero; después, al cuarto.',
      };
    case 'journey': {
      if (!finaleUnlocked(forest)) {
        const missing = AWAKENINGS.filter(
          (a) => a.id !== 'journey' && !forest.completed.includes(a.id),
        ).length;
        return {
          goal: 'El gran final combina todo lo aprendido.',
          steps: [
            {
              text: `Despierta los otros nueve sakuras (faltan ${missing})`,
              done: false,
            },
          ],
          gravity: null,
          status: 'Vuelve cuando los nueve hayan florecido.',
        };
      }
      const f = forest.finale;
      const flowerNames = FINALE_FLOWERS.map((flower) =>
        byValue(flower.gravity),
      );
      const steps = [
        ...flowerNames.map((name, i) => ({
          text: `Flor ${i + 1}: quédate 1 s con ${name}`,
          done: f.stage > 0 || i < f.flower,
        })),
        {
          text: `Sigue las 4 señales de pétalos (${f.stage > 1 ? 4 : f.stage === 1 ? f.path : 0}/4)`,
          done: f.stage > 1,
        },
        {
          text: `Sube 3 plataformas; la última con Luna o Marte (${f.stage > 2 ? 3 : f.stage === 2 ? f.jump : 0}/3)`,
          done: f.stage > 2,
        },
      ];
      return {
        goal: 'Tres etapas: descubrir, recorrer y saltar. Cada etapa queda guardada.',
        steps,
        gravity:
          f.stage === 0
            ? flowerNames[Math.min(2, f.flower)]
            : f.stage === 2 && f.jump === 2
              ? 'Marte'
              : null,
        status: f.stage === 2 ? 'Si caes, repites solo los saltos.' : '',
      };
    }
    default:
      return null;
  }
}

/**
 * Explanation for the adventure Gravi is standing next to, or null.
 * Completed adventures and far-away ones are ignored.
 */
export function challengeGuide(forest, gravity, helpLevels = {}) {
  if (!forest) return null;
  const here = normalizeDirection(forest.position);
  const altitude =
    Math.hypot(forest.position.x, forest.position.y, forest.position.z) -
    PLANET_RADIUS;
  if (altitude > 12) return null;
  let best = null;
  for (const item of AWAKENINGS) {
    if (forest.completed.includes(item.id)) continue;
    const target = awakeningTarget(item.id, forest);
    const distance = Math.min(
      surfaceDistance(here, normalizeDirection(item.direction)),
      target
        ? surfaceDistance(here, normalizeDirection(target.direction))
        : Infinity,
    );
    if (distance <= GUIDE_RADIUS && (!best || distance < best.distance))
      best = { item, distance };
  }
  if (!best) return null;
  const detail = describe(best.item.id, forest);
  if (!detail) return null;
  const discovery = ['flowers', 'jupiter', 'reflection'].includes(best.item.id);
  const helpLevel =
    typeof helpLevels === 'number'
      ? best.item.id === 'flowers'
        ? helpLevels
        : 0
      : (helpLevels[best.item.id] ?? 0);
  // Discovery starts with a clue. The exact recipe is always one more tap away.
  if (best.item.id === 'flowers' && helpLevel < 2) {
    detail.goal = 'Estas flores parecen querer despegar.';
    detail.steps = [
      {
        text:
          helpLevel === 0
            ? 'Acércate y observa cómo responden al cambiar la gravedad.'
            : 'Prueba una gravedad suave, sin llegar a Cero. Descansa entre las flores.',
        done: false,
      },
    ];
    detail.gravity = null;
    detail.status =
      forest.flowerTime > 0
        ? 'Sigue así… el claro está despertando.'
        : gravity === 0
          ? 'Sin peso flotan, pero necesitan sentir un poco el suelo.'
          : gravity > 0 && gravity <= 2
            ? 'Los pétalos se estiran. Acércate al centro y descansa.'
            : '';
  }
  if (best.item.id === 'jupiter' && helpLevel < 2) {
    detail.goal = 'Bajo las piedras late algo que quiere despertar.';
    detail.steps = [
      {
        text:
          helpLevel === 0
            ? 'Escucha las semillas. ¿Qué sucede si pesas más?'
            : 'Busca la gravedad más pesada y descansa junto a cada luz. Después vuelve al círculo.',
        done: false,
      },
    ];
    detail.gravity = null;
    detail.status = `${forest.stones?.length ?? 0}/3 semillas despiertas${gravity >= 24 ? ' · Las piedras sienten tu peso.' : ''}`;
  }
  if (best.item.id === 'reflection' && helpLevel < 2) {
    detail.goal = 'Cada espejo guarda un cielo con un peso distinto.';
    detail.steps = [
      {
        text:
          helpLevel === 0
            ? 'Empieza por el espejo iluminado. Prueba qué cielo reconoce.'
            : 'Avanza de ligero a pesado: un cielo lunar, tu hogar y un gigante. Descansa en cada reflejo.',
        done: false,
      },
    ];
    detail.gravity = null;
    detail.status = `${forest.reflectionStep ?? 0}/3 reflejos despiertos${forest.reflectionTime > 0 ? ' · El cielo te reconoce…' : ''}`;
  }
  const firstOpen = detail.steps.findIndex((step) => !step.done);
  return {
    hintLevel: discovery ? Math.min(2, helpLevel) : null,
    id: best.item.id,
    title: best.item.title,
    category: best.item.category,
    level: best.item.level,
    ...detail,
    steps: detail.steps.map((step, i) => ({
      ...step,
      current: i === firstOpen,
    })),
    gravityValue: detail.gravity ? GRAVITY[detail.gravity] : null,
    gravityOk: detail.gravity
      ? Math.abs(gravity - GRAVITY[detail.gravity]) < 0.2
      : true,
  };
}
