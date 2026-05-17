export function SeatMapLegend() {
  return (
    <div className="legend" aria-label="Room color legend">
      <div className="l-item">
        <div className="l-sq l-sq-green" />
        Single · free
      </div>
      <div className="l-item">
        <div className="l-sq l-sq-blue" />
        Shared · free
      </div>
      <div className="l-item">
        <div className="l-sq l-sq-amber" />
        Partial
      </div>
      <div className="l-item">
        <div className="l-sq l-sq-gray" />
        Full
      </div>
    </div>
  );
}
