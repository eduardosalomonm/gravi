'use client';
import { CHARACTERS } from '../lib/characters.mjs';
import { GraviMascot } from './gravi-mascot';
export function CharacterPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset className="character-picker">
      <legend>¿Quién viene contigo?</legend>
      <div className="character-options">
        {Object.entries(CHARACTERS).map(([id, config]) => (
          <button
            key={id}
            type="button"
            aria-pressed={selected === id}
            aria-label={`Elegir a ${config.name}`}
            onClick={() => onSelect(id)}
          >
            <GraviMascot character={id} />
            <b>{config.name}</b>
            <small>
              {id === 'gravi'
                ? 'Explorador'
                : id === 'mimo'
                  ? 'Tranquilo'
                  : 'Travieso'}
            </small>
          </button>
        ))}
      </div>
      <p aria-live="polite">
        {CHARACTERS[selected as keyof typeof CHARACTERS].description}
      </p>
    </fieldset>
  );
}
