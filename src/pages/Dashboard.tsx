import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck, Plus, Search, Users, Star, TrendingUp,
  BarChart3, Calendar, ChevronRight
} from "lucide-react";

// Mock data
const recentEvaluations = [
  { name: "Marcus Johansson", pos: "LW", team: "Tri-City Storm", league: "USHL", date: "Apr 14", rating: 8.2 },
  { name: "Alexei Petrov", pos: "D", team: "Sudbury Wolves", league: "OHL", date: "Apr 12", rating: 7.5 },
  { name: "Brady Miller", pos: "C", team: "Boston University", league: "NCAA", date: "Apr 10", rating: 8.8 },
  { name: "Niko Salonen", pos: "G", team: "TPS", league: "Liiga", date: "Apr 8", rating: 7.0 },
];

const watchList = [
  { name: "Connor Sample", pos: "C", team: "London Knights", tier: "A", change: "+2" },
  { name: "Brady Miller", pos: "C", team: "Boston University", tier: "A", change: "—" },
  { name: "Erik Lindqvist", pos: "D", team: "Frölunda J20", tier: "B+", change: "+1" },
  { name: "Jake Thompson", pos: "RW", team: "Chicago Steel", tier: "B", change: "-1" },
];

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
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
                className="h-9 pl-9 pr-4 rounded-lg bg-secondary border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-56"
              />
            </div>
            <Button variant="hero" size="sm">
              <Plus className="w-4 h-4" />
              New Evaluation
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="font-heading text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm mb-8">Welcome back. Here's your scouting overview.</p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Players", value: "127", icon: Users, color: "text-primary" },
            { label: "Evaluations", value: "342", icon: ClipboardCheck, color: "text-primary" },
            { label: "Watch List", value: "24", icon: Star, color: "text-primary" },
            { label: "This Month", value: "18", icon: Calendar, color: "text-primary" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <TrendingUp className="w-3 h-3 text-green-500" />
              </div>
              <p className="font-heading text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recent evaluations — spans 2 cols */}
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
              <button className="text-xs text-primary flex items-center gap-1 hover:underline">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {recentEvaluations.map((player) => (
                <div
                  key={player.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-sunken hover:bg-secondary/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-heading font-bold text-primary">{player.pos}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.team} · {player.league}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{player.date}</span>
                    <span className="font-heading text-sm font-bold text-primary">{player.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Watch list */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="glass-card rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-base font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                Watch List
              </h3>
              <button className="text-xs text-primary flex items-center gap-1 hover:underline">
                Edit <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {watchList.map((player) => (
                <div
                  key={player.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-sunken hover:bg-secondary/60 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium">{player.name}</p>
                    <p className="text-xs text-muted-foreground">{player.pos} · {player.team}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-xs font-heading font-bold bg-primary/10 text-primary">
                      {player.tier}
                    </span>
                    <span className={`text-xs font-medium ${player.change.startsWith("+") ? "text-green-500" : player.change.startsWith("-") ? "text-red-400" : "text-muted-foreground"}`}>
                      {player.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="font-heading text-base font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "New Evaluation", icon: Plus },
                { label: "Browse Players", icon: Users },
                { label: "Generate Report", icon: ClipboardCheck },
              ].map((action) => (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-sunken hover:bg-primary/10 hover:text-primary transition-all text-sm font-medium"
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Upcoming games */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="md:col-span-2 glass-card rounded-xl p-6"
          >
            <h3 className="font-heading text-base font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-primary" />
              Upcoming Viewings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { date: "Apr 18", teams: "Knights vs Attack", league: "OHL", prospects: 3 },
                { date: "Apr 20", teams: "Steel vs Phantoms", league: "USHL", prospects: 2 },
                { date: "Apr 22", teams: "BU vs BC", league: "NCAA", prospects: 4 },
              ].map((game) => (
                <div key={game.teams} className="p-4 rounded-lg bg-surface-sunken">
                  <p className="text-xs text-primary font-heading font-semibold mb-1">{game.date}</p>
                  <p className="text-sm font-medium">{game.teams}</p>
                  <p className="text-xs text-muted-foreground mt-1">{game.league} · {game.prospects} prospects</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
