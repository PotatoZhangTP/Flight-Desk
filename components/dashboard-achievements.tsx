import { AchievementsModule } from "@/components/dashboard-v2-modules";
import { readAchievementCabin } from "@/lib/achievements/server";
import { createClient } from "@/lib/supabase/server";

export async function DashboardAchievements({ userId }: { userId: string }) {
  const supabase = await createClient();
  const cabin = await readAchievementCabin(supabase, userId);
  return <AchievementsModule cabin={cabin} />;
}

export function DashboardAchievementsFallback() {
  return <section className="dashboard-module spotlight-card" aria-label="Achievements loading">
    <div className="h-7 w-48 rounded-lg skeleton-shimmer" />
    <div className="mt-5 grid grid-cols-5 gap-3">
      {[0, 1, 2, 3, 4].map(item => <div key={item} className="aspect-square rounded-full skeleton-shimmer" />)}
    </div>
  </section>;
}
