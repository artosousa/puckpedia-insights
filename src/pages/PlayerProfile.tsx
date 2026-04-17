import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ArrowLeft, ClipboardCheck, Plus, Target, Activity, BarChart3, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScoutingData } from "@/hooks/useScoutingData";
import { NewViewingDialog } from "@/components/NewViewingDialog";
import { ExportMenu } from "@/components/ExportMenu";

const COLORS = ["hsl(16, 78%, 57%)", "hsl(38, 80%, 60%)", "hsl(200, 60%, 55%)", "hsl(140, 50%, 50%)", "hsl(280, 50%, 60%)"];

const avg = (nums: (number | null)[]) => {
  const v = nums.filter((n): n is number => n != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};

const PlayerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { players, teams, leagues, viewings, loading } = useScoutingData();
  const [viewingOpen, setViewingOpen] = useState(false);

  const player = useMemo(() => players.find((p) => p.id === id) ?? null, [players, id]);
  const team = player?.team_id ? teams.find((t) => t.id === player.team_id) : null;
  const league = team?.league_id ? leagues.find((l) => l.id === team.league_id) : null;
  const playerViewings = useMemo(
    () => viewings.filter((v) => v.player_id === id).sort((a, b) => a.game_date.localeCompare(b.game_date)),
    [viewings, id]
  );

  const radarData = useMemo(() => [
    { attr: "Skating", value: +avg(playerViewings.map((v) => v.rating_skating)).toFixed(1) },
    { attr: "Shot", value: +avg(playerViewings.map((v) => v.rating_shot)).toFixed(1) },
    { attr: "Hands", value: +avg(playerViewings.map((v) => v.rating_hands)).toFixed(1) },
    { attr: "IQ", value: +avg(playerViewings.map((v) => v.rating_iq)).toFixed(1) },
    { attr: "Compete", value: +avg(playerViewings.map((v) => v.rating_compete)).toFixed(1) },
    { attr: "Physical", value: +avg(playerViewings.map((v) => v.rating_physicality)).toFixed(1) },
  ], [playerViewings]);

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

  const overallAvg = +avg(playerViewings.map((v) => v.rating_overall)).toFixed(1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-3">
            <Link to="/players" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <span className="font-heading text-base font-bold">BarnNotes</span>
            <span className="text-muted-foreground text-sm">/ {player.first_name} {player.last_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <ExportMenu
              filename={`barnnotes-${player.last_name.toLowerCase()}`}
              sheets={[
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
              ]}
            />
            <Button variant="hero" size="sm" onClick={() => setViewingOpen(true)}>
              <Plus className="w-4 h-4" />
              New Viewing
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-base font-heading font-bold text-primary">{player.position ?? "—"}</span>
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">{player.first_name} {player.last_name}</h1>
              <p className="text-sm text-muted-foreground">
                {team?.name ?? "No team"}{league ? ` · ${league.name}` : ""}
                {player.shoots ? ` · Shoots ${player.shoots}` : ""}
                {player.jersey_number ? ` · #${player.jersey_number}` : ""}
              </p>
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
                <div className="space-y-2">
                  {[...playerViewings].reverse().map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-sunken">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(v.game_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          {v.opponent ? ` vs ${v.opponent}` : ""}
                        </p>
                        {v.notes && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{v.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        {v.projection && <span className="text-xs text-muted-foreground">{v.projection}</span>}
                        <span className="font-heading text-sm font-bold text-primary">{v.rating_overall ?? "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <NewViewingDialog
        open={viewingOpen}
        onOpenChange={setViewingOpen}
        player={player}
      />
    </div>
  );
};

export default PlayerProfile;
