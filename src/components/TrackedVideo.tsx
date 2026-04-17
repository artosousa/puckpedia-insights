import React, { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { rectAtTime, type MediaEdit } from "@/lib/playerMedia";

interface Props {
  src: string;
  edit?: MediaEdit | null;
  /** Force initial crop state. Otherwise defaults to OFF (full view). */
  applyCrop?: boolean;
  /** Show the in-player tracked-preview toggle. Default true when crop exists. */
  showCropToggle?: boolean;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
}

/**
 * Plays a video with optional trim (clamps currentTime to in/out) and a saved
 * tracking crop. Default playback shows the FULL original video — the toggle
 * lets the viewer preview what the AI is actually seeing (the tracked region).
 */
export function TrackedVideo({
  src,
  edit,
  applyCrop,
  showCropToggle = true,
  className = "",
  controls = true,
  autoPlay = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>("none");
  /** Intrinsic video aspect ratio. Used to size the container so transform coords align. */
  const [videoAspect, setVideoAspect] = useState<number | null>(null);

  const trim = edit?.trim ?? null;
  const track = edit?.track ?? [];
  const hasCrop = track.length > 0;
  const [cropEnabled, setCropEnabled] = useState<boolean>(applyCrop ?? false);

  useEffect(() => {
    if (applyCrop !== undefined) setCropEnabled(applyCrop);
  }, [applyCrop]);

  const cropOn = hasCrop && cropEnabled;

  // Capture video aspect + clamp currentTime to trim window
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      if (v.videoWidth && v.videoHeight) setVideoAspect(v.videoWidth / v.videoHeight);
      if (trim && v.currentTime < trim.in) v.currentTime = trim.in;
    };
    const onTimeUpdate = () => {
      if (!trim) return;
      if (v.currentTime < trim.in) v.currentTime = trim.in;
      if (v.currentTime > trim.out) {
        v.pause();
        v.currentTime = trim.in;
      }
    };
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [trim?.in, trim?.out]);

  // Animate crop transform via rAF when preview is on
  useEffect(() => {
    if (!cropOn) {
      setTransform("none");
      return;
    }
    const v = videoRef.current;
    const c = containerRef.current;
    if (!v || !c) return;
    let raf = 0;
    const tick = () => {
      const rect = rectAtTime(track, v.currentTime);
      if (rect) {
        const w = Math.max(0.05, Math.min(1, rect.w));
        const h = Math.max(0.05, Math.min(1, rect.h));
        const cx = Math.max(0, Math.min(1, rect.cx));
        const cy = Math.max(0, Math.min(1, rect.cy));
        const scale = Math.min(1 / w, 1 / h);
        const tx = (0.5 - cx) * 100;
        const ty = (0.5 - cy) * 100;
        setTransform(`translate(${tx}%, ${ty}%) scale(${scale})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cropOn, JSON.stringify(track)]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-black ${className}`}
      style={cropOn && videoAspect ? { aspectRatio: String(videoAspect) } : undefined}
    >
      <video
        ref={videoRef}
        src={src}
        controls={controls}
        autoPlay={autoPlay}
        className={`w-full h-full origin-center ${cropOn ? "object-cover" : "object-contain"}`}
        style={{ transform, transition: cropOn ? "transform 80ms linear" : "none" }}
      />
      {hasCrop && showCropToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCropEnabled((v) => !v);
          }}
          className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/70 hover:bg-black/85 text-white text-xs font-medium backdrop-blur-sm border border-white/10 shadow-lg transition"
          title={cropEnabled ? "Hide AI tracking preview" : "Show what the AI is tracking"}
        >
          {cropEnabled ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              Hide AI view
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              Show AI view
            </>
          )}
        </button>
      )}
    </div>
  );
}
