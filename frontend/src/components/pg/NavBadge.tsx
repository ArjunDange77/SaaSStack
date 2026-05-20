interface Props {
  count: number;
}

export function NavBadge({ count }: Props) {
  if (count <= 0) return null;
  return (
    <span className="nav-badge" aria-label={`${count} pending`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
