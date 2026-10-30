/** Optional browser-native controls; ordinary browsers do not need this API. */
import { MAX_GRAVITY } from './physics.mjs';
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => Promise<unknown>;
};
type Context = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerControls(
  setGravity: (g: number) => void,
  reset: () => void,
) {
  const context = (document as Document & { modelContext?: Context })
    .modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const rendered = () =>
    new Promise((resolve) => requestAnimationFrame(resolve));
  const tools: Tool[] = [
    {
      name: 'set_gravi_gravity',
      title: 'Cambiar la gravedad de Gravi',
      description: `Ajusta la gravedad entre 0 y ${MAX_GRAVITY} m/s². Conserva la posición y velocidad de Gravi.`,
      inputSchema: {
        type: 'object',
        properties: {
          gravity: { type: 'number', minimum: 0, maximum: MAX_GRAVITY },
        },
        required: ['gravity'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (
          !input ||
          typeof input !== 'object' ||
          Object.keys(input).length !== 1 ||
          !('gravity' in input)
        )
          throw new Error('Se requiere gravity.');
        const value = input.gravity;
        if (
          typeof value !== 'number' ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > MAX_GRAVITY
        )
          throw new Error(`gravity debe estar entre 0 y ${MAX_GRAVITY}.`);
        setGravity(value);
        await rendered();
        return { gravity: value };
      },
    },
    {
      name: 'reset_gravi_position',
      title: 'Devolver Gravi al inicio',
      description:
        'Devuelve a Gravi al suelo del inicio, elimina su velocidad y conserva los retos completados y la gravedad.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (
          !input ||
          typeof input !== 'object' ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          throw new Error('Se requiere un objeto vacío.');
        reset();
        await rendered();
        return { returnedToStart: true };
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* An optional preview API must never prevent playing. */
    }
  }
  return () => lifecycle.abort();
}
