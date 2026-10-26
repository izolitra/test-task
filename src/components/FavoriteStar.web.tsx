type Props = { active: boolean };

const starPath =
  'M12 2.5 14.95 8.55 21.6 9.5 16.8 14.25 17.95 20.95 12 17.8 6.05 20.95 7.2 14.25 2.4 9.5 9.05 8.55Z';

export function FavoriteStar({ active }: Props) {
  const color = active ? 'var(--color-star-active)' : 'var(--color-star-inactive)';

  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d={starPath}
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
