export function SeatMapSkeleton() {
  return (
    <div className="seatmap-skeleton" aria-busy="true" aria-label="Loading seat map">
      <div className="seatmap-skeleton-nav" />
      <div className="seatmap-skeleton-grid" />
      <div className="seatmap-skeleton-panel" />
    </div>
  );
}
