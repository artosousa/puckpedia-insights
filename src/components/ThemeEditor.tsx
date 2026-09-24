import { Laptop, Loader2, Moon, RotateCcw, Save, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import {
  DEFAULT_THEME,
  THEME_LABELS,
  hexToHslString,
  hslStringToHex,
  type ThemeKey,
} from "@/lib/theme";
import { toast } from "sonner";

const ORDER: ThemeKey[] = [
  "primary",
  "accent",
  "background",
  "foreground",
  "card",
  "surface_elevated",
  "surface_sunken",
  "border",
  "primary_foreground",
];

export function ThemeEditor() {
  const { theme, loading, saving, appearanceMode, setAppearanceMode, setColor, save, reset } = useTheme();

  const onSave = async () => {
    try {
      await save();
      toast.success("Theme saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save theme");
    }
  };

  const onReset = async () => {
    try {
      await reset();
      toast.success("Theme reset to defaults");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not reset theme");
    }
  };

  return (
    <section className="glass-card rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-1 gap-4">
        <div>
          <h2 className="font-heading text-base font-semibold">My appearance</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Choose your display mode and personal palette. Changes preview instantly.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading theme…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mt-5" role="group" aria-label="Appearance mode">
            {([
              { mode: "light" as const, label: "Light", icon: Sun },
              { mode: "dark" as const, label: "Dark", icon: Moon },
              { mode: "system" as const, label: "System", icon: Laptop },
            ]).map(({ mode, label, icon: Icon }) => (
              <Button key={mode} variant={appearanceMode === mode ? "default" : "outline"} size="sm" onClick={() => setAppearanceMode(mode)}>
                <Icon className="size-4" />{label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {ORDER.map((key) => {
              const hsl = theme[key] ?? DEFAULT_THEME[key];
              const hex = hslStringToHex(hsl);
              return (
                <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-sunken border border-border/50">
                  <div className="min-w-0">
                    <Label className="text-xs font-medium">{THEME_LABELS[key]}</Label>
                    <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{hsl}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="w-9 h-9 rounded-md border border-border"
                      style={{ background: `hsl(${hsl})` }}
                      aria-hidden
                    />
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => setColor(key, hexToHslString(e.target.value))}
                      className="w-10 h-9 cursor-pointer rounded border border-border bg-transparent p-0"
                      aria-label={`Pick ${THEME_LABELS[key]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button variant="hero" size="sm" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save theme
            </Button>
            <Button variant="outline" size="sm" onClick={onReset} disabled={saving}>
              <RotateCcw className="w-4 h-4" />
              Reset to defaults
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
