import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type League = { id: string; name: string; abbreviation: string | null; level: string | null };
export type Team = { id: string; name: string; league_id: string | null };
export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  shoots: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  jersey_number: number | null;
  team_id: string | null;
  player_context: string | null;
  created_at: string;
};
export type Viewing = {
  id: string;
  player_id: string;
  game_date: string;
  opponent: string | null;
  location: string | null;
  notes: string | null;
  rating_skating: number | null;
  rating_shot: number | null;
  rating_hands: number | null;
  rating_iq: number | null;
  rating_compete: number | null;
  rating_physicality: number | null;
  rating_overall: number | null;
  projection: string | null;
  created_at: string;
};

type Ctx = {
  leagues: League[];
  teams: Team[];
  players: Player[];
  viewings: Viewing[];
  loading: boolean;
  refresh: () => Promise<void>;
  createLeague: (name: string) => Promise<string>;
  createTeam: (name: string, league_id: string | null) => Promise<string>;
  createPlayer: (input: Omit<Player, "id" | "created_at">) => Promise<Player>;
  createViewing: (input: Omit<Viewing, "id" | "created_at">) => Promise<Viewing>;
  updatePlayer: (id: string, patch: Partial<Player>) => Promise<void>;
  updateLeague: (id: string, patch: Partial<League>) => Promise<void>;
  updateViewing: (id: string, patch: Partial<Viewing>) => Promise<void>;
};

const ScoutingContext = createContext<Ctx | null>(null);

export const ScoutingDataProvider = ({ children }: { children: ReactNode }) => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const refresh = useCallback(async () => {
    if (!user) {
      setLeagues([]); setTeams([]); setPlayers([]); setViewings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [l, t, p, v] = await Promise.all([
      supabase.from("leagues").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
      supabase.from("players").select("*").order("last_name"),
      supabase.from("viewings").select("*").order("game_date", { ascending: false }),
    ]);
    setLeagues(l.data ?? []);
    setTeams(t.data ?? []);
    setPlayers(p.data ?? []);
    setViewings(v.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createLeague = async (name: string): Promise<string> => {
    const { data, error } = await supabase
      .from("leagues")
      .insert({ name })
      .select()
      .single();
    if (error) throw error;
    setLeagues((prev) => [...prev, data]);
    return data.id;
  };

  const createTeam = async (name: string, league_id: string | null): Promise<string> => {
    const { data, error } = await supabase
      .from("teams")
      .insert({ name, league_id })
      .select()
      .single();
    if (error) throw error;
    setTeams((prev) => [...prev, data]);
    return data.id;
  };

  const createPlayer = async (input: Omit<Player, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("players")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    setPlayers((prev) => [data, ...prev]);
    return data;
  };

  const createViewing = async (input: Omit<Viewing, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("viewings")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    setViewings((prev) => [data, ...prev]);
    return data;
  };

  const updatePlayer = async (id: string, patch: Partial<Player>) => {
    const { error } = await supabase.from("players").update(patch as any).eq("id", id);
    if (error) throw error;
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } as Player : p)));
  };

  const updateLeague = async (id: string, patch: Partial<League>) => {
    const { error } = await supabase.from("leagues").update(patch as any).eq("id", id);
    if (error) throw error;
    setLeagues((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } as League : l)));
  };

  const updateViewing = async (id: string, patch: Partial<Viewing>) => {
    const { error } = await supabase.from("viewings").update(patch as any).eq("id", id);
    if (error) throw error;
    setViewings((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } as Viewing : v)));
  };

  return (
    <ScoutingContext.Provider
      value={{ leagues, teams, players, viewings, loading, refresh, createLeague, createTeam, createPlayer, createViewing, updatePlayer, updateLeague, updateViewing }}
    >
      {children}
    </ScoutingContext.Provider>
  );
};

export const useScoutingData = (): Ctx => {
  const ctx = useContext(ScoutingContext);
  if (!ctx) throw new Error("useScoutingData must be used within ScoutingDataProvider");
  return ctx;
};
