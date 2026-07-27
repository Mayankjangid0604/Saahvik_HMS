// Tailwind CSS 4 is configured CSS-first in src/index.css via @theme.
// This file exists as a reference for the design tokens and for tooling
// that expects a JS config. Keep it in sync with src/index.css.
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1B2A4A", // Midnight Sapphire
        accent: "#B08D57", // Champagne Gold
        surface: "#F8F5EF", // Ivory page background
        ink: "#1A1A1A",
        muted: "#64748B",
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono Variable", "JetBrains Mono", "monospace"],
      },
    },
  },
} satisfies Config;
