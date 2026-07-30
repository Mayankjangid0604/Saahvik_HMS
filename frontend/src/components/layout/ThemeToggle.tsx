import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

/**
 * Theme preference toggle — BUTTON ONLY for now (confirmed scope).
 * It persists a light | dark | system preference and sets/removes a `dark`
 * class on <html> so a future chat implementing a real dark palette has a hook.
 * There are deliberately NO dark: styles anywhere yet, so toggling is a no-op
 * visually apart from the icon swap.
 */
type Theme = "light" | "dark" | "system";

export const THEME_KEY = "saahvik.theme";
const ORDER: Theme[] = ["light", "dark", "system"];

function readTheme(): Theme {
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(pref: Theme): void {
  const isDark = pref === "dark" || (pref === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

const ICONS: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const NEXT_LABEL: Record<Theme, string> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readTheme());

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    // Follow OS changes while on "system".
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  };

  const Icon = ICONS[theme];
  return (
    <button
      onClick={cycle}
      className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
      aria-label={`Theme: ${theme}. Switch to ${NEXT_LABEL[theme]}.`}
      title={`Theme: ${theme} · click for ${NEXT_LABEL[theme]}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
