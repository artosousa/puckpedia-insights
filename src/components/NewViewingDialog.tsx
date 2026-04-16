import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useScoutingData, type Player } from "@/hooks/useScoutingData";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: Player | null;
}

const RATING_FIELDS = [
  { key: "rating_skating", label: "Skating" },
  { key: "rating_shot", label: "Shot" },
  { key: "rating_hands", label: "Hands" },
  { key: "rating_iq", label: "Hockey IQ" },
  { key: "rating_compete", label: "Compete" },
  { key: "rating_physicality", label: "Physicality" },
] as const;

const PROJECTIONS = ["NHL Top 6", "NHL Bottom 6", "AHL", "ECHL", "NCAA", "European Pro", "Unknown"];

export const NewViewingDialog = ({ open, onOpenChange, player }: Props) => {
  const { createViewing } = useScoutingData();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [projection, setProjection] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({
    rating_skating: 5, rating_shot: 5, rating_hands: 5,
    rating_iq: 5, rating_compete: 5, rating_physicality: 5,
  });
  const [saving, setSaving] = useState(false);

  const overall = Math.round(
    Object.values(ratings).reduce((a, b) => a + b, 0) / RATING_FIELDS.length * 10
  ) / 10;

  const submit = async () => {
    if (!player) return;
    setSaving(true);
    try {
      await createViewing({
        player_id: player.id,
        game_date: date,
        opponent: opponent || null,
        location: location || null,
        notes: notes || null,
        projection: projection || null,
        rating_overall: Math.round(overall),
        ...ratings,
      } as any);
      toast.success("Viewing saved");
      onOpenChange(false);
      setNotes(""); setOpponent(""); setLocation(""); setProjection("");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            New Viewing {player && <span className="text-primary">· {player.first_name} {player.last_name}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Opponent</Label>
              <Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="e.g. Sudbury Wolves" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Rink / city" />
            </div>
          </div>

          <div className="rounded-xl bg-surface-sunken p-5">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-heading">Ratings (1-10)</Label>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Overall</p>
                <p className="font-heading text-2xl font-bold text-primary">{overall.toFixed(1)}</p>
              </div>
            </div>
            <div className="space-y-4">
              {RATING_FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm">{f.label}</span>
                    <span className="text-sm font-mono font-semibold text-primary">{ratings[f.key]}</span>
                  </div>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[ratings[f.key]]}
                    onValueChange={(v) => setRatings((r) => ({ ...r, [f.key]: v[0] }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Projection</Label>
            <select
              value={projection}
              onChange={(e) => setProjection(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-surface-sunken border border-border/50 text-sm"
            >
              <option value="">—</option>
              {PROJECTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Shift-by-shift observations, standout plays, concerns..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="hero" onClick={submit} disabled={saving || !player}>
            {saving ? "Saving..." : "Save Viewing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
