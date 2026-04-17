import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck, Plus, Search, Users, Star, TrendingUp,
  Calendar, LogOut, ClipboardList, LayoutDashboard, Sparkles, Lock, Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useScoutingData, type Player } from "@/hooks/useScoutingData";
import { NewViewingDialog } from "@/components/NewViewingDialog";
import { AddPlayerDialog } from "@/components/AddPlayerDialog";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { ExportMenu } from "@/components/ExportMenu";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { players, teams, leagues, viewings, loading } = useScoutingData();
  const { tier, aiReportsThisMonth, aiReportsRemaining } = useSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  const atLimit = players.length >= tier.playerLimit;
  const tryAddPlayer = () => {
    if (atLimit) { setUpgradeOpen(true); return; }
    setAddPlayerOpen(true);
  };

  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const leagueMap = useMemo(() => Object.fromEntries(leagues.map((l) => [l.id, l])), [leagues]);
  const playerMap = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const viewingsByPlayer = useMemo(() => {
    const m: Record<string, number> = {};
    viewings.forEach((v) => { m[v.player_id] = (m[v.player_id] ?? 0) + 1; });
    return m;
  }, [viewings]);

  const thisMonth = viewings.filter((v) => {
    const d = new Date(v.game_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    { label: "Total Players", value: players.length, icon: Users },
    { label: "Evaluations", value: viewings.length, icon: ClipboardCheck },
    { label: "Leagues", value: leagues.length, icon: Star },
    { label: "This Month", value: thisMonth, icon: Calendar },
  ];

  const filtered = players.filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <span className="font-heading text-base font-bold">BarnNotes</span>
          </div>
          <div className="flex items-center gap-3">
            <ExportMenu
              filename="barnnotes-export"
              sheets={[
                {
                  name: "Players",
                  rows: players.map((p) => {
                    const team = p.team_id ? teamMap[p.team_id] : null;
                    const league = team?.league_id ? leagueMap[team.league_id] : null;
                    return {
                      first_name: p.first_name,
                      last_name: p.last_name,
                      position: p.position ?? "",
                      shoots: p.shoots ?? "",
                      jersey_number: p.jersey_number ?? "",
                      date_of_birth: p.date_of_birth ?? "",
                      height_cm: p.height_cm ?? "",
                      weight_kg: p.weight_kg ?? "",
                      team: team?.name ?? "",
                      league: league?.name ?? "",
                    };
                  }),
                },
                {
                  name: "Viewings",
                  rows: viewings.map((v) => {
                    const player = playerMap[v.player_id];
                    return {
                      game_date: v.game_date,
                      player: player ? `${player.first_name} ${player.last_name}` : "",
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
                    };
                  }),
                },
              ]}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { await signOut(); navigate("/"); }}
              title={user?.email ?? "Log out"}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sub-nav: quick actions + search */}
        <div className="border-t border-border/50">
          <div className="container flex items-center justify-between gap-3 h-12 px-6">
            <div className="flex items-center gap-1">
              <button
                className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium bg-primary/10 text-primary"
              >
                <LayoutDashboard className="w-4 h-4" />
                Overview
              </button>
              <button
                onClick={() => navigate("/players")}
                className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Users className="w-4 h-4" />
                Browse Players
              </button>
              <button
                onClick={tryAddPlayer}
                className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                {atLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                Add Player
              </button>
              <button
                onClick={() => navigate("/players")}
                className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <ClipboardCheck className="w-4 h-4" />
                New Evaluation
              </button>
              <Link
                to="/pricing"
                className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {tier.name} plan
              </Link>
              <Link
                to="/account"
                className="flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                Account
              </Link>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-4 rounded-lg bg-secondary border-none text-sm w-56 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-heading text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm mb-8">
            {loading ? "Loading..." : "Welcome back. Here's your scouting overview."}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="w-5 h-5 text-primary" />
                <TrendingUp className="w-3 h-3 text-green-500" />
              </div>
              <p className="font-heading text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {(() => {
          const playerPct = tier.playerLimit > 0 && isFinite(tier.playerLimit)
            ? Math.min(100, Math.round((players.length / tier.playerLimit) * 100))
            : 0;
          const reportCap = tier.aiReportsPerMonth;
          const reportPct = isFinite(reportCap) && reportCap > 0
            ? Math.min(100, Math.round((aiReportsThisMonth / reportCap) * 100))
            : 0;
          const playerLimitLabel = isFinite(tier.playerLimit) ? tier.playerLimit : "∞";
          const reportLimitLabel = isFinite(reportCap) ? reportCap : "∞";
          const reportRemainingLabel = isFinite(aiReportsRemaining) ? aiReportsRemaining : "∞";
          const playerNear = isFinite(tier.playerLimit) && playerPct >= 80;
          const reportNear = isFinite(reportCap) && reportPct >= 80;
          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="glass-card rounded-xl p-5 mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading text-sm font-semibold">Plan usage</h3>
                  <p className="text-xs text-muted-foreground">
                    {tier.name} plan · resets monthly
                  </p>
                </div>
                <Link
                  to="/pricing"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Upgrade
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      Players
                    </span>
                    <span className={playerNear ? "text-primary font-medium" : "text-muted-foreground"}>
                      {players.length} / {playerLimitLabel}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full transition-all ${playerNear ? "bg-primary" : "bg-primary/70"}`}
                      style={{ width: `${playerPct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI reports this month
                    </span>
                    <span className={reportNear ? "text-primary font-medium" : "text-muted-foreground"}>
                      {tier.aiReports
                        ? `${aiReportsThisMonth} / ${reportLimitLabel}${isFinite(reportCap) ? ` · ${reportRemainingLabel} left` : ""}`
                        : "Not included"}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full transition-all ${tier.aiReports ? (reportNear ? "bg-primary" : "bg-primary/70") : "bg-muted"}`}
                      style={{ width: `${tier.aiReports ? reportPct : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">Your Players</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "player" : "players"}
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">
              {players.length === 0 ? "No players yet" : "No matches"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {players.length === 0
                ? "Add your first player to start tracking evaluations."
                : "Try a different search term."}
            </p>
            {players.length === 0 && (
              <Button variant="hero" onClick={tryAddPlayer}>
                <Plus className="w-4 h-4" />
                Add your first player
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p, i) => {
              const team = p.team_id ? teamMap[p.team_id] : null;
              const league = team?.league_id ? leagueMap[team.league_id] : null;
              const evalCount = viewingsByPlayer[p.id] ?? 0;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card rounded-xl p-5 hover:border-primary/40 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/players/${p.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-heading font-bold text-primary">
                          {p.position ?? "—"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {p.first_name} {p.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {team?.name ?? "No team"}{league ? ` · ${league.name}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>{p.shoots ? `Shoots ${p.shoots}` : "—"}</span>
                    <span>{evalCount} viewing{evalCount === 1 ? "" : "s"}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => { e.stopPropagation(); setViewingPlayer(p); }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Viewing
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <AddPlayerDialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen} />
      <NewViewingDialog
        open={!!viewingPlayer}
        onOpenChange={(v) => !v && setViewingPlayer(null)}
        player={viewingPlayer}
      />
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title={`You've hit your ${tier.name} player limit`}
        description={`The ${tier.name} plan supports up to ${tier.playerLimit} players. Upgrade to add more prospects to your board.`}
      />
    </div>
  );
};

export default Dashboard;
