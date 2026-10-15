import { siteAdminAccess } from "@/lib/admin/server";
import { AccountControls } from "./account-controls";

export async function UserMenu({ email, initials }: { email: string; initials: string }) {
  const { isAdmin } = await siteAdminAccess();
  return <AccountControls email={email} initials={initials} isAdmin={isAdmin} />;
}
