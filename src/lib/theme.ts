// Theme tokens map: CSS variable name -> default HSL value (no hsl() wrapper)
export type ThemeKey =
  | "background"
  | "foreground"
  | "primary"
  | "primary_foreground"
  | "accent"
  | "card"
  | "border"
  | "surface_elevated"
  | "surface_sunken";

export const DEFAULT_THEME: Record<ThemeKey, string> = {
  background: "0 0% 7%",
  foreground: "0 0% 95%",
  primary: "16 78% 57%",
  primary_foreground: "0 0% 100%",
  accent: "16 78% 57%",
  card: "0 0% 11%",
  border: "0 0% 18%",
  surface_elevated: "0 0% 13%",
  surface_sunken: "0 0% 5%",
};

export const THEME_LABELS: Record<ThemeKey, string> = {
  background: "Background",
  foreground: "Foreground (text)",
  primary: "Primary",
  primary_foreground: "Primary text",
  accent: "Accent",
  card: "Card surface",
  border: "Border",
  surface_elevated: "Elevated surface",
  surface_sunken: "Sunken surface",
};

// Maps our snake_case keys to the actual CSS custom properties to set.
// Some keys drive multiple variables (e.g. primary also sets ring + sidebar tokens).
const CSS_VAR_MAP: Record<ThemeKey, string[]> = {
  background: ["--background"],
  foreground: ["--foreground", "--card-foreground", "--popover-foreground"],
  primary: ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring", "--ember"],
  primary_foreground: ["--primary-foreground", "--accent-foreground", "--sidebar-primary-foreground"],
  accent: ["--accent"],
  card: ["--card", "--popover"],
  border: ["--border", "--input", "--sidebar-border"],
  surface_elevated: ["--surface-elevated"],
  surface_sunken: ["--surface-sunken", "--sidebar-background"],
};

export function applyTheme(theme: Partial<Record<ThemeKey, string>>) {
  const root = document.documentElement;
  (Object.keys(DEFAULT_THEME) as ThemeKey[]).forEach((key) => {
    const value = theme[key] ?? DEFAULT_THEME[key];
    CSS_VAR_MAP[key].forEach((cssVar) => {
      root.style.setProperty(cssVar, value);
    });
  });
}

export function resetTheme() {
  const root = document.documentElement;
  Object.values(CSS_VAR_MAP).flat().forEach((cssVar) => {
    root.style.removeProperty(cssVar);
  });
}

// ---------- Color conversion helpers ----------
// Stored values are HSL strings like "16 78% 57%". The native color picker uses hex.
// Round-trip helpers for the Account editor.

export function hslStringToHex(hsl: string): string {
  const m = hsl.trim().match(/^(-?\d*\.?\d+)\s+(-?\d*\.?\d+)%\s+(-?\d*\.?\d+)%$/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m2 = l - c / 2;
  const toHex = (v: number) => {
    const n = Math.round((v + m2) * 255);
    return n.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHslString(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%`;
}

// DB row column names (primary_color avoids reserved word `primary`)
export const DB_COLUMN_BY_KEY: Record<ThemeKey, string> = {
  background: "background",
  foreground: "foreground",
  primary: "primary_color",
  primary_foreground: "primary_foreground",
  accent: "accent",
  card: "card",
  border: "border",
  surface_elevated: "surface_elevated",
  surface_sunken: "surface_sunken",
};
