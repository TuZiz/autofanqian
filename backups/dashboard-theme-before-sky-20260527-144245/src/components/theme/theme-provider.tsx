"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import {
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_STORAGE_KEY,
  isTheme,
  type Theme,
} from "@/components/theme/theme-config";

type ThemeContextValue = {
  theme: Theme;
  preference: Theme | null;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function getSystemThemeSnapshot() {
  if (typeof window === "undefined") {
    return "light" as Theme;
  }

  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function subscribeToSystemTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(MEDIA_QUERY);

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onStoreChange);
    return () => mediaQuery.removeEventListener("change", onStoreChange);
  }

  mediaQuery.addListener(onStoreChange);
  return () => mediaQuery.removeListener(onStoreChange);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function readStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function persistThemePreference(theme: Theme | null) {
  try {
    if (theme) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } else {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {}

  try {
    if (theme) {
      document.cookie = `theme=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
      return;
    }

    document.cookie = "theme=; Path=/; Max-Age=0; SameSite=Lax";
  } catch {}
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme | null;
  children: React.ReactNode;
}) {
  const [preference, setPreference] = useState<Theme | null>(() => {
    if (typeof window === "undefined") {
      return initialTheme;
    }

    return readStoredTheme() ?? initialTheme;
  });

  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    () => initialTheme ?? "light",
  );

  const theme = preference ?? systemTheme;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    persistThemePreference(preference);
  }, [preference]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        preference,
        setTheme: (next) => setPreference(next),
        toggleTheme: () =>
          setPreference((current) => ((current ?? theme) === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return ctx;
}

export type { Theme };
