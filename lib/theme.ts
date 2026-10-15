export const themeModes = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof themeModes)[number];
export const themeStorageKey = "flightdesk-theme";
export function normalizeTheme(value: unknown): ThemeMode {
  return themeModes.includes(value as ThemeMode) ? value as ThemeMode : "system";
}

// Static, trusted source only. Runs in <head> before body paint; no account data.
export const themeInitScript = `(function(){var t="system";try{var s=localStorage.getItem("flightdesk-theme");if(s==="light"||s==="dark"||s==="system")t=s;}catch(e){}document.documentElement.dataset.theme=t;})();`;
