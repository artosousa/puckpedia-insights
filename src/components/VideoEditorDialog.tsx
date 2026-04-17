import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, Plus, Trash2, Crop, Play, Pause, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  getSignedUrl,
  rectAtTime,
  updateMediaEdit,
  type MediaEdit,
  type PlayerMedia,
  type TrackKeyframe,
} from "@/lib/playerMedia";

interface Props {
  media: PlayerMedia | null;
  onClose: () => void;
  onSaved: (edit: MediaEdit) => void;
}

export function VideoEditorDialog({ media, onClose, onSaved }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  /** Intrinsic video aspect ratio (width / height). Drives crop aspect + container aspect. */
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9);

  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState(0);
  const [track, setTrack] = useState<TrackKeyframe[]>([]);
  const [saving, setSaving] = useState(false);

  const [drawingRect, setDrawingRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load signed url + initial state
  useEffect(() => {
    if (!media) return;
    setUrl(null);
    setCurrentTime(0);
    setPlaying(false);
    let cancelled = false;
    getSignedUrl(media.storage_path).then((u) => {
      if (!cancelled) setUrl(u);
    }).catch(() => {});
    const e = (media.edit ?? {}) as MediaEdit;
    const initialDur = media.duration_seconds ?? 0;
    setDuration(initialDur);
    setTrimIn(e.trim?.in ?? 0);
    setTrimOut(e.trim?.out ?? initialDur);
    setTrack(e.track ?? []);
    return () => { cancelled = true; };
  }, [media?.id]);

  const onLoadedMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    const d = isFinite(v.duration) ? v.duration : 0;
    setDuration(d);
    if (v.videoWidth && v.videoHeight) {
      setVideoAspect(v.videoWidth / v.videoHeight);
    }
    const e = (media?.edit ?? {}) as MediaEdit;
    if (!e.trim) {
      setTrimIn(0);
      setTrimOut(d);
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, t));
  };

  const interpolatedRect = useMemo(() => rectAtTime(track, currentTime), [track, currentTime]);

  // ---------- overlay interactions ----------
  const overlayCoords = (e: React.PointerEvent | PointerEvent) => {
    const el = overlayRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };

  const onOverlayPointerDown = (e: React.PointerEvent) => {
    if (!overlayRef.current) return;
    const { x, y } = overlayCoords(e);

    // Check if clicking inside an existing keyframe rect at this exact frame
    const idx = track.findIndex((k) => Math.abs(k.t - currentTime) < 0.05);
    if (idx >= 0) {
      const k = track[idx];
      const left = k.cx - k.w / 2;
      const right = k.cx + k.w / 2;
      const top = k.cy - k.h / 2;
      const bot = k.cy + k.h / 2;
      if (x >= left && x <= right && y >= top && y <= bot) {
        // drag this keyframe
        setDraggingId(idx);
        setDragOffset({ dx: x - k.cx, dy: y - k.cy });
        overlayRef.current.setPointerCapture(e.pointerId);
        return;
      }
    }
    // start drawing a new rect
    setDrawingRect({ x1: x, y1: y, x2: x, y2: y });
    overlayRef.current.setPointerCapture(e.pointerId);
  };

  const onOverlayPointerMove = (e: React.PointerEvent) => {
    if (draggingId !== null) {
      const { x, y } = overlayCoords(e);
      setTrack((prev) => prev.map((k, i) => (i === draggingId ? { ...k, cx: x - dragOffset.dx, cy: y - dragOffset.dy } : k)));
      return;
    }
    if (drawingRect) {
      const { x, y } = overlayCoords(e);
      setDrawingRect({ ...drawingRect, x2: x, y2: y });
    }
  };

  const onOverlayPointerUp = (e: React.PointerEvent) => {
    if (overlayRef.current?.hasPointerCapture(e.pointerId)) {
      overlayRef.current.releasePointerCapture(e.pointerId);
    }
    if (draggingId !== null) {
      setDraggingId(null);
      return;
    }
    if (drawingRect) {
      const rawW = Math.abs(drawingRect.x2 - drawingRect.x1);
      const rawH = Math.abs(drawingRect.y2 - drawingRect.y1);
      if (rawW > 0.03 && rawH > 0.03) {
        const cx = (drawingRect.x1 + drawingRect.x2) / 2;
        const cy = (drawingRect.y1 + drawingRect.y2) / 2;
        // Constrain crop to the video's aspect ratio (overlay is already sized to that aspect).
        // overlay aspect == video aspect, so width/height in normalized coords share the same scale.
        // Pick the smaller dimension as the constraint, then derive the other.
        let w = rawW;
        let h = rawH;
        // crop aspect (in overlay-normalized units) should equal 1 (since overlay matches video aspect)
        if (w > h) h = w;
        else w = h;
        // clamp inside [0,1] given the center
        w = Math.min(w, 2 * cx, 2 * (1 - cx));
        h = Math.min(h, 2 * cy, 2 * (1 - cy));
        // re-square after clamping
        const side = Math.min(w, h);
        addOrReplaceKeyframe({ t: currentTime, cx, cy, w: side, h: side });
      }
      setDrawingRect(null);
    }
  };

  const addOrReplaceKeyframe = (k: TrackKeyframe) => {
    setTrack((prev) => {
      const filtered = prev.filter((p) => Math.abs(p.t - k.t) > 0.05);
      return [...filtered, k].sort((a, b) => a.t - b.t);
    });
  };

  const addKeyframeAtPlayhead = () => {
    const base = interpolatedRect ?? { cx: 0.5, cy: 0.5, w: 0.4, h: 0.4 };
    addOrReplaceKeyframe({ t: currentTime, cx: base.cx, cy: base.cy, w: base.w, h: base.h });
    toast.success(`Keyframe added @ ${currentTime.toFixed(1)}s`);
  };

  const removeKeyframe = (idx: number) => {
    setTrack((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearTrack = () => setTrack([]);

  const onSave = async () => {
    if (!media) return;
    setSaving(true);
    try {
      const edit: MediaEdit = {
        trim: trimIn > 0 || trimOut < duration - 0.01 ? { in: trimIn, out: trimOut } : null,
        track,
      };
      await updateMediaEdit(media.id, edit);
      onSaved(edit);
      toast.success("Clip edits saved");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ---------- render ----------
  if (!media) return null;

  return (
    <Dialog open={!!media} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crop className="w-4 h-4 text-primary" /> Edit clip — trim & track player
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Video + overlay — wrapper matches the video's intrinsic aspect ratio so crop coords align exactly. */}
          <div
            className="relative bg-black rounded-lg overflow-hidden mx-auto w-full"
            style={{ maxHeight: "55vh", aspectRatio: String(videoAspect) }}
          >
            {url ? (
              <video
                ref={videoRef}
                src={url}
                className="absolute inset-0 w-full h-full object-cover block"
                onLoadedMetadata={onLoadedMeta}
                onTimeUpdate={onTimeUpdate}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
            ) : (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Crop overlay */}
            {url && (
              <div
                ref={overlayRef}
                className="absolute inset-0 cursor-crosshair touch-none"
                onPointerDown={onOverlayPointerDown}
                onPointerMove={onOverlayPointerMove}
                onPointerUp={onOverlayPointerUp}
                onPointerCancel={onOverlayPointerUp}
              >
                {/* Interpolated rect (preview) */}
                {interpolatedRect && (
                  <div
                    className="absolute border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                    style={{
                      left: `${(interpolatedRect.cx - interpolatedRect.w / 2) * 100}%`,
                      top: `${(interpolatedRect.cy - interpolatedRect.h / 2) * 100}%`,
                      width: `${interpolatedRect.w * 100}%`,
                      height: `${interpolatedRect.h * 100}%`,
                    }}
                  />
                )}
                {/* Drawing rect */}
                {drawingRect && (
                  <div
                    className="absolute border-2 border-primary bg-primary/10"
                    style={{
                      left: `${Math.min(drawingRect.x1, drawingRect.x2) * 100}%`,
                      top: `${Math.min(drawingRect.y1, drawingRect.y2) * 100}%`,
                      width: `${Math.abs(drawingRect.x2 - drawingRect.x1) * 100}%`,
                      height: `${Math.abs(drawingRect.y2 - drawingRect.y1) * 100}%`,
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Transport */}
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={togglePlay} disabled={!url}>
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <span className="text-xs font-mono text-muted-foreground w-24">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="flex-1 accent-primary"
            />
          </div>

          {/* Trim */}
          <div className="rounded-lg border border-border/50 bg-surface-sunken p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trim</p>
              <span className="text-xs font-mono text-muted-foreground">
                in {trimIn.toFixed(2)}s · out {trimOut.toFixed(2)}s · kept {(trimOut - trimIn).toFixed(2)}s
              </span>
            </div>
            <Slider
              min={0}
              max={duration || 0}
              step={0.05}
              value={[trimIn, trimOut]}
              onValueChange={(v) => {
                const [a, b] = v as number[];
                setTrimIn(Math.min(a, b));
                setTrimOut(Math.max(a, b));
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setTrimIn(currentTime)}>
                Set in @ playhead
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTrimOut(currentTime)}>
                Set out @ playhead
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setTrimIn(0); setTrimOut(duration); }}>
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>
          </div>

          {/* Tracking */}
          <div className="rounded-lg border border-border/50 bg-surface-sunken p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Player tracking</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Drag a box on the video to add a keyframe at the current time. The crop window interpolates between keyframes.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addKeyframeAtPlayhead} disabled={!url}>
                  <Plus className="w-3.5 h-3.5" /> Add keyframe
                </Button>
                {track.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearTrack}>
                    <Trash2 className="w-3.5 h-3.5" /> Clear all
                  </Button>
                )}
              </div>
            </div>
            {track.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No keyframes yet — draw a box on the video to start tracking.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {track.map((k, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs rounded border border-border/50 bg-background/40 px-2 py-1.5"
                  >
                    <button
                      onClick={() => seek(k.t)}
                      className="font-mono text-primary hover:underline w-16 text-left"
                    >
                      {k.t.toFixed(2)}s
                    </button>
                    <span className="text-muted-foreground flex-1">
                      center ({(k.cx * 100).toFixed(0)}%, {(k.cy * 100).toFixed(0)}%) · {(k.w * 100).toFixed(0)}×{(k.h * 100).toFixed(0)}%
                    </span>
                    <button
                      onClick={() => removeKeyframe(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove keyframe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="hero" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save edits
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
