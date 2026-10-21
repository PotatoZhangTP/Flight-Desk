import { T } from "@/components/i18n";

const badgeSlots = Array.from({ length: 5 }, (_, index) => ({ id: `landing-badge-${index + 1}`, image: null as string | null }));

export function LandingAchievementsShowcase() {
  return <section aria-labelledby="landing-achievements-title" className="site-container landing-section">
    <h2 id="landing-achievements-title" className="text-center text-3xl font-bold tracking-tight sm:text-4xl"><T id="landing.achievementsTitle" /></h2>
    <div className="landing-achievement-grid mt-7">
      {badgeSlots.map((badge) => <div key={badge.id} className="landing-achievement-slot">
        {badge.image ? <img src={badge.image} alt="" className="h-full w-full object-contain" /> : <svg viewBox="0 0 96 112" fill="none" aria-hidden="true"><path d="M48 5 78 16l7 33c4 24-11 45-37 58C22 94 7 73 11 49l7-33L48 5Z" /><path d="m48 29 6 13 14 2-10 10 3 15-13-7-13 7 3-15-10-10 14-2 6-13Z" /><path d="M20 30 7 20m69 10 13-10M21 78 9 91m66-13 12 13" /></svg>}
        <span className="sr-only"><T id="landing.badgePlaceholder" /></span>
      </div>)}
    </div>
  </section>;
}
