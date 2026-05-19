type Level = "safe" | "warning" | "danger";

export function MorningBriefingBanner({ level, message }: { level: Level; message: string }) {
  return (
    <div className={`sb-briefing-banner sb-briefing-banner--${level}`} role="status">
      {message}
    </div>
  );
}
