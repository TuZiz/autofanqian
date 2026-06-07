export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export const THEME_INIT_SCRIPT = `
(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  const root = document.documentElement;
  const isTheme = (value) => value === "light" || value === "dark";
  const cookieMatch = document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/);

  let persistedTheme = null;

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    if (isTheme(storedTheme)) {
      persistedTheme = storedTheme;
    }
  } catch {}

  if (!persistedTheme && cookieMatch && isTheme(cookieMatch[1])) {
    persistedTheme = cookieMatch[1];
  }

  const resolvedTheme =
    persistedTheme ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  root.dataset.theme = resolvedTheme;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
})();
`;
