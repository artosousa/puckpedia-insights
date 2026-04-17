import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Plus, Target, Activity, BarChart3, Calendar, Sparkles, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScoutingData } from "@/hooks/useScoutingData";
import { NewViewingDialog } from "@/components/NewViewingDialog";
import { ExportMenu } from "@/components/ExportMenu";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { stripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { PlayerMediaPanel } from "@/components/PlayerMediaPanel";
import { ScoutingContextCard } from "@/components/ScoutingContextCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AiRatingSuggestions } from "@/components/AiRatingSuggestions";
import { computeScoutConfidence } from "@/lib/scoutConfidence";
import { useScoutingData as _scd } from "@/hooks/useScoutingData";

const COLORS = ["hsl(16, 78%, 57%)", "hsl(38, 80%, 60%)", "hsl(200, 60%, 55%)", "hsl(140, 50%, 50%)", "hsl(280, 50%, 60%)"];

const avg = (nums: (number | null)[]) => {
  const v = nums.filter((n): n is number => n != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};

const PlayerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { players, teams, leagues, viewings, loading } = useScoutingData();
  const { tier, canGenerateReport, aiReportsRemaining, aiReportsThisMonth } = useSubscription();
  const [viewingOpen, setViewingOpen] = useState(false);
  const [report, setReport] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const player = useMemo(() => players.find((p) => p.id === id) ?? null, [players, id]);
  const team = player?.team_id ? teams.find((t) => t.id === player.team_id) : null;
  const league = team?.league_id ? leagues.find((l) => l.id === team.league_id) : null;
  const playerViewings = useMemo(
    () => viewings.filter((v) => v.player_id === id).sort((a, b) => a.game_date.localeCompare(b.game_date)),
    [viewings, id]
  );

  // AI ratings pulled from analyzed clips for this player
  type AiClipRatings = {
    skating: number | null;
    shot: number | null;
    hands: number | null;
    iq: number | null;
    compete: number | null;
    physicality: number | null;
  };
  const [aiClipRatings, setAiClipRatings] = useState<AiClipRatings[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("player_media")
        .select("ai_analysis")
        .eq("player_id", id)
        .not("ai_analysis", "is", null);
      if (cancelled || !data) return;
      const out: AiClipRatings[] = [];
      for (const row of data) {
        const text = row.ai_analysis as string | null;
        if (!text) continue;
        const m = text.match(/^<<RATINGS>>(.*?)<<END>>/s);
        if (!m) continue;
        try {
          const r = JSON.parse(m[1]);
          out.push({
            skating: typeof r.skating === "number" ? r.skating : null,
            shot: typeof r.shot === "number" ? r.shot : null,
            hands: typeof r.hands === "number" ? r.hands : null,
            iq: typeof r.iq === "number" ? r.iq : null,
            compete: typeof r.compete === "number" ? r.compete : null,
            physicality: typeof r.physicality === "number" ? r.physicality : null,
          });
        } catch { /* skip */ }
      }
      setAiClipRatings(out);
    })();
    return () => { cancelled = true; };
  }, [id, viewings]);

  // Per-metric averages blended from viewings + AI clips
  const blendedAvg = (metric: keyof AiClipRatings, viewingField: keyof typeof playerViewings[number]) =>
    avg([
      ...playerViewings.map((v) => v[viewingField] as number | null),
      ...aiClipRatings.map((c) => c[metric]),
    ]);

  const radarData = useMemo(() => [
    { attr: "Skating", value: +blendedAvg("skating", "rating_skating").toFixed(1) },
    { attr: "Shot", value: +blendedAvg("shot", "rating_shot").toFixed(1) },
    { attr: "Hands", value: +blendedAvg("hands", "rating_hands").toFixed(1) },
    { attr: "IQ", value: +blendedAvg("iq", "rating_iq").toFixed(1) },
    { attr: "Compete", value: +blendedAvg("compete", "rating_compete").toFixed(1) },
    { attr: "Physical", value: +blendedAvg("physicality", "rating_physicality").toFixed(1) },
  ], [playerViewings, aiClipRatings]);

  const trendData = useMemo(() => playerViewings.map((v) => ({
    date: new Date(v.game_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overall: v.rating_overall ?? 0,
    skating: v.rating_skating ?? 0,
    shot: v.rating_shot ?? 0,
  })), [playerViewings]);

  const projectionData = useMemo(() => {
    const counts: Record<string, number> = {};
    playerViewings.forEach((v) => {
      const k = v.projection ?? "Unrated";
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [playerViewings]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Player not found.</p>
        <Button variant="outline" onClick={() => navigate("/players")}>Back to Players</Button>
      </div>
    );
  }

  // Each AI clip contributes its own "overall" = mean of its 6 metrics; blended with each viewing's overall
  const aiClipOverallList = aiClipRatings
    .map((c) => avg([c.skating, c.shot, c.hands, c.iq, c.compete, c.physicality]))
    .filter((n) => n > 0);
  const overallAvg = +avg([
    ...playerViewings.map((v) => v.rating_overall),
    ...aiClipOverallList,
  ]).toFixed(1);

  const generateReport = async () => {
    if (!player) return;
    if (!tier.aiReports || aiReportsRemaining <= 0) {
      setUpgradeOpen(true);
      return;
    }
    if (playerViewings.length === 0) {
      toast.error("Log at least one viewing before generating a report.");
      return;
    }
    setReportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-scouting-report", {
        body: {
          environment: stripeEnvironment,
          player_id: player.id,
          player: {
            first_name: player.first_name,
            last_name: player.last_name,
            position: player.position,
            shoots: player.shoots,
            jersey_number: player.jersey_number,
            date_of_birth: player.date_of_birth,
            height_cm: player.height_cm,
            weight_kg: player.weight_kg,
            player_context: player.player_context,
          },
          team: team?.name ?? null,
          league: league?.name ?? null,
          level: league?.level ?? null,
          viewings: playerViewings.map((v) => ({
            game_date: v.game_date,
            opponent: v.opponent,
            location: v.location,
            rating_skating: v.rating_skating,
            rating_shot: v.rating_shot,
            rating_hands: v.rating_hands,
            rating_iq: v.rating_iq,
            rating_compete: v.rating_compete,
            rating_physicality: v.rating_physicality,
            rating_overall: v.rating_overall,
            projection: v.projection,
            notes: v.notes,
          })),
        },
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.ok === false || payload?.error) throw new Error(payload?.error ?? "Report generation failed");
      setReport(payload?.report ?? "");
      toast.success("Scouting report generated.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate report.");
    } finally {
      setReportLoading(false);
    }
  };

  const exportSheets = [
    {
      name: "Profile",
      rows: [{
        first_name: player.first_name,
        last_name: player.last_name,
        position: player.position ?? "",
        shoots: player.shoots ?? "",
        jersey_number: player.jersey_number ?? "",
        date_of_birth: player.date_of_birth ?? "",
        height_cm: player.height_cm ?? "",
        weight_kg: player.weight_kg ?? "",
        team: team?.name ?? "",
        league: league?.name ?? "",
        total_viewings: playerViewings.length,
        avg_overall: overallAvg || "",
        avg_skating: +avg(playerViewings.map((v) => v.rating_skating)).toFixed(1) || "",
        avg_shot: +avg(playerViewings.map((v) => v.rating_shot)).toFixed(1) || "",
        avg_hands: +avg(playerViewings.map((v) => v.rating_hands)).toFixed(1) || "",
        avg_iq: +avg(playerViewings.map((v) => v.rating_iq)).toFixed(1) || "",
        avg_compete: +avg(playerViewings.map((v) => v.rating_compete)).toFixed(1) || "",
        avg_physicality: +avg(playerViewings.map((v) => v.rating_physicality)).toFixed(1) || "",
        created_at: player.created_at,
        ai_scouting_report: report || "",
      }],
    },
    {
      name: "Viewings",
      rows: playerViewings.map((v) => ({
        game_date: v.game_date,
        opponent: v.opponent ?? "",
        location: v.location ?? "",
        skating: v.rating_skating ?? "",
        shot: v.rating_shot ?? "",
        hands: v.rating_hands ?? "",
        iq: v.rating_iq ?? "",
        compete: v.rating_compete ?? "",
        physicality: v.rating_physicality ?? "",
        overall: v.rating_overall ?? "",
        projection: v.projection ?? "",
        notes: v.notes ?? "",
        logged_at: v.created_at,
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader crumb={`${player.first_name} ${player.last_name}`} />

      <main className="container px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-base font-heading font-bold text-primary">{player.position ?? "—"}</span>
              </div>
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-bold truncate">{player.first_name} {player.last_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {team?.name ?? "No team"}{league ? ` · ${league.name}` : ""}
                  {league?.level ? ` · ${league.level}` : ""}
                  {player.shoots ? ` · Shoots ${player.shoots}` : ""}
                  {player.jersey_number ? ` · #${player.jersey_number}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={generateReport}
                disabled={reportLoading || (canGenerateReport && playerViewings.length === 0)}
                title={
                  !tier.aiReports
                    ? "AI reports are available on 2nd Line and 1st Line plans"
                    : aiReportsRemaining <= 0
                    ? `Monthly limit reached (${aiReportsThisMonth}/${tier.aiReportsPerMonth})`
                    : undefined
                }
              >
                {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className={`w-4 h-4 ${canGenerateReport ? "" : "opacity-60"}`} />}
                {!tier.aiReports
                  ? "AI Report (2nd Line+)"
                  : aiReportsRemaining <= 0
                  ? "Limit reached"
                  : isFinite(tier.aiReportsPerMonth)
                  ? `AI Report (${aiReportsRemaining} left)`
                  : report ? "Regenerate Report" : "AI Report"}
              </Button>
              <ExportMenu
                filename={`barnnotes-${player.last_name.toLowerCase()}`}
                sheets={exportSheets}
              />
              <Button variant="hero" size="sm" onClick={() => setViewingOpen(true)}>
                <Plus className="w-4 h-4" />
                New Viewing
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Viewings</p>
            <p className="font-heading text-2xl font-bold">{playerViewings.length}</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Avg Overall</p>
            <p className="font-heading text-2xl font-bold text-primary">{overallAvg || "—"}</p>
            {aiClipOverallList.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Blends {playerViewings.length} viewing{playerViewings.length === 1 ? "" : "s"} + {aiClipOverallList.length} AI clip{aiClipOverallList.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Height</p>
            <p className="font-heading text-2xl font-bold">{player.height_cm ? `${player.height_cm}cm` : "—"}</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Weight</p>
            <p className="font-heading text-2xl font-bold">{player.weight_kg ? `${player.weight_kg}kg` : "—"}</p>
          </div>
        </div>

        <ScoutingContextCard player={player} league={league ?? null} />

        {playerViewings.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">No viewings yet</h3>
            <p className="text-sm text-muted-foreground mb-5">Log a viewing to see charts and trends for this player.</p>
            <Button variant="hero" onClick={() => setViewingOpen(true)}>
              <Plus className="w-4 h-4" />
              Log first viewing
            </Button>
          </div>
        ) : (
          <>
            {(report || reportLoading) && (
              <div className="glass-card rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h3 className="font-heading text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Scouting Report
                  </h3>
                  <div className="flex items-center gap-3">
                    {report && (
                      <span className="text-xs text-muted-foreground">Included in exports</span>
                    )}
                    {report && !reportLoading && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateReport}
                        disabled={!canGenerateReport}
                        title={
                          !tier.aiReports
                            ? "AI reports are available on 2nd Line and 1st Line plans"
                            : aiReportsRemaining <= 0
                            ? `Monthly limit reached (${aiReportsThisMonth}/${tier.aiReportsPerMonth})`
                            : undefined
                        }
                      >
                        <Sparkles className="w-4 h-4" />
                        Regenerate
                      </Button>
                    )}
                  </div>
                </div>
                {reportLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing viewings and generating report...
                  </div>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                    <ReactMarkdown>{report}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-heading text-base font-semibold flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-primary" />
                  Skill Profile
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="attr" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar dataKey="value" stroke="hsl(16, 78%, 57%)" fill="hsl(16, 78%, 57%)" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card rounded-xl p-6 lg:col-span-2">
                <h3 className="font-heading text-base font-semibold flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-primary" />
                  Development Arc
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--surface-elevated))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="overall" stroke="hsl(16, 78%, 57%)" strokeWidth={2} />
                    <Line type="monotone" dataKey="skating" stroke="hsl(38, 80%, 60%)" strokeWidth={2} />
                    <Line type="monotone" dataKey="shot" stroke="hsl(200, 60%, 55%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-heading text-base font-semibold flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Projection Mix
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={projectionData} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40}>
                      {projectionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--surface-elevated))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card rounded-xl p-6 lg:col-span-2">
                <h3 className="font-heading text-base font-semibold mb-4">Viewing Log</h3>
                <Accordion type="multiple" className="space-y-2">
                  {[...playerViewings].reverse().map((v) => {
                    const ratingRows: { label: string; value: number | null }[] = [
                      { label: "Skating", value: v.rating_skating },
                      { label: "Shot", value: v.rating_shot },
                      { label: "Hands", value: v.rating_hands },
                      { label: "IQ", value: v.rating_iq },
                      { label: "Compete", value: v.rating_compete },
                      { label: "Physicality", value: v.rating_physicality },
                    ];
                    return (
                      <AccordionItem
                        key={v.id}
                        value={v.id}
                        className="border border-border/50 rounded-lg bg-surface-sunken overflow-hidden data-[state=open]:bg-surface-sunken/60"
                      >
                        <AccordionTrigger className="px-3 py-3 hover:no-underline">
                          <div className="flex items-center justify-between gap-3 w-full pr-2">
                            <div className="text-left min-w-0">
                              <p className="text-sm font-medium truncate">
                                {new Date(v.game_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                {v.opponent ? ` vs ${v.opponent}` : ""}
                                {v.location ? ` · ${v.location}` : ""}
                              </p>
                              {v.notes && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{v.notes}</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {v.projection && <span className="text-xs text-muted-foreground hidden sm:inline">{v.projection}</span>}
                              <span className="font-heading text-sm font-bold text-primary">{v.rating_overall ?? "—"}</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-4">
                          <div className="space-y-4 pt-1">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {ratingRows.map((r) => (
                                <div key={r.label} className="flex items-center justify-between rounded-md bg-background/40 px-2.5 py-1.5">
                                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.label}</span>
                                  <span className="font-mono text-xs text-foreground">{r.value ?? "—"}</span>
                                </div>
                              ))}
                            </div>
                            {v.projection && (
                              <p className="text-xs">
                                <span className="text-muted-foreground">Projection: </span>
                                <span className="text-foreground font-medium">{v.projection}</span>
                              </p>
                            )}
                            {v.notes && (
                              <div>
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                                <p className="text-sm text-foreground whitespace-pre-wrap">{v.notes}</p>
                              </div>
                            )}
                            <div className="pt-1">
                              <PlayerMediaPanel
                                playerId={player.id}
                                viewingId={v.id}
                                scope="viewing"
                                title="Clips & Photos for this viewing"
                              />
                            </div>
                            <AiRatingSuggestions viewing={v} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          </>
        )}

        <div className="mt-8">
          <PlayerMediaPanel playerId={player.id} scope="gallery" title="Highlights Gallery" />
        </div>
      </main>

      <NewViewingDialog
        open={viewingOpen}
        onOpenChange={setViewingOpen}
        player={player}
      />
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title={!tier.aiReports ? "AI reports unlock on Minor" : "Monthly AI report limit reached"}
        description={
          !tier.aiReports
            ? "Upgrade to Minor for 10 AI scouting reports per month, or Pro for unlimited reports plus unlimited players."
            : `You've used all ${tier.aiReportsPerMonth} AI reports this month. Upgrade to Pro for unlimited reports.`
        }
      />
    </div>
  );
};

export default PlayerProfile;
