import { supabase } from "@/integrations/supabase/client";

export type MediaKind = "photo" | "video";

export interface TrackKeyframe {
  /** time in seconds (absolute, source video) */
  t: number;
  /** crop rect in normalized 0..1 coords (centerX, centerY, width, height) */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface MediaEdit {
  /** trim in/out in seconds (absolute, source video) */
  trim?: { in: number; out: number } | null;
  /** keyframes for tracking the player; interpolated linearly between */
  track?: TrackKeyframe[];
}

export interface PlayerMedia {
  id: string;
  user_id: string;
  player_id: string;
  viewing_id: string | null;
  kind: MediaKind;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  tags: string[];
  notes: string | null;
  ai_analysis: string | null;
  ai_analyzed_at: string | null;
  edit: MediaEdit | null;
  created_at: string;
}

export const BUCKET = "player-media";

export async function listPlayerMedia(playerId: string): Promise<PlayerMedia[]> {
  const { data, error } = await supabase
    .from("player_media" as any)
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PlayerMedia[];
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = v.duration;
      URL.revokeObjectURL(v.src);
      resolve(isFinite(d) ? d : 0);
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}

export interface UploadInput {
  file: File;
  userId: string;
  playerId: string;
  viewingId: string | null;
  kind: MediaKind;
  tags: string[];
  notes?: string | null;
  durationSeconds?: number | null;
}

export async function uploadPlayerMedia(input: UploadInput): Promise<PlayerMedia> {
  const { file, userId, playerId, viewingId, kind, tags, notes, durationSeconds } = input;
  const ext = file.name.split(".").pop() || (kind === "photo" ? "jpg" : "mp4");
  const scope = viewingId ?? "gallery";
  const path = `${userId}/${playerId}/${scope}/${crypto.randomUUID()}.${ext}`;

  const upload = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const { data, error } = await supabase
    .from("player_media" as any)
    .insert({
      player_id: playerId,
      viewing_id: viewingId,
      kind,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      duration_seconds: durationSeconds ?? null,
      tags,
      notes: notes ?? null,
    })
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data as unknown as PlayerMedia;
}

export async function deletePlayerMedia(media: PlayerMedia): Promise<void> {
  await supabase.storage.from(BUCKET).remove([media.storage_path]);
  const { error } = await supabase.from("player_media" as any).delete().eq("id", media.id);
  if (error) throw error;
}

export async function setMediaAnalysis(id: string, analysis: string): Promise<void> {
  const { error } = await supabase
    .from("player_media" as any)
    .update({ ai_analysis: analysis, ai_analyzed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateMediaEdit(id: string, edit: MediaEdit | null): Promise<void> {
  const { error } = await supabase
    .from("player_media" as any)
    .update({ edit })
    .eq("id", id);
  if (error) throw error;
}

export async function updateMediaMeta(
  id: string,
  patch: { tags?: string[]; notes?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from("player_media" as any)
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

/** Linearly interpolate a tracking rect at time `t`. Returns null when no keyframes. */
export function rectAtTime(track: TrackKeyframe[] | undefined | null, t: number): TrackKeyframe | null {
  if (!track || track.length === 0) return null;
  const sorted = [...track].sort((a, b) => a.t - b.t);
  if (t <= sorted[0].t) return sorted[0];
  if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const k = (t - a.t) / span;
      return {
        t,
        cx: a.cx + (b.cx - a.cx) * k,
        cy: a.cy + (b.cy - a.cy) * k,
        w: a.w + (b.w - a.w) * k,
        h: a.h + (b.h - a.h) * k,
      };
    }
  }
  return sorted[sorted.length - 1];
}
