import { useEffect, useMemo, useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useScoutingData, type Viewing } from "@/hooks/useScoutingData";
import { toast } from "sonner";

type Metric = "skating" | "shot" | "hands" | "iq" | "compete" | "physicality";

const METRICS: { key: Metric; label: string; field: keyof Viewing }[] = [
  { key: "skating", label: "Skating", field: "rating_skating" },
  { key: "shot", label: "Shot", field: "rating_shot" },
  { key: "hands", label: "Hands", field: "rating_hands" },
  { key: "iq", label: "IQ", field: "rating_iq" },
  { key: "compete", label: "Compete", field: "rating_compete" },
  { key: "physicality", label: "Physicality", field: "rating_physicality" },
];

function parseRatingsFromAnalysis(text: string | null): Partial<Record<Metric, number>> | null {
  if (!text) return null;
  const m = text.match(/^<<RATINGS>>(.*?)<<END>>/s);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]);
    const out: Partial<Record<Metric, number>> = {};
    for (const k of ["skating", "shot", "hands", "iq", "compete", "physicality"] as Metric[]) {
      const v = parsed[k];
      if (typeof v === "number") out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

interface Props {
  viewing: Viewing;
}

export function AiRatingSuggestions({ viewing }: Props) {
  const { updateViewing } = useScoutingData();
  const [loading, setLoading] = useState(true);
  const [clipCount, setClipCount] = useState(0);
  const [averages, setAverages] = useState<Partial<Record<Metric, number>>>({});
  const [applying, setApplying] = useState<Metric | "all" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("player_media")
        .select("ai_analysis")
        .eq("viewing_id", viewing.id)
        .not("ai_analysis", "is", null);
      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      const sums: Partial<Record<Metric, { sum: number; n: number }>> = {};
      let analyzed = 0;
      for (const row of data) {
        const r = parseRatingsFromAnalysis(row.ai_analysis as string | null);
        if (!r) continue;
        analyzed++;
        for (const m of Object.keys(r) as Metric[]) {
          const v = r[m]!;
          const s = sums[m] ?? { sum: 0, n: 0 };
          s.sum += v;
          s.n += 1;
          sums[m] = s;
        }
      }
      const avgs: Partial<Record<Metric, number>> = {};
      for (const m of Object.keys(sums) as Metric[]) {
        const s = sums[m]!;
        avgs[m] = Math.round(s.sum / s.n);
      }
      setAverages(avgs);
      setClipCount(analyzed);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewing.id]);

  const rows = useMemo(() => {
    return METRICS.map((m) => {
      const ai = averages[m.key];
      const manual = viewing[m.field] as number | null;
      return { ...m, ai, manual, differs: typeof ai === "number" && ai !== manual };
    });
  }, [averages, viewing]);

  const hasAny = Object.keys(averages).length > 0;
  const differingRows = rows.filter((r) => r.differs);

  const apply = async (m: Metric) => {
    const ai = averages[m];
    if (typeof ai !== "number") return;
    const field = METRICS.find((x) => x.key === m)!.field;
    setApplying(m);
    try {
      await updateViewing(viewing.id, { [field]: ai } as Partial<Viewing>);
      toast.success(`${METRICS.find((x) => x.key === m)!.label} updated to ${ai}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    } finally {
      setApplying(null);
    }
  };

  const applyAll = async () => {
    setApplying("all");
    try {
      const patch: Partial<Viewing> = {};
      for (const r of differingRows) {
        if (typeof r.ai === "number") (patch as any)[r.field] = r.ai;
      }
      if (Object.keys(patch).length === 0) return;
      await updateViewing(viewing.id, patch);
      toast.success("All AI suggestions applied");
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border/50 bg-background/40 p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking AI analyses for this viewing…
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 bg-background/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5" />
        No AI ratings yet. Analyze a clip below to get rating suggestions for this viewing.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-primary">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">AI rating suggestions</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">
            avg of {clipCount} clip{clipCount === 1 ? "" : "s"}
          </span>
        </div>
        {differingRows.length > 1 && (
          <Button
            size="sm"
            variant="hero"
            className="h-7 text-xs"
            onClick={applyAll}
            disabled={applying !== null}
          >
            {applying === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Apply all ({differingRows.length})
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {rows.map((r) => {
          const aiVal = r.ai;
          const manual = r.manual;
          const noAi = typeof aiVal !== "number";
          return (
            <div
              key={r.key}
              className="flex items-center justify-between gap-2 rounded-md bg-background/50 px-2.5 py-1.5"
            >
              <span className="text-xs text-muted-foreground w-20 shrink-0">{r.label}</span>
              <div className="flex items-center gap-2 text-xs font-mono flex-1 justify-end">
                <span className="text-muted-foreground">
                  You: <span className="text-foreground">{manual ?? "—"}</span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-primary">
                  AI: <span className="font-semibold">{noAi ? "—" : aiVal}</span>
                </span>
                <Button
                  size="sm"
                  variant={r.differs ? "outline" : "ghost"}
                  className="h-6 px-2 text-[10px]"
                  disabled={noAi || !r.differs || applying !== null}
                  onClick={() => apply(r.key)}
                >
                  {applying === r.key ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : !r.differs && !noAi ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
