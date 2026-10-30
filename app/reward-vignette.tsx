/** A small memory of the permanent change, revealed only after completion. */
export function RewardVignette({ id, label }: { id: string; label: string }) {
  const lights = ['petals', 'lanterns', 'river'].includes(id);
  const high = ['sky', 'ridge', 'wind', 'journey'].includes(id);
  return (
    <svg className="reward-vignette" viewBox="0 0 280 100" aria-label={label}>
      <title>{label}</title>
      <rect
        width="280"
        height="100"
        rx="16"
        fill={id === 'lanterns' ? '#344f55' : '#e4eddb'}
      />
      <path d="M0 90Q70 62 140 80T280 78V100H0" fill="#9bb58b" />
      {high && (
        <g fill="#9aa58d">
          <path d="M30 90V64H75V90M100 90V46H143V90M166 90V27H210V90" />
          {[35, 120, 192].map((x, i) => (
            <circle key={x} cx={x} cy={55 - i * 18} r="4" fill="#fff1bd" />
          ))}
        </g>
      )}
      {lights && (
        <>
          <path
            d={
              id === 'river'
                ? 'M30 90Q65 85 100 57T180 25'
                : 'M20 90Q100 25 185 85'
            }
            fill="none"
            stroke="#e9cf85"
            strokeWidth="4"
            strokeDasharray={id === 'petals' ? '5 7' : undefined}
          />
          {[30, 75, 125, 172].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={id === 'river' ? 85 - i * 18 : 70 + (i % 2) * 10}
              r="4"
              fill="#fff1af"
            />
          ))}
        </>
      )}
      {id === 'reflection' && (
        <ellipse cx="90" cy="82" rx="58" ry="10" fill="#8fc4cd" />
      )}
      {['reflection', 'wind', 'sky', 'journey'].includes(id) && (
        <g fill={id === 'journey' ? '#d4a747' : '#fff5cc'}>
          {[30, 70, 110, 150].map((x, i) => (
            <path
              key={x}
              d={`M${x} ${13 + (i % 2) * 12}l3 6 6 2-6 2-3 6-2-6-6-2 6-2z`}
            />
          ))}
        </g>
      )}
      <path
        d="M233 88V48M233 60L215 42M233 52L251 35"
        stroke="#74604d"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <g fill={id === 'journey' ? '#f4d389' : '#eaa5b2'}>
        <ellipse cx="213" cy="39" rx="20" ry="12" />
        <ellipse cx="237" cy="32" rx="25" ry="14" />
        <ellipse cx="254" cy="43" rx="19" ry="12" />
      </g>
      {['flowers', 'jupiter', 'ridge'].includes(id) && (
        <g fill={id === 'jupiter' ? '#e0b454' : '#f4b6c4'}>
          {[25, 55, 85, 120, 150, 180].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 88v-8`} stroke="#6e8a63" strokeWidth="2" />
              <circle cx={x} cy={78 - (i % 2) * 4} r="4" />
            </g>
          ))}
        </g>
      )}
      {id === 'flowers' && (
        <g fill="#e8ce85">
          <ellipse
            cx="80"
            cy="48"
            rx="5"
            ry="3"
            transform="rotate(-30 80 48)"
          />
          <ellipse cx="88" cy="48" rx="5" ry="3" transform="rotate(30 88 48)" />
        </g>
      )}
    </svg>
  );
}
