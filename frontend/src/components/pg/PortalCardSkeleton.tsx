export function PortalCardSkeleton() {
  return (
    <div className="portal-card portal-card-skeleton" aria-hidden>
      <span className="skeleton-cell portal-skel-title" />
      <span className="skeleton-cell portal-skel-line" />
      <span className="skeleton-cell portal-skel-line short" />
    </div>
  );
}
