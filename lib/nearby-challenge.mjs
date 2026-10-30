import { STAR, PLATFORM, HOOP, RETURN_RING, ferryAt } from './physics.mjs';
export function nearbyChallenge(s, gravity) {
  const locations = [STAR, PLATFORM, HOOP, ferryAt(s.time), RETURN_RING];
  let index = -1,
    distance = 3.2;
  locations.forEach((p, i) => {
    const d = Math.hypot(s.x - p.x, s.z - p.z);
    if (d < distance) {
      distance = d;
      index = i;
    }
  });
  if (index < 0) return null;
  if (s.completed[index])
    return {
      number: index + 1,
      done: true,
      instruction: '¡Completado! Puedes elegir otro número.',
    };
  const instructions = [
    'Acerca a Gravi a la estrella dorada para recogerla.',
    'Pulsa Saltar y aterriza encima de la plataforma rosa.',
    gravity > 4
      ? 'Ponte en el círculo azul, cambia la gravedad a Luna y pulsa Saltar.'
      : 'Desde el círculo azul, pulsa Saltar y atraviesa el aro.',
    s.support === 'ferry'
      ? `¡Ya estás arriba! Quédate ${Math.max(0, 3 - s.rideTime).toFixed(1)} s más.`
      : 'Pulsa Saltar para subir a la plataforma verde y quédate 3 segundos.',
    s.returnArmed
      ? '¡Capturado! El aro te sostiene. Activa Marte y espera a aterrizar.'
      : 'Párate en el centro de la diana violeta, cambia a Cero y pulsa Saltar.',
  ];
  return { number: index + 1, done: false, instruction: instructions[index] };
}
