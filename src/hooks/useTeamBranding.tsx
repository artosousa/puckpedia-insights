import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type OrganizationRole = "owner" | "admin" | "member";

export type TeamBranding = {
  organizationId: string;
  name: string;
  logoPath: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  role: OrganizationRole;
};

type TeamMember = { id: string; userId: string; role: OrganizationRole };
type TeamInvite = { id: string; email: string; role: OrganizationRole; expiresAt: string; acceptedAt: string | null };

type BrandingContextValue = {
  branding: TeamBranding | null;
  members: TeamMember[];
  invitations: TeamInvite[];
  loading: boolean;
  saving: boolean;
  canManage: boolean;
  saveBranding: (values: { name: string; primaryColor: string; secondaryColor: string }) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  removeLogo: () => Promise<void>;
  inviteScout: (email: string, role: Exclude<OrganizationRole, "owner">) => Promise<void>;
  refresh: () => Promise<void>;
};

const CACHE_KEY = "barnnotes-last-team-brand";
const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

function applyBrandColors(primary: string, secondary: string) {
  const root = document.documentElement;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-ring", primary);
  root.style.setProperty("--ember", primary);
  root.style.setProperty("--accent", secondary);
}

function cacheBranding(branding: TeamBranding) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    name: branding.name,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
  }));
}

export function getCachedTeamBranding(): Pick<TeamBranding, "name" | "logoUrl" | "primaryColor" | "secondaryColor"> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function TeamBrandingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [branding, setBranding] = useState<TeamBranding | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setBranding(null);
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    await supabase.rpc("claim_organization_invitations");
    const { data: organizationId, error: ensureError } = await supabase.rpc("ensure_default_organization");
    if (ensureError || !organizationId) {
      setLoading(false);
      throw ensureError ?? new Error("Could not load your team");
    }
    const [{ data: organization }, { data: membership }, { data: brand }, { data: memberRows }, { data: inviteRows }] = await Promise.all([
      supabase.from("organizations").select("name").eq("id", organizationId).single(),
      supabase.from("organization_memberships").select("role").eq("organization_id", organizationId).eq("user_id", user.id).single(),
      supabase.from("organization_branding").select("logo_path, primary_color, secondary_color").eq("organization_id", organizationId).maybeSingle(),
      supabase.from("organization_memberships").select("id, user_id, role").eq("organization_id", organizationId).order("created_at"),
      supabase.from("organization_invitations").select("id, email, role, expires_at, accepted_at").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    ]);
    let logoUrl: string | null = null;
    if (brand?.logo_path) {
      const { data } = await supabase.storage.from("team-branding").createSignedUrl(brand.logo_path, 604800);
      logoUrl = data?.signedUrl ?? null;
    }
    const next: TeamBranding = {
      organizationId,
      name: organization?.name ?? "My Scouting Team",
      logoPath: brand?.logo_path ?? null,
      logoUrl,
      primaryColor: brand?.primary_color ?? "16 78% 57%",
      secondaryColor: brand?.secondary_color ?? "198 72% 52%",
      role: (membership?.role as OrganizationRole | undefined) ?? "member",
    };
    setBranding(next);
    setMembers((memberRows ?? []).map((row) => ({ id: row.id, userId: row.user_id, role: row.role as OrganizationRole })));
    setInvitations((inviteRows ?? []).map((row) => ({ id: row.id, email: row.email, role: row.role as OrganizationRole, expiresAt: row.expires_at, acceptedAt: row.accepted_at })));
    applyBrandColors(next.primaryColor, next.secondaryColor);
    cacheBranding(next);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  const saveBranding = useCallback(async (values: { name: string; primaryColor: string; secondaryColor: string }) => {
    if (!branding) return;
    setSaving(true);
    try {
      const [organizationResult, brandResult] = await Promise.all([
        supabase.from("organizations").update({ name: values.name.trim() }).eq("id", branding.organizationId),
        supabase.from("organization_branding").upsert({ organization_id: branding.organizationId, primary_color: values.primaryColor, secondary_color: values.secondaryColor }),
      ]);
      if (organizationResult.error) throw organizationResult.error;
      if (brandResult.error) throw brandResult.error;
      await load();
    } finally {
      setSaving(false);
    }
  }, [branding, load]);

  const uploadLogo = useCallback(async (file: File) => {
    if (!branding) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) throw new Error("Choose a PNG, JPEG, or WebP image.");
    if (file.size > 2 * 1024 * 1024) throw new Error("Logo must be 2 MB or smaller.");
    setSaving(true);
    try {
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${branding.organizationId}/logo-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("team-branding").upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from("organization_branding").upsert({ organization_id: branding.organizationId, logo_path: path });
      if (updateError) throw updateError;
      if (branding.logoPath) await supabase.storage.from("team-branding").remove([branding.logoPath]);
      await load();
    } finally {
      setSaving(false);
    }
  }, [branding, load]);

  const removeLogo = useCallback(async () => {
    if (!branding) return;
    setSaving(true);
    try {
      if (branding.logoPath) await supabase.storage.from("team-branding").remove([branding.logoPath]);
      const { error } = await supabase.from("organization_branding").update({ logo_path: null }).eq("organization_id", branding.organizationId);
      if (error) throw error;
      await load();
    } finally {
      setSaving(false);
    }
  }, [branding, load]);

  const inviteScout = useCallback(async (email: string, role: Exclude<OrganizationRole, "owner">) => {
    if (!branding || !user) return;
    const { error } = await supabase.from("organization_invitations").upsert({
      organization_id: branding.organizationId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: user.id,
      accepted_at: null,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    }, { onConflict: "organization_id,email" });
    if (error) throw error;
    await load();
  }, [branding, user, load]);

  const value = useMemo(() => ({
    branding, members, invitations, loading, saving,
    canManage: branding?.role === "owner" || branding?.role === "admin",
    saveBranding, uploadLogo, removeLogo, inviteScout, refresh: load,
  }), [branding, members, invitations, loading, saving, saveBranding, uploadLogo, removeLogo, inviteScout, load]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useTeamBranding() {
  const context = useContext(BrandingContext);
  if (!context) throw new Error("useTeamBranding must be used within TeamBrandingProvider");
  return context;
}