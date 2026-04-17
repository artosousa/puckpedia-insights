import React, { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Video, Trash2, Sparkles, Loader2, Lock, Upload, X, Maximize2, Crop } from "lucide-react";
import { TrackedVideo } from "@/components/TrackedVideo";
import { VideoEditorDialog } from "@/components/VideoEditorDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { mediaCapabilities, MEDIA_LIMITS, SKILL_TAGS } from "@/lib/tiers";
import {
  deletePlayerMedia,
  getSignedUrl,
  getVideoDuration,
  listPlayerMedia,
  setMediaAnalysis,
  updateMediaMeta,
  uploadPlayerMedia,
  type PlayerMedia,
} from "@/lib/playerMedia";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  playerId: string;
  viewingId?: string | null;
  /** When true, only show media tied to viewingId (or all when null). */
  scope?: "all" | "viewing" | "gallery";
  title?: string;
}

export function PlayerMediaPanel({ playerId, viewingId = null, scope = "all", title = "Media" }: Props) {
  const { user } = useAuth();
  const { tierId } = useSubscription();
  const caps = mediaCapabilities(tierId);
  const [items, setItems] = useState<PlayerMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<PlayerMedia | null>(null);
  const [editing, setEditing] = useState<PlayerMedia | null>(null);
  /** IDs of items just uploaded that still need tags. */
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const all = await listPlayerMedia(playerId);
      const filtered = all.filter((m) => {
        if (scope === "viewing") return m.viewing_id === viewingId;
        if (scope === "gallery") return m.viewing_id == null;
        return true;
      });
      setItems(filtered);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load media");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, viewingId, scope]);

  const onFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const list = Array.from(files);
    setUploading(true);
    const newlyUploaded: PlayerMedia[] = [];
    try {
      for (const file of list) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) {
          toast.error(`${file.name}: unsupported file type`);
          continue;
        }
        if (isVideo && !caps.canUploadVideos) {
          toast.error("Videos require 2nd Line or 1st Line plan");
          continue;
        }
        if (isImage && !caps.canUploadPhotos) {
          toast.error("Photos are not enabled on your plan");
          continue;
        }
        if (isImage && file.size > MEDIA_LIMITS.photoMaxBytes) {
          toast.error(`${file.name}: photo exceeds 10 MB`);
          continue;
        }
        if (isVideo && file.size > MEDIA_LIMITS.videoMaxBytes) {
          toast.error(`${file.name}: video exceeds 100 MB`);
          continue;
        }
        let duration: number | null = null;
        if (isVideo) {
          duration = await getVideoDuration(file);
          if (duration > MEDIA_LIMITS.videoMaxSeconds + 1) {
            toast.error(`${file.name}: video exceeds 60s (${Math.round(duration)}s)`);
            continue;
          }
        }
        const created = await uploadPlayerMedia({
          file,
          userId: user.id,
          playerId,
          viewingId: viewingId ?? null,
          kind: isVideo ? "video" : "photo",
          tags: [],
          notes: null,
          durationSeconds: duration,
        });
        newlyUploaded.push(created);
      }
      if (newlyUploaded.length > 0) {
        toast.success(`Uploaded ${newlyUploaded.length} file${newlyUploaded.length > 1 ? "s" : ""} — add tags below`);
        setItems((prev) => [...newlyUploaded, ...prev]);
        setPendingTagIds((prev) => [...newlyUploaded.map((m) => m.id), ...prev]);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (m: PlayerMedia) => {
    if (!confirm("Delete this media?")) return;
    try {
      await deletePlayerMedia(m);
      setItems((prev) => prev.filter((x) => x.id !== m.id));
      setPendingTagIds((prev) => prev.filter((id) => id !== m.id));
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  const onAnalyze = async (m: PlayerMedia) => {
    if (!caps.canAiAnalyze) {
      toast.error("AI analysis is available on the 1st Line plan");
      return;
    }
    setAnalyzingId(m.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-player-media", {
        body: { media_id: m.id },
      });
      // Surface the real server error (e.g. "Video too large…", rate limit, credits)
      if (error) {
        // FunctionsHttpError exposes context.response with the JSON body
        let serverMsg: string | null = null;
        try {
          const resp = (error as any)?.context?.response;
          if (resp && typeof resp.json === "function") {
            const body = await resp.json();
            serverMsg = body?.error ?? null;
          }
        } catch { /* ignore */ }
        throw new Error(serverMsg ?? error.message ?? "Analysis failed");
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      const analysis = (data as any).analysis as string;
      await setMediaAnalysis(m.id, analysis);
      setItems((prev) => prev.map((x) => (x.id === m.id ? { ...x, ai_analysis: analysis, ai_analyzed_at: new Date().toISOString() } : x)));
      setExpanded((cur) => (cur && cur.id === m.id ? { ...cur, ai_analysis: analysis, ai_analyzed_at: new Date().toISOString() } : cur));
      toast.success("AI analysis complete");
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed");
    } finally {
      setAnalyzingId(null);
    }
  };

  const saveTagsFor = async (id: string, tags: string[], notes: string | null) => {
    try {
      await updateMediaMeta(id, { tags, notes });
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, tags, notes } : x)));
      setPendingTagIds((prev) => prev.filter((p) => p !== id));
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  };

  const skipTagging = (id: string) => {
    setPendingTagIds((prev) => prev.filter((p) => p !== id));
  };

  const accept = caps.canUploadVideos ? "image/*,video/*" : caps.canUploadPhotos ? "image/*" : "";
  const pendingItems = items.filter((m) => pendingTagIds.includes(m.id));

  return (
    <section className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="font-heading text-base font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {caps.canUploadVideos ? "Photos ≤10 MB · Videos ≤100 MB / 60s" : "Photos ≤10 MB · Upgrade for video"}
            {caps.canAiAnalyze ? " · AI analysis enabled" : ""}
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {accept && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && fileRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!uploading) setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!uploading && !dragActive) setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only deactivate when leaving the dropzone itself, not its children
            if (e.currentTarget === e.target) setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            if (uploading) return;
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onFiles(e.dataTransfer.files);
            }
          }}
          aria-disabled={uploading}
          className={`w-full mb-5 p-6 rounded-lg border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            dragActive
              ? "border-primary bg-primary/10 scale-[1.01] shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
              : "border-border hover:border-primary/60 bg-surface-sunken"
          } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <Upload className={`w-5 h-5 text-primary transition-transform ${dragActive ? "scale-125" : ""}`} />
          )}
          <span className="text-sm font-medium text-foreground">
            {uploading
              ? "Uploading…"
              : dragActive
              ? "Drop to upload"
              : "Upload photos or videos"}
          </span>
          <span className="text-xs text-muted-foreground">
            {dragActive ? "Release to add files" : "Drag & drop or click to browse · tags added after upload"}
          </span>
        </div>
      )}

      {!caps.canUploadVideos && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 text-xs flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
          <span><strong>2nd Line</strong> unlocks video uploads. <strong>1st Line</strong> adds AI analysis of photos and videos.</span>
        </div>
      )}

      {pendingItems.length > 0 && (
        <div className="mb-5 space-y-3">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            Tag your {pendingItems.length === 1 ? "upload" : `${pendingItems.length} uploads`}
          </p>
          {pendingItems.map((m) => (
            <PendingTagCard
              key={m.id}
              media={m}
              onSave={(tags, notes) => saveTagsFor(m.id, tags, notes)}
              onSkip={() => skipTagging(m.id)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Loading media…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No media yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((m) => (
            <MediaCard
              key={m.id}
              media={m}
              onDelete={() => onDelete(m)}
              onAnalyze={() => onAnalyze(m)}
              analyzing={analyzingId === m.id}
              canAiAnalyze={caps.canAiAnalyze}
              onExpand={() => setExpanded(m)}
              onEdit={() => setEditing(m)}
            />
          ))}
        </div>
      )}

      <VideoEditorDialog
        media={editing}
        onClose={() => setEditing(null)}
        onSaved={(edit) => {
          setItems((prev) => prev.map((x) => (editing && x.id === editing.id ? { ...x, edit } : x)));
        }}
      />

      <MediaViewerDialog
        media={expanded}
        onClose={() => setExpanded(null)}
        onAnalyze={expanded ? () => onAnalyze(expanded) : () => {}}
        analyzing={expanded ? analyzingId === expanded.id : false}
        canAiAnalyze={caps.canAiAnalyze}
      />
    </section>
  );
}

function PendingTagCard({
  media,
  onSave,
  onSkip,
}: {
  media: PlayerMedia;
  onSave: (tags: string[], notes: string | null) => void;
  onSkip: () => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [notes, setNotes] = useState("");
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedUrl(media.storage_path)
      .then((u) => {
        if (!cancelled) setThumbUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [media.storage_path]);

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t || tags.includes(t)) return;
    setTags((p) => [...p, t]);
    setCustomTag("");
  };

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 flex flex-col sm:flex-row gap-4">
      <div className="w-full sm:w-32 h-32 sm:h-24 shrink-0 rounded overflow-hidden bg-black/40 flex items-center justify-center">
        {thumbUrl ? (
          media.kind === "photo" ? (
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <video src={thumbUrl} muted className="w-full h-full object-cover" />
          )
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {media.kind === "photo" ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
          Just uploaded · add tags &amp; context
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SKILL_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${
                tags.includes(t)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {t}
            </button>
          ))}
          {tags
            .filter((t) => !SKILL_TAGS.includes(t as any))
            .map((t) => (
              <span
                key={t}
                className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1"
              >
                {t}
                <button onClick={() => toggleTag(t)} aria-label={`Remove ${t}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder="Custom tag (e.g. zone-entry, PP1)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTag();
              }
            }}
            className="text-xs h-8"
          />
          <Button size="sm" variant="outline" onClick={addCustomTag} disabled={!customTag.trim()}>
            Add
          </Button>
        </div>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional caption / context"
          className="text-xs"
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button size="sm" variant="hero" onClick={() => onSave(tags, notes.trim() || null)}>
            Save tags
          </Button>
        </div>
      </div>
    </div>
  );
}

