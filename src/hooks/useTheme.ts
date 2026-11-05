import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const KEY = "acs.theme.v1";

function initialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored) return JSON.parse(stored) === "light" ? "light" : "dark";
  } catch {
    // Fall through to the dark default.
  }
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#08080b" : "#f6f6f8";
    try {
      window.localStorage.setItem(KEY, JSON.stringify(theme));
    } catch {
      // Ignore storage failures.
    }
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
  };
}
