import { CHARACTERS, characterId } from '../lib/characters.mjs';

/** Matching silhouettes for the chooser; the worlds use character-model.ts. */
export function GraviMascot({
  className = '',
  character = 'gravi',
}: {
  className?: string;
  character?: string;
}) {
  const id = characterId(character),
    c = CHARACTERS[id as keyof typeof CHARACTERS];
  return (
    <svg
      className={`gravi-mascot ${className}`}
      viewBox="0 0 220 230"
      aria-hidden="true"
    >
      <ellipse className="mascot-shadow" cx="110" cy="213" rx="63" ry="9" />
      <g
        className="mascot-body"
        stroke="#2b4a44"
        strokeWidth="3"
        strokeLinejoin="round"
      >
        {id === 'gravi' && (
          <>
            <rect
              x="42"
              y="88"
              width="134"
              height="89"
              rx="30"
              fill="#6d8764"
            />
            <path
              d="M65 58Q34 27 9 87Q29 111 66 79M155 58Q186 27 211 87Q191 111 154 79"
              fill={c.color}
            />
          </>
        )}
        {id === 'mimo' && (
          <>
            <circle cx="65" cy="65" r="22" fill={c.color} />
            <circle cx="155" cy="65" r="22" fill={c.color} />
          </>
        )}
        {id === 'pipo' && (
          <>
            <path
              d="M55 77L47 27Q77 30 87 61M133 61Q146 31 174 33L163 80"
              fill={c.color}
            />
            <path
              d="M104 62C158 37 144 0 115 13C97 21 116 41 125 27C144 56 116 53 104 62Z"
              fill={c.color}
            />
          </>
        )}
        <ellipse cx="110" cy="130" rx="70" ry="76" fill={c.color} />
        {id === 'mimo' && (
          <g fill={c.color}>
            <circle cx="49" cy="124" r="20" />
            <circle cx="49" cy="153" r="22" />
            <circle cx="65" cy="178" r="22" />
            <circle cx="171" cy="124" r="20" />
            <circle cx="171" cy="153" r="22" />
            <circle cx="155" cy="178" r="22" />
          </g>
        )}
        {id !== 'pipo' && (
          <g fill={c.accent}>
            <path d="M111 61Q88 24 69 38Q71 61 111 61Z" />
            <path d="M111 61Q104 15 121 15Q141 41 111 61Z" />
            {id === 'mimo' && <path d="M112 61Q132 25 158 38Q150 66 112 61Z" />}
          </g>
        )}
        <ellipse
          cx="110"
          cy="156"
          rx="44"
          ry="35"
          fill="#fff5d7"
          stroke="none"
        />
        <ellipse
          cx="83"
          cy="117"
          rx="24"
          ry="29"
          fill="#fff5d7"
          stroke="none"
        />
        <ellipse
          cx="137"
          cy="117"
          rx="24"
          ry="29"
          fill="#fff5d7"
          stroke="none"
        />
        <g fill="#253c40" stroke="none">
          <ellipse className="mascot-eye" cx="85" cy="119" rx="12" ry="17" />
          <ellipse className="mascot-eye" cx="135" cy="119" rx="12" ry="17" />
        </g>
        <g fill="white" stroke="none">
          <circle cx="81" cy="112" r="4" />
          <circle cx="131" cy="112" r="4" />
        </g>
        <g fill="#f1a9b4" stroke="none">
          <ellipse cx="60" cy="146" rx="11" ry="6" />
          <ellipse cx="160" cy="146" rx="11" ry="6" />
        </g>
        <path
          d={
            id === 'pipo'
              ? 'M100 144Q114 159 123 139'
              : 'M101 144Q110 153 119 144'
          }
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="42" cy="161" rx="15" ry="23" fill={c.color} />
        <g className="mascot-wave">
          <ellipse
            cx="179"
            cy="140"
            rx="15"
            ry="23"
            fill={c.color}
            transform="rotate(25 179 140)"
          />
        </g>
        <ellipse cx="82" cy="203" rx="22" ry="11" fill={c.feet} />
        <ellipse cx="138" cy="203" rx="22" ry="11" fill={c.feet} />
      </g>
    </svg>
  );
}
