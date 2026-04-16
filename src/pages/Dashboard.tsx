import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck, Plus, Search, Users, Star, TrendingUp,
  BarChart3, Calendar, ChevronRight
} from "lucide-react";
import { useScoutingData } from "@/hooks/useScoutingData";
import { NewViewingDialog } from "@/components/NewViewingDialog";
import { AddPlayerDialog } from "@/components/AddPlayerDialog";

const Dashboard = () => {
  const navigate = useNavigate();
  const { players, teams, leagues, viewings, loading } = useScoutingData();
  const [searchQuery, setSearchQuery] = useState("");
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);

  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const leagueMap = useMemo(() => Object.fromEntries(leagues.map((l) => [l.id, l])), [leagues]);
  const playerMap = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);

  const recent = viewings.slice(0, 5);
  const thisMonth = viewings.filter((v) => {
    const d = new Date(v.game_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filteredSearch = searchQuery
    ? players.filter((p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const stats = [
    { label: "Total Players", value: players.length, icon: Users },
    { label: "Evaluations", value: viewings.length, icon: ClipboardCheck },
    { label: "Leagues", value: leagues.length, icon: Star },
    { label: "This Month", value: thisMonth, icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <span className="font-heading text-base font-bold">BarnNotes</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-4 rounded-lg bg-secondary border-none text-sm w-56 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {filteredSearch.length > 0 && (
                <div className="absolute top-full mt-1 w-full rounded-lg bg-surface-elevated border border-border/50 shadow-2xl overflow-hidden z-50">
                  {filteredSearch.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setViewingPlayerId(p.id); setSearchQuery(""); }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-primary/10"
                    >
                      {p.first_name} {p.last_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="hero" size="sm" onClick={() => navigate("/players")}>
              <Plus className="w-4 h-4" />
              New Evaluation
            </Button>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="md:col-span-2 glass-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Recent Evaluations
              </h3>
              <Link to="/players" className="text-xs text-primary flex items-center gap-1 hover:underline">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground mb-4">
                  No evaluations yet. Add a player and log your first viewing.
                </p>
                <Button variant="hero" size="sm" onClick={() => setAddPlayerOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add Player
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((v) => {
                  const player = playerMap[v.player_id];
                  const team = player?.team_id ? teamMap[player.team_id] : null;
                  const league = team?.league_id ? leagueMap[team.league_id] : null;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-sunken hover:bg-secondary/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-heading font-bold text-primary">
                            {player?.position ?? "—"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {player ? `${player.first_name} ${player.last_name}` : "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {team?.name ?? "—"}{league ? ` · ${league.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">
                          {new Date(v.game_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        <span className="font-heading text-sm font-bold text-primary">
                          {v.rating_overall ?? "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="font-heading text-base font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => setAddPlayerOpen(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-sunken hover:bg-primary/10 hover:text-primary transition-all text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Player
              </button>
              <button
                onClick={() => navigate("/players")}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-sunken hover:bg-primary/10 hover:text-primary transition-all text-sm font-medium"
              >
                <Users className="w-4 h-4" />
                Browse Players
              </button>
              <button
                onClick={() => navigate("/players")}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-sunken hover:bg-primary/10 hover:text-primary transition-all text-sm font-medium"
              >
                <ClipboardCheck className="w-4 h-4" />
                New Evaluation
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      <AddPlayerDialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen} />
      <NewViewingDialog
        open={!!viewingPlayerId}
        onOpenChange={(v) => !v && setViewingPlayerId(null)}
        player={viewingPlayerId ? playerMap[viewingPlayerId] ?? null : null}
      />
    </div>
  );
};

export default Dashboard;
