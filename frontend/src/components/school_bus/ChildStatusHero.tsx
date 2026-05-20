import type { SbHeroLevel, SbHeroStatus } from "@/hooks/useSchoolBus";

export function ChildStatusHero({ status }: { status: SbHeroStatus }) {
  const level: SbHeroLevel = status.level;
  return (
    <section className={`sb-child-hero sb-child-hero--${level}`} aria-live="polite">
      <h2 className="sb-child-hero-headline">{status.headline}</h2>
      {status.detail ? <p className="sb-child-hero-detail">{status.detail}</p> : null}
    </section>
  );
}
