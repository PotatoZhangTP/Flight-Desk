import { UserMenuClient } from "./user-menu-client";
import { HeaderThemeToggle } from "./header-theme-toggle";
import { HeaderLanguageSelector } from "./header-language-selector";

export function AccountControls({ initials, avatarUrl }: { initials: string; avatarUrl?: string | null }) {
  return <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
    <HeaderThemeToggle />
    <HeaderLanguageSelector />
    <UserMenuClient initials={initials} avatarUrl={avatarUrl} />
  </div>;
}
