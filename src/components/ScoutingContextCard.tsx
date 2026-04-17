import { useEffect, useState } from "react";
import { Info, Loader2, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useScoutingData, type League, type Player } from "@/hooks/useScoutingData";
import { toast } from "sonner";
import type { ConfidenceResult } from "@/lib/scoutConfidence";

interface Props {
  player: Player;
  league: League | null;
}

const LEVEL_PRESETS = [
  "Adult Beer League — Beginner",
  "Adult Beer League — Intermediate",
  "Adult Beer League — Advanced",
  "Men's League D / Rec",
  "Men's League C",
  "Men's League B",
  "Men's League A",
  "High School JV",
  "High School Varsity",
  "Prep School",
  "U13 / Peewee AA-AAA",
  "U15 / Bantam AA-AAA",
  "U16 AAA",
  "U18 AAA",
  "Junior B / Tier 2",
  "Junior A / Tier 1",
  "USHL / NAHL",
  "OHL / WHL / QMJHL (CHL)",
  "NCAA D3",
  "NCAA D1",
  "Pro (ECHL / AHL / NHL)",
];

export function ScoutingContextCard({ player, league }: Props) {
  const { updatePlayer, updateLeague } = useScoutingData();
  const [level, setLevel] = useState(league?.level ?? "");
  const [context, setContext] = useState(player.player_context ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLevel(league?.level ?? "");
  }, [league?.id, league?.level]);

  useEffect(() => {
    setContext(player.player_context ?? "");
  }, [player.id, player.player_context]);

  const dirty =
    (league ? (level || null) !== (league.level || null) : false) ||
    (context || null) !== (player.player_context || null);

  const save = async () => {
    setSaving(true);
    try {
      const tasks: Promise<unknown>[] = [];
      if (league && (level || null) !== (league.level || null)) {
        tasks.push(updateLeague(league.id, { level: level.trim() || null }));
      }
      if ((context || null) !== (player.player_context || null)) {
        tasks.push(updatePlayer(player.id, { player_context: context.trim() || null }));
      }
      await Promise.all(tasks);
      toast.success("Scouting context saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save context");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-card rounded-xl p-6 mb-8">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="font-heading text-base font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Scouting Context
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Calibrates AI ratings & scouting language to the level being played. A '7' in beer league
            does not mean the same as a '7' in the OHL.
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">
            Competition Level
            {league ? (
              <span className="text-muted-foreground"> · saved on league "{league.name}"</span>
            ) : (
              <span className="text-muted-foreground"> · assign player to a team/league to save level</span>
            )}
          </Label>
          <Input
            list="level-presets"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="e.g. Adult Beer League — Intermediate"
            disabled={!league}
          />
          <datalist id="level-presets">
            {LEVEL_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Player Background</Label>
          <Textarea
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. 38 yrs old, started playing at 31 (lost 2 yrs to pandemic), forward, plays once a week."
          />
        </div>
      </div>
    </section>
  );
}
