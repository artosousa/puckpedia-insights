import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Crop } from "lucide-react";
import { rectAtTime, type MediaEdit } from "@/lib/playerMedia";

interface Props {
  src: string;
  edit?: MediaEdit | null;
  /** Initial crop state. Defaults to true if any keyframes exist. */
  applyCrop?: boolean;
  /** Show the in-player "Full view / Tracked" toggle. Default true when crop exists. */
  showCropToggle?: boolean;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
}

/**
 * Plays a video with optional trim (clamps currentTime to in/out) and a crop
 * window that follows interpolated keyframes. The crop is implemented as a CSS
 * transform on the video element so playback stays smooth and free.
 *
 * A built-in toggle lets the viewer disable the crop temporarily ("reset to
 * original") to see the full ice without losing saved keyframes.
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

  const trim = edit?.trim ?? null;
  const track = edit?.track ?? [];
  const hasCrop = track.length > 0;
  const [cropEnabled, setCropEnabled] = useState<boolean>(applyCrop ?? hasCrop);

  // Keep internal toggle in sync if the prop changes (e.g. after editing keyframes)
  useEffect(() => {
    setCropEnabled(applyCrop ?? hasCrop);
  }, [applyCrop, hasCrop]);

  const cropOn = hasCrop && cropEnabled;

  // Clamp currentTime to trim window
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !trim) return;
    const onLoaded = () => {
      if (v.currentTime < trim.in) v.currentTime = trim.in;
    };
    const onTimeUpdate = () => {
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

  // Animate crop transform via rAF
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
    <div ref={containerRef} className={`relative overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        src={src}
        controls={controls}
        autoPlay={autoPlay}
        className="w-full h-full object-contain origin-center"
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
          title={cropEnabled ? "Show full original video" : "Re-apply tracked crop"}
        >
          {cropEnabled ? (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              Full view
            </>
          ) : (
            <>
              <Crop className="w-3.5 h-3.5" />
              Tracked
            </>
          )}
        </button>
      )}
    </div>
  );
}
