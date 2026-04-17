import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { applyTheme, DB_COLUMN_BY_KEY, DEFAULT_THEME, resetTheme, type ThemeKey } from "@/lib/theme";

type ThemeValues = Partial<Record<ThemeKey, string>>;

interface ThemeContextValue {
  theme: ThemeValues;
  loading: boolean;
  saving: boolean;
  setColor: (key: ThemeKey, hslValue: string) => void;
  save: () => Promise<void>;
  reset: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function rowToTheme(row: Record<string, string | null> | null): ThemeValues {
  if (!row) return {};
  const out: ThemeValues = {};
  (Object.keys(DB_COLUMN_BY_KEY) as ThemeKey[]).forEach((key) => {
    const v = row[DB_COLUMN_BY_KEY[key]];
    if (v) out[key] = v;
  });
  return out;
}

function themeToRow(theme: ThemeValues, userId: string) {
  const row: Record<string, string | null> = { user_id: userId };
  (Object.keys(DB_COLUMN_BY_KEY) as ThemeKey[]).forEach((key) => {
    row[DB_COLUMN_BY_KEY[key]] = theme[key] ?? null;
  });
  return row;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<ThemeValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      resetTheme();
      setTheme({});
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("user_theme_prefs" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const t = rowToTheme(data as any);
      setTheme(t);
      applyTheme(t);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const setColor = useCallback((key: ThemeKey, hslValue: string) => {
    setTheme((prev) => {
      const next = { ...prev, [key]: hslValue };
      applyTheme(next);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const row = themeToRow(theme, user.id);
      await supabase.from("user_theme_prefs" as any).upsert(row, { onConflict: "user_id" });
    } finally {
      setSaving(false);
    }
  }, [theme, user]);

  const reset = useCallback(async () => {
    setTheme({});
    applyTheme({});
    if (user) {
      await supabase.from("user_theme_prefs" as any).delete().eq("user_id", user.id);
    }
  }, [user]);

  const value = useMemo(() => ({ theme, loading, saving, setColor, save, reset }), [theme, loading, saving, setColor, save, reset]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { DEFAULT_THEME };
