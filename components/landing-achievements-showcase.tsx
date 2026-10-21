import { T } from "@/components/i18n";

const badgeSlots = Array.from({ length: 5 }, (_, index) => ({ id: `landing-badge-${index + 1}`, image: null as string | null }));

export function LandingAchievementsShowcase() {
  return <section aria-labelledby="landing-achievements-title" className="site-container landing-section">
    <h2 id="landing-achievements-title" className="text-center text-3xl font-bold tracking-tight sm:text-4xl"><T id="landing.achievementsTitle" /></h2>
    <div className="landing-achievement-grid mt-7">
      {badgeSlots.map((badge) => <div key={badge.id} className="achievement-window achievement-window-placeholder landing-achievement-slot">
        {badge.image ? <img src={badge.image} alt="" className="h-[72%] w-[72%] object-contain" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" aria-hidden="true"><path d="m3 13.5 18-3.5-7.2 4.2-1.8 5.3-1.5-.2.4-5.5-6.5.8Z" /><path d="M12 5v4" /></svg>}
        <span className="sr-only"><T id="landing.badgePlaceholder" /></span>
      </div>)}
    </div>
  </section>;
}
