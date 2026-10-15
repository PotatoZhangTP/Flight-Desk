import { roadmapAccess } from "@/lib/roadmap/server";
import { UserMenuClient } from "./user-menu-client";

export async function UserMenu({ email, initials }: { email: string; initials: string }) {
  const { isAdmin } = await roadmapAccess();
  return <UserMenuClient email={email} initials={initials} isAdmin={isAdmin} />;
}
