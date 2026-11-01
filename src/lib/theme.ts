export type ThemePreference = "light" | "dark" | "system";
export const THEME_KEY = "civiclens-appearance";
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
// Runs synchronously before paint. No user-controlled content enters this script.
export const themeBootstrap = `(function(){var p='system';try{var s=localStorage.getItem('civiclens-appearance');if(s==='light'||s==='dark'||s==='system')p=s;}catch(e){}var t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;var r=document.documentElement;r.dataset.theme=t;r.dataset.themePreference=p;r.style.colorScheme=t;})();`;
