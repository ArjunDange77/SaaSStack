interface Props {
  title: string;
  subtitle?: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
}

export function MobileHeader({ title, subtitle, menuOpen, onMenuToggle }: Props) {
  return (
    <header className="mobile-header mobile-only">
      <button
        type="button"
        className="menu-toggle secondary"
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        onClick={onMenuToggle}
      >
        <span className="menu-icon" aria-hidden>
          {menuOpen ? "✕" : "☰"}
        </span>
      </button>
      <div className="mobile-header-titles">
        <span className="mobile-header-title">{title}</span>
        {subtitle && <span className="mobile-header-subtitle">{subtitle}</span>}
      </div>
    </header>
  );
}
