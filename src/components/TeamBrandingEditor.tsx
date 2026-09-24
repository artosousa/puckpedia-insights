import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Save, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeamBranding, type OrganizationRole } from "@/hooks/useTeamBranding";
import { hexToHslString, hslStringToHex } from "@/lib/theme";
import { toast } from "sonner";

export function TeamBrandingEditor() {
  const { branding, invitations, loading, saving, canManage, saveBranding, uploadLogo, removeLogo, inviteScout } = useTeamBranding();
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("16 78% 57%");
  const [secondary, setSecondary] = useState("198 72% 52%");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<OrganizationRole, "owner">>("member");

  useEffect(() => {
    if (!branding) return;
    setName(branding.name);
    setPrimary(branding.primaryColor);
    setSecondary(branding.secondaryColor);
  }, [branding]);

  if (loading) return <section className="glass-card rounded-xl p-6 mb-6 text-sm text-muted-foreground">Loading team branding…</section>;
  if (!branding) return null;

  const save = async () => {
    if (!name.trim()) return toast.error("Enter a team name.");
    try { await saveBranding({ name, primaryColor: primary, secondaryColor: secondary }); toast.success("Team branding saved."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save team branding."); }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    try { await uploadLogo(file); toast.success("Team logo updated."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not upload logo."); }
  };

  const invite = async () => {
    if (!email.trim()) return toast.error("Enter the scout’s email.");
    try { await inviteScout(email, role); setEmail(""); toast.success("Invitation is ready. They will join when signing in with that email."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not invite scout."); }
  };

  return (
    <section className="glass-card rounded-xl p-6 mb-6">
      <div className="mb-5">
        <h2 className="font-heading text-base font-semibold">Team branding</h2>
        <p className="text-xs text-muted-foreground mt-1">Shared with every scout on this team.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-[120px_1fr]">
        <div>
          <Label>Team logo</Label>
          <div className="mt-2 size-24 rounded-lg border border-border bg-surface-sunken flex items-center justify-center overflow-hidden">
            {branding.logoUrl ? <img src={branding.logoUrl} alt={`${branding.name} logo`} className="size-full object-contain p-2" /> : <ImagePlus className="size-7 text-muted-foreground" />}
          </div>
          {canManage && (
            <div className="flex gap-1 mt-2">
              <Button variant="outline" size="icon" className="size-9 relative" title={branding.logoPath ? "Replace team logo" : "Upload team logo"} disabled={saving}>
                <ImagePlus className="size-4" />
                <input aria-label="Upload team logo" type="file" accept="image/png,image/jpeg,image/webp" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(event) => upload(event.target.files?.[0])} />
              </Button>
              {branding.logoPath && <Button variant="outline" size="icon" className="size-9" title="Remove team logo" disabled={saving} onClick={async () => { try { await removeLogo(); toast.success("Team logo removed."); } catch { toast.error("Could not remove logo."); } }}><Trash2 /></Button>}
            </div>
          )}
        </div>
        <div className="grid gap-4">
          <div className="space-y-2"><Label htmlFor="team-name">Team name</Label><Input id="team-name" value={name} disabled={!canManage} maxLength={80} onChange={(event) => setName(event.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            {[{ label: "Primary", value: primary, set: setPrimary }, { label: "Secondary", value: secondary, set: setSecondary }].map((color) => (
              <div className="space-y-2" key={color.label}>
                <Label>{color.label}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" aria-label={`${color.label} team color`} value={hslStringToHex(color.value)} disabled={!canManage} onChange={(event) => color.set(hexToHslString(event.target.value))} className="size-10 rounded border border-border bg-transparent p-0" />
                  <span className="text-xs text-muted-foreground">{hslStringToHex(color.value).toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
          {canManage && <Button variant="hero" size="sm" className="w-fit" disabled={saving} onClick={save}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Save branding</Button>}
          {!canManage && <p className="text-xs text-muted-foreground">Only team owners and admins can change branding.</p>}
        </div>
      </div>
      {canManage && (
        <div className="border-t border-border mt-6 pt-5">
          <h3 className="font-heading text-sm font-semibold">Invite a scout</h3>
          <div className="grid sm:grid-cols-[1fr_130px_auto] gap-2 mt-3">
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="scout@team.com" />
            <Select value={role} onValueChange={(value) => setRole(value as Exclude<OrganizationRole, "owner">)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="member">Member</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
            <Button variant="outline" onClick={invite}><UserPlus />Invite</Button>
          </div>
          {invitations.filter((item) => !item.acceptedAt).length > 0 && <p className="text-xs text-muted-foreground mt-3">{invitations.filter((item) => !item.acceptedAt).length} pending invitation{invitations.filter((item) => !item.acceptedAt).length === 1 ? "" : "s"}</p>}
        </div>
      )}
    </section>
  );
}