import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ClipboardCheck, Search, Users, Plus, LayoutDashboard, Sparkles,
  LogOut, Menu, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useScoutingData } from "@/hooks/useScoutingData";

type Props = {
  /** Search box value (controlled). If omitted, search box is hidden. */
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  /** League filter value (controlled). If omitted, filter is hidden. */
  leagueFilter?: string;
  onLeagueFilterChange?: (v: string) => void;
  /** Right-side slot for page-specific actions (e.g. Export). */
  rightSlot?: ReactNode;
  /** Optional crumb shown after BarnNotes (e.g. "Players", "John Smith"). */
  crumb?: string;
  /** Triggered when user taps "Add Player" while not over the limit. */
  onAddPlayer?: () => void;
};

export const AppHeader = ({
  searchValue,
  onSearchChange,
  leagueFilter,
  onLeagueFilterChange,
  rightSlot,
  crumb,
  onAddPlayer,
}: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { tier } = useSubscription();
  const { players, leagues } = useScoutingData();

  const atLimit = players.length >= tier.playerLimit;
  const tryAddPlayer = () => {
    if (onAddPlayer) onAddPlayer();
    else navigate("/players");
  };

  const isActive = (path: string) =>
    path === "/dashboard" ? location.pathname === "/dashboard"
      : location.pathname.startsWith(path);

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, to: "/dashboard", onClick: () => navigate("/dashboard") },
    { label: "Browse Players", icon: Users, to: "/players", onClick: () => navigate("/players") },
    {
      label: "Add Player",
      icon: atLimit ? Lock : Plus,
      to: "__add",
      onClick: tryAddPlayer,
    },
    { label: `${tier.name} plan`, icon: Sparkles, to: "/pricing", onClick: () => navigate("/pricing") },
    { label: "Account", icon: undefined, to: "/account", onClick: () => navigate("/account") },
  ];

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
      {/* Top bar */}
      <div className="container flex items-center justify-between gap-2 h-14 px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
          <ClipboardCheck className="w-5 h-5 text-primary shrink-0" />
          <span className="font-heading text-base font-bold truncate">BarnNotes</span>
          {crumb && (
            <span className="hidden sm:inline text-muted-foreground text-sm truncate">/ {crumb}</span>
          )}
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {rightSlot && <div className="hidden sm:flex items-center gap-2">{rightSlot}</div>}
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => { await signOut(); navigate("/"); }}
            title={user?.email ?? "Log out"}
            className="hidden md:inline-flex"
          >
            <LogOut className="w-4 h-4" />
          </Button>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm p-0 flex flex-col">
              <SheetHeader className="px-5 py-4 border-b border-border/50">
                <SheetTitle className="text-left flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  BarnNotes
                </SheetTitle>
              </SheetHeader>
              <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.to !== "__add" && isActive(item.to);
                  return (
                    <SheetClose asChild key={item.label}>
                      <button
                        onClick={item.onClick}
                        className={`flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-left transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        {item.label}
                      </button>
                    </SheetClose>
                  );
                })}
              </nav>
              <div className="border-t border-border/50 p-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={async () => { await signOut(); navigate("/"); }}
                >
                  <LogOut className="w-4 h-4" />
                  {user?.email ? `Sign out (${user.email})` : "Sign out"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Sub-nav: links + filters + search */}
      <div className="border-t border-border/50">
        <div className="container flex items-center justify-between gap-3 h-12 px-4 sm:px-6">
          <div className="hidden md:flex items-center gap-1 min-w-0 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.to !== "__add" && isActive(item.to);
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium shrink-0 transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 md:flex-none md:ml-auto min-w-0">
            {onLeagueFilterChange && (
              <Select value={leagueFilter ?? "all"} onValueChange={onLeagueFilterChange}>
                <SelectTrigger className="h-9 w-32 sm:w-40 bg-secondary border-none text-sm shrink-0">
                  <SelectValue placeholder="All leagues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All leagues</SelectItem>
                  {leagues.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {onSearchChange && (
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchValue ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-9 pl-9 pr-4 rounded-lg bg-secondary border-none text-sm w-full md:w-56 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
