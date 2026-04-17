import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, Plus, Search, ArrowLeft, ClipboardList, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScoutingData, type Player } from "@/hooks/useScoutingData";
import { AddPlayerDialog } from "@/components/AddPlayerDialog";
import { NewViewingDialog } from "@/components/NewViewingDialog";
import { ExportMenu } from "@/components/ExportMenu";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useSubscription } from "@/hooks/useSubscription";

const Players = () => {
  const navigate = useNavigate();
  const { players, teams, leagues, viewings, loading } = useScoutingData();
  const { tier } = useSubscription();
  const [query, setQuery] = useState("");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  const atLimit = players.length >= tier.playerLimit;
  const tryAddPlayer = () => {
    if (atLimit) { setUpgradeOpen(true); return; }
    setAddOpen(true);
  };

  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const leagueMap = useMemo(() => Object.fromEntries(leagues.map((l) => [l.id, l])), [leagues]);
  const viewingsByPlayer = useMemo(() => {
    const m: Record<string, number> = {};
    viewings.forEach((v) => { m[v.player_id] = (m[v.player_id] ?? 0) + 1; });
    return m;
  }, [viewings]);

  const filtered = players.filter((p) => {
    const full = `${p.first_name} ${p.last_name}`.toLowerCase();
    if (!full.includes(query.toLowerCase())) return false;
    if (leagueFilter !== "all") {
      const team = p.team_id ? teamMap[p.team_id] : null;
      if (!team || team.league_id !== leagueFilter) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <span className="font-heading text-base font-bold">BarnNotes</span>
            <span className="text-muted-foreground text-sm">/ Players</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search players..."
                className="h-9 pl-9 pr-4 rounded-lg bg-secondary border-none text-sm w-56 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="h-9 w-40 bg-secondary border-none text-sm">
                <SelectValue placeholder="All leagues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All leagues</SelectItem>
                {leagues.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportMenu
              filename="barnnotes-players"
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
                      viewings: viewingsByPlayer[p.id] ?? 0,
                    };
                  }),
                },
              ]}
            />
            <Button variant="hero" size="sm" onClick={tryAddPlayer}>
              {atLimit ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              Add Player
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="font-heading text-2xl font-bold mb-1">Players</h1>
              <p className="text-muted-foreground text-sm">
                {players.length}{tier.playerLimit !== Infinity ? ` / ${tier.playerLimit}` : ""} {players.length === 1 ? "player" : "players"} in your database
              </p>
            </div>
            <Link to="/pricing" className="text-xs px-2 py-1 rounded-md bg-secondary border border-border/50 hover:border-primary/40 transition-colors">
              {tier.name} plan
            </Link>
          </div>
        </motion.div>

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

      <AddPlayerDialog open={addOpen} onOpenChange={setAddOpen} />
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

export default Players;
