interface Props {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function FilterPill({ active, onClick, children }: Props) {
  return (
    <button type="button" className={`pill${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
