export const CHARACTERS = {
  gravi: {
    name: 'Gravi',
    variant: 'G3 · Orejitas',
    color: '#f38d77',
    feet: '#ce7660',
    accent: '#6d8764',
    personality: 'curious',
    description: 'Curioso y valiente. Siempre listo para explorar.',
  },
  mimo: {
    name: 'Mimo',
    variant: 'M2 · Musgo',
    color: '#a5b67b',
    feet: '#768b5e',
    accent: '#708b4f',
    personality: 'cuddly',
    description: 'Dulce y tranquilo. Le gusta observar el bosque.',
  },
  pipo: {
    name: 'Pipo',
    variant: 'P3 · Duende',
    color: '#b8a0d6',
    feet: '#8d76b1',
    accent: '#9679bd',
    personality: 'cheeky',
    description: 'Travieso y juguetón. Celebra cada descubrimiento.',
  },
};
export function characterId(value) {
  return typeof value === 'string' && Object.hasOwn(CHARACTERS, value)
    ? value
    : 'gravi';
}
