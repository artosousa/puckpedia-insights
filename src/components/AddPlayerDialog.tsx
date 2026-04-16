import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AutocompleteCreate } from "@/components/AutocompleteCreate";
import { useScoutingData } from "@/hooks/useScoutingData";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const POSITIONS = ["C", "LW", "RW", "D", "G"];
const SHOOTS = ["L", "R"];

export const AddPlayerDialog = ({ open, onOpenChange }: Props) => {
  const { leagues, teams, createLeague, createTeam, createPlayer } = useScoutingData();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState<string>("");
  const [shoots, setShoots] = useState<string>("");
  const [dob, setDob] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [jersey, setJersey] = useState("");
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const teamOptions = teams
    .filter((t) => !leagueId || t.league_id === leagueId)
    .map((t) => ({ id: t.id, label: t.name }));

  const reset = () => {
    setFirstName(""); setLastName(""); setPosition(""); setShoots("");
    setDob(""); setHeight(""); setWeight(""); setJersey("");
    setLeagueId(null); setTeamId(null);
  };

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    setSaving(true);
    try {
      await createPlayer({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        position: position || null,
        shoots: shoots || null,
        date_of_birth: dob || null,
        height_cm: height ? parseInt(height) : null,
        weight_kg: weight ? parseInt(weight) : null,
        jersey_number: jersey ? parseInt(jersey) : null,
        team_id: teamId,
      });
      toast.success(`${firstName} ${lastName} added`);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add player");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Add Player</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label>First name *</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Last name *</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-surface-sunken border border-border/50 text-sm"
            >
              <option value="">—</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Shoots</Label>
            <select
              value={shoots}
              onChange={(e) => setShoots(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-surface-sunken border border-border/50 text-sm"
            >
              <option value="">—</option>
              {SHOOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Date of birth</Label>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Jersey #</Label>
            <Input type="number" value={jersey} onChange={(e) => setJersey(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Height (cm)</Label>
            <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>League</Label>
            <AutocompleteCreate
              value={leagueId}
              options={leagues.map((l) => ({ id: l.id, label: l.name }))}
              onSelect={(id) => { setLeagueId(id); setTeamId(null); }}
              onCreate={createLeague}
              placeholder="Search or create league (e.g. OHL, U18 AAA Ontario)"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Team</Label>
            <AutocompleteCreate
              value={teamId}
              options={teamOptions}
              onSelect={setTeamId}
              onCreate={(name) => createTeam(name, leagueId)}
              placeholder={leagueId ? "Search or create team" : "Pick a league first (or create team without one)"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="hero" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Add Player"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