function MediaCard({
  media,
  onDelete,
  onAnalyze,
  analyzing,
  canAiAnalyze,
  onExpand,
  onEdit,
}: {
  media: PlayerMedia;
  onDelete: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  canAiAnalyze: boolean;
  onExpand: () => void;
  onEdit: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedUrl(media.storage_path).then((u) => {
      if (!cancelled) setUrl(u);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [media.storage_path]);

  return (
    <div className="rounded-lg border border-border/50 bg-surface-sunken overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-black/40 flex items-center justify-center group">
        {url ? (
          media.kind === "photo" ? (
            <img src={url} alt="" className="w-full h-full object-cover cursor-zoom-in" onClick={onExpand} />
          ) : (
            <TrackedVideo src={url} edit={media.edit} className="w-full h-full" />
          )
        ) : (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        )}
        <button
          onClick={onExpand}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
          aria-label="Expand"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            {media.kind === "photo" ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
            {media.kind}
            {media.duration_seconds ? ` · ${Math.round(media.duration_seconds)}s` : ""}
            {media.edit?.trim || (media.edit?.track && media.edit.track.length > 0) ? " · edited" : ""}
          </span>
          <div className="flex items-center gap-2">
            {media.kind === "video" && (
              <button
                onClick={onEdit}
                className="text-muted-foreground hover:text-primary transition"
                aria-label="Edit clip"
                title="Trim & track"
              >
                <Crop className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onExpand}
              className="text-muted-foreground hover:text-primary transition"
              aria-label="Expand"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive transition"
              aria-label="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {media.tags.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                {t}
              </span>
            ))}
          </div>
        )}
        {media.notes && <p className="text-xs text-muted-foreground line-clamp-2">{media.notes}</p>}
        {media.ai_analysis ? (() => {
          const parsed = parseRatings(media.ai_analysis);
          return (
            <div className="text-xs bg-background/50 p-2 rounded border border-border/30 max-h-72 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-primary">
                  <Sparkles className="w-3 h-3" />
                  <span className="font-semibold">AI analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  {canAiAnalyze && (
                    <button
                      onClick={onAnalyze}
                      disabled={analyzing}
                      className="text-[10px] text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Re-analyze
                    </button>
                  )}
                  <button onClick={onExpand} className="text-[10px] text-primary hover:underline">
                    Expand
                  </button>
                </div>
              </div>
              {parsed.ratings && <CompactRatings ratings={parsed.ratings} />}
              <p className="text-muted-foreground whitespace-pre-wrap line-clamp-4">{parsed.text}</p>
            </div>
          );
        })() : (
          canAiAnalyze && (
            <Button size="sm" variant="outline" onClick={onAnalyze} disabled={analyzing} className="mt-auto">
              {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Analyze with AI
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function MediaViewerDialog({
  media,
  onClose,
  onAnalyze,
  analyzing,
  canAiAnalyze,
}: {
  media: PlayerMedia | null;
  onClose: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  canAiAnalyze: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!media) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    getSignedUrl(media.storage_path).then((u) => {
      if (!cancelled) setUrl(u);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [media?.storage_path]);

  const { ratings, text: analysisText } = parseRatings(media?.ai_analysis ?? "");
  const sections = parseAnalysisSections(analysisText);

  return (
    <Dialog open={!!media} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base">
            {media?.kind === "photo" ? <ImageIcon className="w-4 h-4 text-primary" /> : <Video className="w-4 h-4 text-primary" />}
            {media?.kind === "photo" ? "Photo" : "Video"} review
            {media?.duration_seconds ? <span className="text-xs text-muted-foreground font-normal">· {Math.round(media.duration_seconds)}s</span> : null}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] flex-1 min-h-0 overflow-hidden">
          <div className="bg-black flex items-center justify-center min-h-[280px] lg:min-h-0">
            {url && media ? (
              media.kind === "photo" ? (
                <img src={url} alt="" className="max-w-full max-h-[80vh] object-contain" />
              ) : (
                <TrackedVideo src={url} edit={media.edit} autoPlay className="max-w-full max-h-[80vh] w-full" />
              )
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="overflow-y-auto p-6 space-y-4 bg-surface-sunken">
            {media?.tags && media.tags.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {media.tags.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {media?.notes && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{media.notes}</p>
              </div>
            )}
            {media?.ai_analysis ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">AI analysis</span>
                  </div>
                  {canAiAnalyze && (
                    <Button size="sm" variant="outline" onClick={onAnalyze} disabled={analyzing}>
                      {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Re-analyze
                    </Button>
                  )}
                </div>
                {ratings && <RatingsBlock ratings={ratings} />}
                {sections.length > 0 ? (
                  sections.map((s) => (
                    <div key={s.heading} className="rounded-lg border border-border/50 bg-background/60 p-3">
                      <p className="text-xs font-semibold text-foreground mb-1.5">{s.heading}</p>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {renderWithYouTubeLinks(s.body)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{analysisText}</p>
                )}
              </div>
            ) : (
              canAiAnalyze && media && (
                <Button onClick={onAnalyze} disabled={analyzing} variant="hero" className="w-full">
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Analyze with AI
                </Button>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type AiRatings = {
  skating: number | null;
  shot: number | null;
  hands: number | null;
  iq: number | null;
  compete: number | null;
  physicality: number | null;
  confidence?: "low" | "medium" | "high";
};

function parseRatings(text: string): { ratings: AiRatings | null; text: string } {
  if (!text) return { ratings: null, text };
  const m = text.match(/^<<RATINGS>>(.*?)<<END>>\n?/s);
  if (!m) return { ratings: null, text };
  try {
    const ratings = JSON.parse(m[1]) as AiRatings;
    return { ratings, text: text.slice(m[0].length) };
  } catch {
    return { ratings: null, text };
  }
}

function RatingsBlock({ ratings }: { ratings: AiRatings }) {
  const rows: { key: keyof AiRatings; label: string }[] = [
    { key: "skating", label: "Skating" },
    { key: "shot", label: "Shot" },
    { key: "hands", label: "Hands" },
    { key: "iq", label: "IQ" },
    { key: "compete", label: "Compete" },
    { key: "physicality", label: "Physicality" },
  ];
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground">AI ratings (1–10)</p>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {rows.map(({ key, label }) => {
          const v = ratings[key] as number | null;
          const pct = typeof v === "number" ? Math.max(0, Math.min(100, v * 10)) : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-background/80 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-mono w-8 text-right text-foreground">
                {typeof v === "number" ? v.toFixed(0) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompactRatings({ ratings }: { ratings: AiRatings }) {
  const rows: { key: keyof AiRatings; label: string }[] = [
    { key: "skating", label: "SKT" },
    { key: "shot", label: "SHT" },
    { key: "hands", label: "HND" },
    { key: "iq", label: "IQ" },
    { key: "compete", label: "CMP" },
    { key: "physicality", label: "PHY" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded border border-primary/20 bg-primary/5 p-1.5">
      {rows.map(({ key, label }) => {
        const v = ratings[key] as number | null;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground w-7 shrink-0">{label}</span>
            <div className="flex-1 h-1 rounded-full bg-background/80 overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${typeof v === "number" ? Math.max(0, Math.min(100, v * 10)) : 0}%` }}
              />
            </div>
            <span className="text-[10px] font-mono w-3 text-right text-foreground">
              {typeof v === "number" ? v.toFixed(0) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}


function parseAnalysisSections(text: string): { heading: string; body: string }[] {
  if (!text) return [];
  const known = ["Observations", "Areas to Improve", "Recommended Resources"];
  const lines = text.split("\n");
  const sections: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    const match = known.find((h) => line.toLowerCase() === h.toLowerCase() || line.toLowerCase().startsWith(h.toLowerCase() + ":"));
    if (match) {
      if (current) sections.push(current);
      current = { heading: match, body: [] };
    } else if (current) {
      current.body.push(raw);
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ heading: s.heading, body: s.body.join("\n").trim() })).filter((s) => s.body);
}

function renderWithYouTubeLinks(text: string): React.ReactNode[] {
  // Match: Search: "query"  or  Search: 'query'  or  Search: query (until end of line)
  const regex = /Search:\s*["“']([^"”']+)["”']|Search:\s*([^\n]+)/gi;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    const query = (match[1] ?? match[2] ?? "").trim();
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    nodes.push(
      <a
        key={`yt-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-2 hover:underline font-medium"
      >
        ▶ Watch on YouTube: {query}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : [text];
}
