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

const FRAME_CAPTURE_MAX_DIMENSION = 1280;
const FRAME_CAPTURE_EPSILON_SECONDS = 0.05;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function loadVideoForFrameCapture(url: string): Promise<HTMLVideoElement> {
  return await new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
    };

    const onLoadedMetadata = () => {
      cleanup();
      resolve(video);
    };

    const onError = () => {
      cleanup();
      reject(new Error("Couldn't load this video for AI analysis."));
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onError);
    video.src = url;
    video.load();
  });
}

async function seekVideoForFrameCapture(video: HTMLVideoElement, time: number) {
  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Couldn't capture a frame from this video."));
    };

    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });

  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export async function extractVideoAnalysisFrame(media: Pick<PlayerMedia, "storage_path" | "duration_seconds" | "edit">) {
  const url = await getSignedUrl(media.storage_path, 600);
  const video = await loadVideoForFrameCapture(url);

  try {
    const duration = Number.isFinite(video.duration) ? video.duration : (media.duration_seconds ?? 0);
    const trimIn = media.edit?.trim?.in ?? 0;
    const trimOut = media.edit?.trim?.out ?? duration;
    const safeTrimOut = trimOut > trimIn ? trimOut : duration;
    const firstKeyframeTime = media.edit?.track?.[0]?.t;
    const fallbackTime = safeTrimOut > trimIn ? trimIn + Math.min(0.5, (safeTrimOut - trimIn) / 2) : trimIn;
    const unclampedTime = firstKeyframeTime ?? fallbackTime;
    const maxTime = Math.max(0, duration - FRAME_CAPTURE_EPSILON_SECONDS);
    const frameTime = clamp(unclampedTime, 0, maxTime);

    await seekVideoForFrameCapture(video, frameTime);

    const crop = rectAtTime(media.edit?.track, frameTime);
    const sourceWidth = video.videoWidth || 1;
    const sourceHeight = video.videoHeight || 1;

    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (crop) {
      const left = clamp(crop.cx - crop.w / 2, 0, 1);
      const top = clamp(crop.cy - crop.h / 2, 0, 1);
      const right = clamp(crop.cx + crop.w / 2, 0, 1);
      const bottom = clamp(crop.cy + crop.h / 2, 0, 1);

      sx = Math.floor(left * sourceWidth);
      sy = Math.floor(top * sourceHeight);
      sw = Math.max(1, Math.floor((right - left) * sourceWidth));
      sh = Math.max(1, Math.floor((bottom - top) * sourceHeight));
    }

    const scale = Math.min(1, FRAME_CAPTURE_MAX_DIMENSION / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Couldn't prepare the video frame for AI analysis.");
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.88),
      frameTime,
      cropped: Boolean(crop),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "SecurityError") {
      throw new Error("Couldn't capture the video frame. Reopen the clip and try again.");
    }
    throw error;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
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
